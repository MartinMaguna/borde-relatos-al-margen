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

describe('Sin comentarios', () => {
  test('la API ya no recibe comentarios', async () => {
    const post = await createPost({ title: 'Sin comentarios' });
    assert.equal((await request(app).post(`/api/posts/cuentos/${post.slug}/comments`).send({ name: 'A', text: 'B' })).status, 404);
    assert.equal((await agent.get('/api/admin/comments')).status, 404);
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

  test('al eliminar la convocatoria se borran sus postulaciones', async () => {
    const c = await call();
    await request(app).post(`/api/posts/convocatorias/${c.slug}/applications`).send(application());
    await agent.delete(`/api/admin/posts/${c.id}`);
    const conn = db.models.Post.db;
    assert.equal(await conn.collection('applications').countDocuments(), 0);
  });
});
