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
/** Postulación válida para el formulario modelo de Borde; `answers` reemplaza respuestas puntuales. */
const application = (answers = {}, extra = {}) => ({
  answers: {
    name: 'Ana Pérez',
    contact: 'ana@ejemplo.com',
    edad: '27',
    departamento: 'Montevideo',
    workTitle: 'Orilla',
    formato: 'Texto escrito',
    idioma: 'Español',
    obra: 'https://drive.google.com/file/d/abc',
    ...answers,
  },
  consent: true,
  ...extra,
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
    const [saved] = list.body.data.applications;
    assert.equal(saved.contact, 'ana@ejemplo.com');
    assert.equal(saved.workTitle, 'Orilla');
    assert.equal(saved.answers.find((a) => a.key === 'departamento').answer, 'Montevideo');

    const csv = await agent.get(`/api/admin/posts/${c.id}/applications.csv`);
    assert.equal(csv.status, 200);
    assert.match(csv.headers['content-type'], /text\/csv/);
    assert.match(csv.headers['content-disposition'], /attachment; filename="postulaciones-antologia.csv"/);
    assert.match(csv.text, /"Fecha","Nombre","Contacto","Nombre artístico o seudónimo","Edad","Departamento de residencia"/);
    assert.match(csv.text, /"Ana Pérez","ana@ejemplo.com","","27","Montevideo"/);
  });

  test('el CSV neutraliza fórmulas (inyección en planillas)', async () => {
    const c = await call();
    await request(app).post(`/api/posts/convocatorias/${c.slug}/applications`).send(application({ seudonimo: '=HYPERLINK("http://x")' }));
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

  test('con el formulario modelo valida obligatorios, número, opciones y enlace, todo junto', async () => {
    const c = await call();
    const res = await request(app)
      .post(`/api/posts/convocatorias/${c.slug}/applications`)
      .send(application({ name: '', edad: 'veinte', departamento: 'Narnia', formato: '', obra: 'no-es-enlace' }, { consent: false }));
    assert.equal(res.status, 400);
    assert.deepEqual(res.body.error.details.map((d) => d.field).sort(), [
      'answers.departamento',
      'answers.edad',
      'answers.formato',
      'answers.name',
      'answers.obra',
      'consent',
    ]);
    const optional = await request(app).post(`/api/posts/convocatorias/${c.slug}/applications`).send(application({ seudonimo: '', apoyos: '' }));
    assert.equal(optional.status, 201, 'las opcionales pueden quedar vacías');
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
    consentText: 'Confirmo que el cuento es inédito.',
    items: [
      { key: 'name', type: 'short', label: 'Tu nombre', required: true },
      { key: 's-1', type: 'section', label: 'Contacto' },
      { key: 'contact', type: 'email', label: 'Correo', required: true },
      { key: 'barrio', type: 'select', label: 'Barrio', required: true, options: ['Cordón', 'Centro'] },
      { key: 'bio', type: 'long', label: 'Contanos de vos' },
    ],
  };

  test('se guarda con la convocatoria y se publica', async () => {
    const c = await call({ applicationForm: form });
    const pub = (await request(app).get(`/api/posts/convocatorias/${c.slug}`)).body.data;
    assert.equal(pub.applicationForm.intro, 'Mandá un solo cuento.');
    assert.deepEqual(pub.applicationForm.items.map((i) => i.key), ['name', 's-1', 'contact', 'barrio', 'bio']);
  });

  test('valida según la configuración y guarda las respuestas con su pregunta; el CSV tiene una columna por pregunta', async () => {
    const c = await call({ applicationForm: form });
    const bad = await request(app)
      .post(`/api/posts/convocatorias/${c.slug}/applications`)
      .send({ answers: { name: 'Ana', contact: 'no-es-correo', barrio: 'Otro' }, consent: true });
    assert.deepEqual(bad.body.error.details.map((d) => d.field).sort(), ['answers.barrio', 'answers.contact']);

    const okRes = await request(app)
      .post(`/api/posts/convocatorias/${c.slug}/applications`)
      .send({ answers: { name: 'Ana', contact: 'ana@ejemplo.com', barrio: 'Cordón', ignorada: 'x' }, consent: true });
    assert.equal(okRes.status, 201);
    const [saved] = (await agent.get(`/api/admin/posts/${c.id}/applications`)).body.data.applications;
    assert.equal(saved.name, 'Ana');
    assert.equal(saved.contact, 'ana@ejemplo.com');
    assert.deepEqual(saved.answers, [
      { key: 'barrio', label: 'Barrio', answer: 'Cordón' },
      { key: 'bio', label: 'Contanos de vos', answer: '' },
    ]);

    const csv = await agent.get(`/api/admin/posts/${c.id}/applications.csv`);
    const [header, row] = csv.text.slice(1).split('\r\n');
    assert.equal(header, '"Fecha","Nombre","Contacto","Barrio","Contanos de vos"');
    assert.match(row, /"Ana","ana@ejemplo.com","Cordón",""$/);
  });

  test('no se puede guardar sin nombre o contacto, con elementos repetidos ni listas sin opciones', async () => {
    const res = await agent.post('/api/admin/posts').send(
      postData({
        title: 'C',
        category: 'convocatorias',
        deadline: '2999-01-01',
        applicationForm: {
          items: [
            { key: 'name', type: 'short', label: 'Nombre' },
            { key: 'x', type: 'choice', label: 'X', options: ['Una'] },
            { key: 'x', type: 'short', label: 'Y' },
          ],
        },
      }),
    );
    assert.equal(res.status, 400);
    const fields = res.body.error.details.map((d) => d.field);
    assert.ok(fields.includes('applicationForm.items.1.options'));
    assert.ok(fields.includes('applicationForm.items'));
  });

  test('una configuración del formato anterior se sigue entendiendo', async () => {
    const c = await call();
    await db.models.Post.updateOne(
      { _id: c.id },
      { applicationForm: { fields: { workTitle: 'required', text: 'required', link: 'off', message: 'off' }, questions: [] } },
    );
    const res = await request(app)
      .post(`/api/posts/convocatorias/${c.slug}/applications`)
      .send({ answers: { name: 'Ana', contact: 'ana@ejemplo.com', workTitle: 'Orilla', text: 'El agua' }, consent: true });
    assert.equal(res.status, 201);
  });
});
