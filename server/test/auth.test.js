import { after, before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { EDITOR, createEditor, loginAgent, startTestDb } from './helpers.js';

let db;
let app;

before(async () => {
  db = await startTestDb();
});
after(() => db.stop());
beforeEach(async () => {
  await db.reset();
  await createEditor(db.models.User);
  app = db.createApp(); // app nueva = rate limiter limpio
});

describe('POST /api/auth/login', () => {
  test('con credenciales correctas setea una cookie httpOnly y SameSite=Strict', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: EDITOR.email, password: EDITOR.password });

    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.data.user.email, EDITOR.email);
    assert.equal(res.body.data.user.passwordHash, undefined, 'nunca se expone el hash');

    const cookie = res.headers['set-cookie'].join(';');
    assert.match(cookie, /borde_session=/);
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /SameSite=Strict/i);
  });

  test('acepta el email con mayúsculas y espacios', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: `  ${EDITOR.email.toUpperCase()} `, password: EDITOR.password });
    assert.equal(res.status, 200);
  });

  test('contraseña incorrecta y email inexistente devuelven el mismo mensaje genérico', async () => {
    const wrongPass = await request(app).post('/api/auth/login').send({ email: EDITOR.email, password: 'otra-cosa' });
    const noUser = await request(app).post('/api/auth/login').send({ email: 'nadie@test.local', password: 'otra-cosa' });

    assert.equal(wrongPass.status, 401);
    assert.equal(noUser.status, 401);
    assert.equal(wrongPass.body.error.message, noUser.body.error.message);
    assert.equal(wrongPass.headers['set-cookie'], undefined);
  });

  test('valida el body y devuelve errores por campo', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'no-es-email' });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    const fields = res.body.error.details.map((d) => d.field).sort();
    assert.deepEqual(fields, ['email', 'password']);
  });

  test('JSON mal formado devuelve 400, no 500', async () => {
    const res = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{"email":');
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'INVALID_JSON');
  });

  test('limita los intentos por IP (rate limiting)', async () => {
    const attempt = () => request(app).post('/api/auth/login').send({ email: EDITOR.email, password: 'mal' });
    for (let i = 0; i < 5; i++) assert.equal((await attempt()).status, 401);

    const blocked = await attempt();
    assert.equal(blocked.status, 429);
    assert.equal(blocked.body.error.code, 'RATE_LIMITED');
  });
});

describe('Sesión', () => {
  test('GET /me sin cookie → 401', async () => {
    const res = await request(app).get('/api/auth/me');
    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'UNAUTHENTICATED');
  });

  test('GET /me con sesión devuelve el usuario', async () => {
    const agent = await loginAgent(app);
    const res = await agent.get('/api/auth/me');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.user.role, 'editor');
  });

  test('un token adulterado se rechaza', async () => {
    const res = await request(app).get('/api/auth/me').set('Cookie', 'borde_session=eyJhbGciOiJIUzI1NiJ9.e30.firma-falsa');
    assert.equal(res.status, 401);
  });

  test('logout borra la cookie y la sesión deja de valer', async () => {
    const agent = await loginAgent(app);
    const out = await agent.post('/api/auth/logout');
    assert.equal(out.status, 200);
    assert.equal((await agent.get('/api/auth/me')).status, 401);
  });

  test('si el usuario se elimina, su sesión deja de valer', async () => {
    const agent = await loginAgent(app);
    await db.models.User.deleteMany({});
    assert.equal((await agent.get('/api/auth/me')).status, 401);
  });

  test('las rutas /api/admin exigen sesión', async () => {
    for (const [method, url] of [
      ['get', '/api/admin/posts'],
      ['post', '/api/admin/posts'],
      ['put', '/api/admin/pages/acerca'],
    ]) {
      const res = await request(app)[method](url).send({});
      assert.equal(res.status, 401, `${method.toUpperCase()} ${url}`);
    }
  });
});
