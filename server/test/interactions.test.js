import { after, before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createEditor, loginAgent, postData, startTestDb } from './helpers.js';

let db;
let app;
let agent;

before(async () => {
  db = await startTestDb();
});
after(() => db.stop());
beforeEach(async () => {
  await db.reset();
  await createEditor(db.models.User);
  app = db.createApp();
  agent = await loginAgent(app);
});

const createPost = async (data) => (await agent.post('/api/admin/posts').send(postData(data))).body.data;
const call = (data = {}) =>
  createPost({ title: 'Antología', category: 'convocatorias', deadline: '2999-12-31', acceptsApplications: true, ...data });
const application = (data = {}) => ({
  name: 'Ana Pérez',
  email: 'ana@ejemplo.com',
  workTitle: 'Orilla',
  text: 'El agua se fue',
  consent: true,
  ...data,
});

describe('Tiempo de lectura', () => {
  test('se calcula al guardar (≈200 palabras por minuto, mínimo 1)', async () => {
    const short = await createPost({ title: 'Corto', body: 'pocas palabras' });
    const long = await createPost({ title: 'Largo', body: Array(1000).fill('palabra').join(' ') });
    assert.equal(short.readingMinutes, 1);
    assert.equal(long.readingMinutes, 5);
  });
});

describe('Comentarios', () => {
  test('un comentario nuevo queda pendiente y no se ve hasta que se aprueba', async () => {
    const post = await createPost({ title: 'Con comentarios' });
    const sent = await request(app).post(`/api/posts/cuentos/${post.slug}/comments`).send({ name: 'Lu', text: '¡Hermoso!' });
    assert.equal(sent.status, 201);
    assert.equal(sent.body.data.status, 'pending');

    assert.deepEqual((await request(app).get(`/api/posts/cuentos/${post.slug}/comments`)).body.data, []);

    const pending = await agent.get('/api/admin/comments?status=pending');
    assert.equal(pending.body.data.length, 1);
    assert.equal(pending.body.data[0].post.title, 'Con comentarios');

    await agent.patch(`/api/admin/comments/${pending.body.data[0].id}`).send({ status: 'approved' });
    const visible = (await request(app).get(`/api/posts/cuentos/${post.slug}/comments`)).body.data;
    assert.equal(visible.length, 1);
    assert.equal(visible[0].name, 'Lu');
    assert.equal(visible[0].status, undefined, 'el público no ve el estado');
  });

  test('valida los campos y descarta en silencio a los bots (campo trampa)', async () => {
    const post = await createPost({ title: 'X' });
    const bad = await request(app).post(`/api/posts/cuentos/${post.slug}/comments`).send({ name: '', text: '' });
    assert.equal(bad.status, 400);
    assert.deepEqual(bad.body.error.details.map((d) => d.field).sort(), ['name', 'text']);

    const bot = await request(app).post(`/api/posts/cuentos/${post.slug}/comments`).send({ name: 'Bot', text: 'spam', website: 'http://spam' });
    assert.equal(bot.status, 201);
    assert.equal(await db.models.Post.db.collection('comments').countDocuments(), 0);
  });

  test('no se puede comentar un borrador', async () => {
    const draft = await createPost({ title: 'Borrador', status: 'draft' });
    const res = await request(app).post(`/api/posts/cuentos/${draft.slug}/comments`).send({ name: 'A', text: 'B' });
    assert.equal(res.status, 404);
  });

  test('moderar exige sesión', async () => {
    assert.equal((await request(app).get('/api/admin/comments')).status, 401);
  });

  test('limita los envíos por IP', async () => {
    const post = await createPost({ title: 'Límite' });
    for (let i = 0; i < 5; i++) {
      assert.equal((await request(app).post(`/api/posts/cuentos/${post.slug}/comments`).send({ name: 'A', text: `c${i}` })).status, 201);
    }
    const blocked = await request(app).post(`/api/posts/cuentos/${post.slug}/comments`).send({ name: 'A', text: 'otro' });
    assert.equal(blocked.status, 429);
  });
});

describe('Postulaciones', () => {
  test('una convocatoria abierta que acepta postulaciones las recibe; el panel las lista y exporta en CSV', async () => {
    const c = await call();
    const res = await request(app).post(`/api/posts/convocatorias/${c.slug}/applications`).send(application());
    assert.equal(res.status, 201);

    const list = await agent.get(`/api/admin/posts/${c.id}/applications`);
    assert.equal(list.body.data.applications.length, 1);
    assert.equal(list.body.data.applications[0].email, 'ana@ejemplo.com');

    const csv = await agent.get(`/api/admin/posts/${c.id}/applications.csv`);
    assert.equal(csv.status, 200);
    assert.match(csv.headers['content-type'], /text\/csv/);
    assert.match(csv.headers['content-disposition'], /attachment; filename="postulaciones-antologia.csv"/);
    assert.match(csv.text, /"Ana Pérez","ana@ejemplo.com","Orilla"/);
  });

  test('el CSV neutraliza fórmulas (inyección en planillas)', async () => {
    const c = await call();
    await request(app).post(`/api/posts/convocatorias/${c.slug}/applications`).send(application({ workTitle: '=HYPERLINK("http://x")' }));
    const csv = await agent.get(`/api/admin/posts/${c.id}/applications.csv`);
    assert.match(csv.text, /"'=HYPERLINK\(""http:\/\/x""\)"/);
  });

  test('rechaza si la convocatoria no acepta postulaciones o ya cerró', async () => {
    const notAccepting = await call({ title: 'Sin formulario', acceptsApplications: false });
    const closed = await call({ title: 'Cerrada', deadline: '2000-01-01' });
    for (const slug of [notAccepting.slug, closed.slug]) {
      const res = await request(app).post(`/api/posts/convocatorias/${slug}/applications`).send(application());
      assert.equal(res.status, 403);
      assert.equal(res.body.error.code, 'APPLICATIONS_CLOSED');
    }
  });

  test('exige consentimiento, correo válido y el texto o un enlace', async () => {
    const c = await call();
    const res = await request(app)
      .post(`/api/posts/convocatorias/${c.slug}/applications`)
      .send(application({ consent: false, email: 'no-es-correo', text: '' }));
    assert.equal(res.status, 400);
    const fields = res.body.error.details.map((d) => d.field);
    for (const f of ['consent', 'email', 'text']) assert.ok(fields.includes(f), `falta error de ${f}`);
  });

  test('acceptsApplications solo vale en convocatorias', async () => {
    const story = await createPost({ title: 'Cuento', acceptsApplications: true });
    assert.equal(story.acceptsApplications, false);
  });

  test('al eliminar la convocatoria se borran sus postulaciones y comentarios', async () => {
    const c = await call();
    await request(app).post(`/api/posts/convocatorias/${c.slug}/applications`).send(application());
    await request(app).post(`/api/posts/convocatorias/${c.slug}/comments`).send({ name: 'A', text: 'B' });
    await agent.delete(`/api/admin/posts/${c.id}`);
    const conn = db.models.Post.db;
    assert.equal(await conn.collection('applications').countDocuments(), 0);
    assert.equal(await conn.collection('comments').countDocuments(), 0);
  });
});
