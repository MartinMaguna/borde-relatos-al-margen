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

test('la vista previa exige sesión', async () => {
  const res = await request(app).post('/api/admin/preview').send({ markdown: '**hola**' });
  assert.equal(res.status, 401);
});

test('convierte con las mismas reglas que al publicar: formato, encabezados corridos y sanitización', async () => {
  const agent = await loginAgent(app);
  const res = await agent.post('/api/admin/preview').send({
    markdown: '# Sección\n\n## Subtítulo\n\n**negrita**, *cursiva* y ~~tachado~~\n\n> cita\n\n- uno\n- dos\n\n1. a\n2. b\n\n---\n\n[enlace](https://ejemplo.com) <script>alert(1)</script>',
  });
  assert.equal(res.status, 200);
  const { html } = res.body.data;
  assert.match(html, /<h2>Sección<\/h2>/);
  assert.match(html, /<h3>Subtítulo<\/h3>/);
  assert.match(html, /<strong>negrita<\/strong>/);
  assert.match(html, /<em>cursiva<\/em>/);
  assert.match(html, /<del>tachado<\/del>/);
  assert.match(html, /<blockquote>/);
  assert.match(html, /<ul>/);
  assert.match(html, /<ol>/);
  assert.match(html, /<hr \/>/);
  assert.match(html, /<a href="https:\/\/ejemplo.com">enlace<\/a>/);
  assert.doesNotMatch(html, /<script/);
});
