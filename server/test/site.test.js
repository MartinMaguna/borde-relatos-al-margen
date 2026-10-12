import { after, afterEach, before, beforeEach, describe, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
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

const messages = () => mongoose.connection.collection('contactmessages');

describe('Contacto', () => {
  let sent;
  let resendStatus;
  beforeEach(() => {
    sent = [];
    resendStatus = 200;
    // Reemplaza solo las llamadas a Resend; supertest no usa fetch.
    mock.method(globalThis, 'fetch', async (url, options) => {
      sent.push({ url, options, body: JSON.parse(options.body) });
      return new Response('{}', { status: resendStatus });
    });
  });
  afterEach(() => mock.restoreAll());

  const valid = { name: 'Ana Pérez', email: 'Ana@Ejemplo.com', message: 'Hola, quiero sumarme a un taller.' };

  test('reenvía el mensaje al correo del equipo, con "responder" a quien escribió, y lo guarda', async () => {
    const res = await request(app).post('/api/contact').send(valid);
    assert.equal(res.status, 201);
    assert.deepEqual(res.body.data, { received: true });

    assert.equal(sent.length, 1);
    assert.equal(sent[0].url, 'https://api.resend.com/emails');
    assert.equal(sent[0].options.headers.Authorization, 'Bearer re_test');
    assert.deepEqual(sent[0].body.to, ['equipo@test.local']);
    assert.equal(sent[0].body.reply_to, 'ana@ejemplo.com');
    assert.match(sent[0].body.subject, /Ana Pérez/);
    assert.match(sent[0].body.text, /quiero sumarme a un taller/);
    assert.equal(sent[0].body.html, undefined, 'solo texto plano');

    const [saved] = await messages().find().toArray();
    assert.equal(saved.email, 'ana@ejemplo.com');
    assert.equal(saved.emailStatus, 'sent');
  });

  test('si el correo falla, el mensaje igual queda guardado para leerlo en el panel', async () => {
    resendStatus = 500;
    const log = console.error;
    console.error = () => {};
    const res = await request(app).post('/api/contact').send(valid);
    console.error = log;
    assert.equal(res.status, 201);

    const list = await agent.get('/api/admin/messages');
    assert.equal(list.status, 200);
    assert.equal(list.body.data.length, 1);
    assert.equal(list.body.data[0].emailStatus, 'failed');
    assert.equal(list.body.meta.total, 1);
  });

  test('valida todos los campos a la vez', async () => {
    const res = await request(app).post('/api/contact').send({ name: '', email: 'no-es-correo', message: '' });
    assert.equal(res.status, 400);
    assert.deepEqual(res.body.error.details.map((d) => d.field).sort(), ['email', 'message', 'name']);
    assert.equal(sent.length, 0);
  });

  test('descarta en silencio a los bots (campo trampa)', async () => {
    const res = await request(app).post('/api/contact').send({ ...valid, website: 'http://spam' });
    assert.equal(res.status, 201);
    assert.equal(sent.length, 0);
    assert.equal(await messages().countDocuments(), 0);
  });

  test('leer y borrar mensajes exige sesión', async () => {
    assert.equal((await request(app).get('/api/admin/messages')).status, 401);
    await request(app).post('/api/contact').send(valid);
    const [msg] = (await agent.get('/api/admin/messages')).body.data;
    assert.equal((await request(app).delete(`/api/admin/messages/${msg.id}`)).status, 401);
    assert.equal((await agent.delete(`/api/admin/messages/${msg.id}`)).status, 200);
    assert.equal(await messages().countDocuments(), 0);
  });
});

describe('Logos de quienes acompañan', () => {
  const uploadLogo = async () => (await agent.post('/api/admin/images').attach('imagen', PNG, 'logo.png')).body.data.url;

  test('se cargan desde el panel y se listan públicamente, agrupados en orden', async () => {
    const logo = await uploadLogo();
    await agent.post('/api/admin/supporters').send({ name: 'Biblioteca Popular', role: 'colaboran', logoUrl: logo }).expect(201);
    await agent.post('/api/admin/supporters').send({ name: 'Municipio', role: 'impulsan', logoUrl: logo, link: 'https://municipio.example' }).expect(201);

    const res = await request(app).get('/api/supporters');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.data.map((s) => [s.role, s.name]), [
      ['impulsan', 'Municipio'],
      ['colaboran', 'Biblioteca Popular'],
    ]);
    assert.equal(res.body.data[0].link, 'https://municipio.example');
    assert.equal(res.body.data[1].link, null);
  });

  test('valida nombre, rol y logo', async () => {
    const res = await agent.post('/api/admin/supporters').send({ name: '', role: 'otro', logoUrl: '', link: 'ftp://x' });
    assert.equal(res.status, 400);
    assert.deepEqual(res.body.error.details.map((d) => d.field).sort(), ['link', 'logoUrl', 'name', 'role']);
  });

  test('cargar, editar y borrar exige sesión', async () => {
    assert.equal((await request(app).post('/api/admin/supporters').send({})).status, 401);
    assert.equal((await request(app).get('/api/admin/supporters')).status, 401);
  });

  test('al cambiar o borrar un logo se borra la imagen subida, salvo que otra publicación la use', async () => {
    const images = () => mongoose.connection.collection('images');
    const first = await uploadLogo();
    const second = await uploadLogo();
    const created = (await agent.post('/api/admin/supporters').send({ name: 'A', role: 'apoyan', logoUrl: first })).body.data;

    await agent.put(`/api/admin/supporters/${created.id}`).send({ name: 'A', role: 'organizan', logoUrl: second }).expect(200);
    assert.equal(await images().countDocuments(), 1, 'se borró el logo anterior');

    // Una publicación usa la misma imagen: no se borra al eliminar el logo.
    await agent.post('/api/admin/posts').send(postData({ image: { url: second, alt: 'Logo' } })).expect(201);
    await agent.delete(`/api/admin/supporters/${created.id}`).expect(200);
    assert.equal(await images().countDocuments(), 1);
    assert.deepEqual((await request(app).get('/api/supporters')).body.data, []);
  });
});
