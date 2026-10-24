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

describe('Capítulos (cuentos)', () => {
  test('un cuento puede tener capítulos: se guardan, se renderizan y suman al tiempo de lectura', async () => {
    const words = Array(400).fill('palabra').join(' ');
    const story = await createPost({
      title: 'Novela corta',
      body: '',
      chapters: [
        { title: 'Uno', body: `**Empieza** ${words}` },
        { title: 'Dos', body: words },
      ],
    });
    assert.equal(story.chapters.length, 2);
    assert.match(story.chapters[0].bodyHtml, /<strong>Empieza<\/strong>/);
    assert.equal(story.readingMinutes, 4);

    const pub = (await request(app).get(`/api/posts/cuentos/${story.slug}`)).body.data;
    assert.deepEqual(pub.chapters.map((c) => c.title), ['Uno', 'Dos']);
    assert.equal(pub.chapters[0].body, undefined, 'el público recibe solo el HTML');
    const list = (await request(app).get('/api/posts?category=cuentos')).body.data;
    assert.equal(list[0].chapters, undefined, 'los listados no cargan capítulos');
  });

  test('sin texto ni capítulos, el texto es obligatorio; cada capítulo exige título y texto', async () => {
    const res = await agent.post('/api/admin/posts').send(postData({ body: '', chapters: [{ title: '', body: '' }] }));
    assert.equal(res.status, 400);
    assert.deepEqual(res.body.error.details.map((d) => d.field).sort(), ['chapters.0.body', 'chapters.0.title']);
    const empty = await agent.post('/api/admin/posts').send(postData({ body: '' }));
    assert.deepEqual(empty.body.error.details.map((d) => d.field), ['body']);
  });

  test('solo los cuentos guardan capítulos', async () => {
    const poem = await createPost({ title: 'Poema', category: 'poesia', chapters: [{ title: 'X', body: 'Y' }] });
    assert.deepEqual(poem.chapters, []);
  });
});

describe('Fecha de apertura (convocatorias)', () => {
  test('antes de la apertura está "proxima" y no recibe postulaciones', async () => {
    const c = await call({ opensAt: '2999-01-01' });
    assert.equal(c.callStatus, 'proxima');
    assert.match(c.opensAt, /^2999-01-01T03:00:00/);
    const res = await request(app).post(`/api/posts/convocatorias/${c.slug}/applications`).send(application());
    assert.equal(res.status, 403);
    assert.match(res.body.error.message, /todavía no abrió/);
  });

  test('con la apertura pasada está abierta', async () => {
    const c = await call({ opensAt: '2020-01-01' });
    assert.equal(c.callStatus, 'abierta');
  });

  test('la apertura no puede ser posterior a la fecha límite', async () => {
    const res = await agent.post('/api/admin/posts').send(postData({ title: 'C', category: 'convocatorias', opensAt: '2999-12-31', deadline: '2999-01-01' }));
    assert.equal(res.status, 400);
    assert.deepEqual(res.body.error.details.map((d) => d.field), ['opensAt']);
  });
});

describe('Formulario de postulación configurable', () => {
  const form = {
    intro: 'Mandá un solo cuento.',
    fields: { workTitle: 'off', text: 'required', link: 'off', message: 'optional' },
    questions: [
      { key: 'barrio', label: '¿De qué barrio sos?', type: 'short', required: true },
      { key: 'bio', label: 'Contanos de vos', type: 'long', required: false },
    ],
  };

  test('se guarda con la convocatoria y se publica', async () => {
    const c = await call({ applicationForm: form });
    assert.equal(c.applicationForm.intro, 'Mandá un solo cuento.');
    assert.equal(c.applicationForm.fields.workTitle, 'off');
    const pub = (await request(app).get(`/api/posts/convocatorias/${c.slug}`)).body.data;
    assert.deepEqual(pub.applicationForm.questions.map((q) => q.key), ['barrio', 'bio']);
  });

  test('valida según la configuración: campos obligatorios, no pedidos y preguntas propias', async () => {
    const c = await call({ applicationForm: form });
    const bad = await request(app).post(`/api/posts/convocatorias/${c.slug}/applications`).send({ name: 'Ana', email: 'ana@ejemplo.com', consent: true });
    assert.equal(bad.status, 400);
    assert.deepEqual(bad.body.error.details.map((d) => d.field).sort(), ['answers.barrio', 'text']);

    const ok = await request(app)
      .post(`/api/posts/convocatorias/${c.slug}/applications`)
      .send({ name: 'Ana', email: 'ana@ejemplo.com', consent: true, text: 'Mi cuento', workTitle: 'ignorado', answers: { barrio: 'Cordón' } });
    assert.equal(ok.status, 201);

    const { applications } = (await agent.get(`/api/admin/posts/${c.id}/applications`)).body.data;
    assert.equal(applications[0].workTitle, '', 'un campo no pedido no se guarda');
    assert.deepEqual(applications[0].answers, [
      { key: 'barrio', label: '¿De qué barrio sos?', answer: 'Cordón' },
      { key: 'bio', label: 'Contanos de vos', answer: '' },
    ]);

    const csv = await agent.get(`/api/admin/posts/${c.id}/applications.csv`);
    const [header, row] = csv.text.slice(1).split('\r\n');
    assert.match(header, /"¿De qué barrio sos\?","Contanos de vos"$/);
    assert.match(row, /"Cordón",""$/);
  });

  test('preguntas sin texto o repetidas no se aceptan', async () => {
    const res = await agent.post('/api/admin/posts').send(
      postData({ title: 'C', category: 'convocatorias', deadline: '2999-01-01', applicationForm: { questions: [{ key: 'a', label: '' }, { key: 'a', label: 'X' }] } }),
    );
    assert.equal(res.status, 400);
    const fields = res.body.error.details.map((d) => d.field);
    assert.ok(fields.includes('applicationForm.questions.0.label'));
    assert.ok(fields.includes('applicationForm.questions'));
  });
});
