import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createEditor, loginAgent, postData, startTestDb } from './helpers.js';

let db;
let app;
let agent;

// PNG mínimo válido (1x1 px).
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

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

const uploadPng = (name = 'foto.png') => agent.post('/api/admin/images').attach('imagen', PNG, name);

test('subir una imagen exige sesión', async () => {
  const res = await request(app).post('/api/admin/images').attach('imagen', PNG, 'foto.png');
  assert.equal(res.status, 401);
});

test('sube una imagen y se puede ver públicamente, con caché larga', async () => {
  const up = await uploadPng();
  assert.equal(up.status, 201);
  assert.match(up.body.data.url, /^\/api\/images\/[a-f\d]{24}$/);
  assert.equal(up.body.data.contentType, 'image/png');

  const img = await request(app).get(up.body.data.url);
  assert.equal(img.status, 200);
  assert.equal(img.headers['content-type'], 'image/png');
  assert.match(img.headers['cache-control'], /immutable/);
  assert.deepEqual(Buffer.from(img.body), PNG);
});

test('el tipo se detecta por el contenido: un texto renombrado a .png se rechaza', async () => {
  const res = await agent.post('/api/admin/images').attach('imagen', Buffer.from('<svg onload="alert(1)">hola</svg>'), 'falsa.png');
  assert.equal(res.status, 400);
  assert.equal(res.body.error.details[0].field, 'imagen');
});

test('rechaza archivos de más de 3 MB', async () => {
  const big = Buffer.concat([PNG, Buffer.alloc(3 * 1024 * 1024)]);
  const res = await agent.post('/api/admin/images').attach('imagen', big, 'grande.png');
  assert.equal(res.status, 413);
  assert.equal(res.body.error.code, 'IMAGE_TOO_LARGE');
});

test('sin archivo → error de validación en el campo "imagen"', async () => {
  const res = await agent.post('/api/admin/images');
  assert.equal(res.status, 400);
  assert.equal(res.body.error.details[0].field, 'imagen');
});

test('una publicación acepta la URL de una imagen subida', async () => {
  const { body } = await uploadPng();
  const res = await agent
    .post('/api/admin/posts')
    .send(postData({ image: { url: body.data.url, alt: 'Una mesa con libros abiertos' } }));
  assert.equal(res.status, 201);
  assert.equal(res.body.data.image.url, body.data.url);
});

test('rechaza rutas internas que no son de imágenes', async () => {
  const res = await agent.post('/api/admin/posts').send(postData({ image: { url: '/api/admin/posts', alt: 'x' } }));
  assert.equal(res.status, 400);
});

test('al cambiar la imagen o eliminar la publicación, la imagen subida que ya no se usa se borra', async () => {
  const first = (await uploadPng()).body.data.url;
  const second = (await uploadPng()).body.data.url;
  const created = await agent.post('/api/admin/posts').send(postData({ image: { url: first, alt: 'Primera' } }));
  const id = created.body.data.id;

  await agent.put(`/api/admin/posts/${id}`).send(postData({ image: { url: second, alt: 'Segunda' } }));
  assert.equal((await request(app).get(first)).status, 404, 'la anterior se borró');
  assert.equal((await request(app).get(second)).status, 200);

  await agent.delete(`/api/admin/posts/${id}`);
  assert.equal((await request(app).get(second)).status, 404, 'se borró con la publicación');
});

test('una imagen usada por otra publicación no se borra', async () => {
  const url = (await uploadPng()).body.data.url;
  const a = await agent.post('/api/admin/posts').send(postData({ title: 'A', image: { url, alt: 'Compartida' } }));
  await agent.post('/api/admin/posts').send(postData({ title: 'B', image: { url, alt: 'Compartida' } }));

  await agent.delete(`/api/admin/posts/${a.body.data.id}`);
  assert.equal((await request(app).get(url)).status, 200);
});
