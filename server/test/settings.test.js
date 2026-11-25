import { after, before, beforeEach, test } from 'node:test';
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

test('el mensaje de Convocatorias vacías se edita desde el panel y vuelve al de siempre si queda vacío', async () => {
  const initial = (await request(app).get('/api/settings')).body.data;
  assert.equal(initial.convocatoriasEmpty, 'En este momento no hay convocatorias abiertas.');

  assert.equal((await request(app).put('/api/admin/settings').send({ convocatoriasEmpty: 'X' })).status, 401);
  const saved = await agent.put('/api/admin/settings').send({ convocatoriasEmpty: 'Pronto abrimos la próxima convocatoria.' });
  assert.equal(saved.status, 200);
  assert.equal((await request(app).get('/api/settings')).body.data.convocatoriasEmpty, 'Pronto abrimos la próxima convocatoria.');
  assert.equal((await agent.get('/api/admin/settings')).body.data.convocatoriasEmpty, 'Pronto abrimos la próxima convocatoria.');

  await agent.put('/api/admin/settings').send({ convocatoriasEmpty: '' });
  assert.equal((await request(app).get('/api/settings')).body.data.convocatoriasEmpty, 'En este momento no hay convocatorias abiertas.');
});

test('los talleres tienen un bloque de información destacada (en el detalle, no en los listados); otras categorías no', async () => {
  const create = async (data) => (await agent.post('/api/admin/posts').send(postData(data))).body.data;
  const workshop = await create({ title: 'Taller', category: 'talleres', highlight: 'Se desarrolla **entre marzo y junio**.' });
  const pub = (await request(app).get(`/api/posts/talleres/${workshop.slug}`)).body.data;
  assert.equal(pub.highlightHtml, '<p>Se desarrolla <strong>entre marzo y junio</strong>.</p>');
  assert.equal(pub.highlight, undefined, 'el público recibe solo el HTML');
  const list = (await request(app).get('/api/posts?category=talleres')).body.data;
  assert.equal(list[0].highlightHtml, undefined);

  const story = await create({ title: 'Cuento', category: 'cuentos', highlight: 'No va' });
  assert.equal(story.highlight, '');
  assert.equal(story.highlightHtml, '');
});
