import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { EDITOR, createEditor, startTestDb } from './helpers.js';

let db;
let ensureInitialData;
const silent = { info() {}, warn() {} };
const SEED = { SEED_EDITOR_NAME: 'Primera Editora', SEED_EDITOR_EMAIL: 'Primera@Borde.test', SEED_EDITOR_PASSWORD: 'una-clave-bien-larga' };

before(async () => {
  db = await startTestDb();
  ({ ensureInitialData } = await import('../src/bootstrap.js'));
});
after(() => db.stop());
beforeEach(() => db.reset());

test('base vacía + variables SEED_*: crea el primer editor (que puede ingresar) y la página Acerca', async () => {
  await ensureInitialData({ env: SEED, log: silent });

  const users = await db.models.User.find();
  assert.equal(users.length, 1);
  assert.equal(users[0].email, 'primera@borde.test');

  const res = await request(db.createApp())
    .post('/api/auth/login')
    .send({ email: SEED.SEED_EDITOR_EMAIL, password: SEED.SEED_EDITOR_PASSWORD });
  assert.equal(res.status, 200);

  const page = await db.models.Page.findOne({ slug: 'acerca' });
  assert.equal(page.title, 'Acerca de Relatos al margen');
  assert.match(page.bodyHtml, /<p>/);
});

test('si ya hay un usuario, no crea otro ni cambia su contraseña', async () => {
  await createEditor(db.models.User);
  await ensureInitialData({ env: SEED, log: silent });

  const users = await db.models.User.find();
  assert.equal(users.length, 1);
  assert.equal(users[0].email, EDITOR.email);
});

test('sin variables SEED_* no crea usuario, avisa, y crea igual la página Acerca', async () => {
  const warnings = [];
  await ensureInitialData({ env: {}, log: { info() {}, warn: (m) => warnings.push(m) } });

  assert.equal(await db.models.User.countDocuments(), 0);
  assert.match(warnings[0], /No hay ningún usuario editor/);
  assert.ok(await db.models.Page.exists({ slug: 'acerca' }));
});

test('contraseña de menos de 12 caracteres: no crea el usuario', async () => {
  await ensureInitialData({ env: { ...SEED, SEED_EDITOR_PASSWORD: 'corta' }, log: silent });
  assert.equal(await db.models.User.countDocuments(), 0);
});

test('no pisa una página Acerca ya editada', async () => {
  await db.models.Page.create({ slug: 'acerca', title: 'Mi texto', body: 'Editado' });
  await ensureInitialData({ env: {}, log: silent });
  assert.equal((await db.models.Page.findOne({ slug: 'acerca' })).title, 'Mi texto');
});

test('rerenderMarkdownOnce regenera el HTML de los textos una sola vez, sin cambiar lo escrito', async () => {
  const { rerenderMarkdownOnce } = await import('../src/migrations/rerenderMarkdown.js');
  const { Post } = db.models;
  const post = await Post.create({ title: 'Poema', category: 'poesia', slug: 'poema', author: 'A', body: 'uno\n\n\n\ndos', status: 'published' });
  await Post.updateOne({ _id: post.id }, { bodyHtml: '<p>viejo</p>' });
  const log = { info: () => {} };
  const first = await rerenderMarkdownOnce({ log });
  assert.ok(first.changed >= 1);
  const updated = await Post.findById(post.id);
  assert.match(updated.bodyHtml, /linea-vacia/);
  assert.equal(updated.body, 'uno\n\n\n\ndos');
  assert.deepEqual(await rerenderMarkdownOnce({ log }), { skipped: true });
});
