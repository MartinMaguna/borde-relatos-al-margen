import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import request from 'supertest';
import mongoose from 'mongoose';
import { createEditor, startTestDb } from './helpers.js';

let db;

before(async () => {
  db = await startTestDb();
});
after(() => db.stop());
beforeEach(() => db.reset());

test('restoreOriginalUrl rearma la URL que reescribe vercel.json', async () => {
  const { restoreOriginalUrl } = await import('../src/serverless.js');
  const req = (url) => {
    const r = { url };
    restoreOriginalUrl(r);
    return r.url;
  };
  assert.equal(req('/api?__ruta=posts/latest&perCategory=3'), '/api/posts/latest?perCategory=3');
  assert.equal(req('/api?perCategory=3&__ruta=posts%2Flatest&path=posts%2Flatest'), '/api/posts/latest?perCategory=3');
  assert.equal(req('/api?__ruta=images%2Fabc'), '/api/images/abc');
  assert.equal(req('/api/health'), '/api/health', 'sin __ruta no se toca');
});

test('la función de Vercel atiende la API completa (salud, datos iniciales y rutas)', async () => {
  const { default: handler } = await import('../src/serverless.js');
  const server = http.createServer(handler);
  const health = await request(server).get('/api?__ruta=health');
  assert.equal(health.status, 200);
  assert.equal(health.body.data.db, 'conectado');
  // ensureInitialData corrió en la primera petición: existe la página Acerca.
  const about = await request(server).get('/api?__ruta=pages/acerca');
  assert.equal(about.status, 200);
  const missing = await request(server).get('/api?__ruta=no-existe');
  assert.equal(missing.status, 404);
});

test('en Vercel, el límite de intentos de login se comparte entre instancias (MongoDB)', async () => {
  process.env.VERCEL = '1';
  try {
    await createEditor(db.models.User);
    // Dos "instancias" distintas de la función: cada una con su propia app.
    const a = db.createApp();
    const b = db.createApp();
    const wrong = { email: 'editora@test.local', password: 'incorrecta-123456' };
    for (let i = 0; i < 5; i++) {
      const res = await request(i % 2 ? a : b).post('/api/auth/login').send(wrong);
      assert.equal(res.status, 401);
    }
    const blocked = await request(a).post('/api/auth/login').send(wrong);
    assert.equal(blocked.status, 429);
    const saved = await mongoose.connection.collection('ratelimits').findOne({});
    assert.ok(saved.expiresAt > new Date(), 'la ventana vence sola (índice TTL)');
  } finally {
    delete process.env.VERCEL;
  }
});
