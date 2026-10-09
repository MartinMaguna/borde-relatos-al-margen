import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createEditor, loginAgent, startTestDb } from './helpers.js';

let db;
let app;

before(async () => {
  db = await startTestDb();
});
after(() => db.stop());
beforeEach(async () => {
  await db.reset();
  await createEditor(db.models.User);
  app = db.createApp();
});

test('Acerca: 404 público mientras no exista', async () => {
  const res = await request(app).get('/api/pages/acerca');
  assert.equal(res.status, 404);
});

test('Acerca: el editor la crea/edita y el público ve el HTML', async () => {
  const agent = await loginAgent(app);

  const empty = await agent.get('/api/admin/pages/acerca');
  assert.equal(empty.body.data.title, '', 'si no existe, el formulario arranca vacío');

  const saved = await agent.put('/api/admin/pages/acerca').send({ title: 'Acerca de Borde', body: 'Somos **Borde**.' });
  assert.equal(saved.status, 200);

  const again = await agent.put('/api/admin/pages/acerca').send({ title: 'Acerca de Borde', body: 'Somos **Borde**, otra vez.' });
  assert.equal(again.body.data.id, saved.body.data.id, 'actualiza, no duplica');

  const pub = await request(app).get('/api/pages/acerca');
  assert.equal(pub.status, 200);
  assert.equal(pub.body.data.bodyHtml, '<p>Somos <strong>Borde</strong>, otra vez.</p>');
  assert.equal(pub.body.data.body, undefined);
});

test('Solo existen las páginas permitidas', async () => {
  const agent = await loginAgent(app);
  const res = await agent.put('/api/admin/pages/inventada').send({ title: 'X' });
  assert.equal(res.status, 400);
});
