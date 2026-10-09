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

const create = (data) => agent.post('/api/admin/posts').send(postData(data));

describe('Admin: crear publicaciones', () => {
  test('crea una publicación, genera el slug y convierte el Markdown a HTML seguro', async () => {
    const res = await create({
      title: 'Canción del Ñandú',
      category: 'poesia',
      body: '# Primera parte\n\nverso uno\nverso dos\n\n<script>alert(1)</script>',
    });

    assert.equal(res.status, 201);
    const post = res.body.data;
    assert.equal(post.slug, 'cancion-del-nandu');
    assert.ok(post.id);
    assert.ok(post.publishedAt, 'al publicarse se registra la fecha');
    assert.match(post.bodyHtml, /<h2>Primera parte<\/h2>/);
    assert.match(post.bodyHtml, /verso uno<br \/>verso dos/);
    assert.doesNotMatch(post.bodyHtml, /<script/);
  });

  test('si el slug automático ya existe, agrega un sufijo', async () => {
    await create({ title: 'Repetido' });
    const res = await create({ title: 'Repetido' });
    assert.equal(res.body.data.slug, 'repetido-2');
  });

  test('si el editor elige un slug ocupado → 409 con el campo señalado', async () => {
    await create({ title: 'A', slug: 'mi-slug' });
    const res = await create({ title: 'B', slug: 'mi-slug' });
    assert.equal(res.status, 409);
    assert.equal(res.body.error.details[0].field, 'slug');
  });

  test('valida campos obligatorios y devuelve un error por campo', async () => {
    const res = await agent.post('/api/admin/posts').send({ title: '', category: 'novela' });
    assert.equal(res.status, 400);
    const fields = res.body.error.details.map((d) => d.field);
    for (const f of ['title', 'category', 'author', 'body']) assert.ok(fields.includes(f), `falta error de ${f}`);
  });

  test('una imagen sin texto alternativo se rechaza', async () => {
    const res = await create({ image: { url: 'https://example.com/foto.jpg', alt: '  ' } });
    assert.equal(res.status, 400);
    assert.ok(res.body.error.details.some((d) => d.field === 'image.alt'));
  });

  test('rechaza URLs que no sean http(s)', async () => {
    const res = await create({ image: { url: 'javascript:alert(1)', alt: 'x' } });
    assert.equal(res.status, 400);
    assert.ok(res.body.error.details.some((d) => d.field === 'image.url'));
  });

  test('una convocatoria exige fecha límite', async () => {
    const res = await create({ category: 'convocatorias' });
    assert.equal(res.status, 400);
    assert.ok(res.body.error.details.some((d) => d.field === 'deadline'));
  });

  test('una fecha sola vale hasta el final de ese día (UTC-3) y se calcula el estado', async () => {
    const open = await create({ title: 'Abierta', category: 'convocatorias', deadline: '2999-12-31', basesUrl: 'https://example.com/bases' });
    const closed = await create({ title: 'Cerrada', category: 'convocatorias', deadline: '2000-01-01' });

    assert.equal(open.status, 201);
    assert.equal(open.body.data.deadline, '3000-01-01T02:59:59.999Z');
    assert.equal(open.body.data.callStatus, 'abierta');
    assert.equal(closed.body.data.callStatus, 'cerrada');
  });

  test('los campos de convocatoria se descartan en otras categorías', async () => {
    const res = await create({ category: 'cuentos', deadline: '2999-12-31', basesUrl: 'https://example.com' });
    assert.equal(res.body.data.deadline, null);
    assert.equal(res.body.data.basesUrl, null);
    assert.equal(res.body.data.callStatus, undefined);
  });
});

describe('Admin: listar, editar y eliminar', () => {
  test('lista con filtros por estado, categoría y búsqueda', async () => {
    await create({ title: 'Luna de agua', category: 'poesia' });
    await create({ title: 'Sol de tierra', category: 'poesia', status: 'draft' });
    await create({ title: 'Luna de cuento', category: 'cuentos' });

    const drafts = await agent.get('/api/admin/posts?status=draft');
    assert.deepEqual(drafts.body.data.map((p) => p.title), ['Sol de tierra']);

    const search = await agent.get('/api/admin/posts?q=luna&category=poesia');
    assert.deepEqual(search.body.data.map((p) => p.title), ['Luna de agua']);

    const all = await agent.get('/api/admin/posts?category=&status=');
    assert.equal(all.body.meta.total, 3);
  });

  test('edita con PUT y conserva el slug si viene vacío', async () => {
    const { body } = await create({ title: 'Original', status: 'draft' });
    const res = await agent.put(`/api/admin/posts/${body.data.id}`).send(postData({ title: 'Editado', slug: '' }));

    assert.equal(res.status, 200);
    assert.equal(res.body.data.title, 'Editado');
    assert.equal(res.body.data.slug, 'original');
    assert.ok(res.body.data.publishedAt, 'pasar a publicado registra la fecha');
  });

  test('elimina y después devuelve 404', async () => {
    const { body } = await create({});
    const del = await agent.delete(`/api/admin/posts/${body.data.id}`);
    assert.equal(del.status, 200);
    assert.equal((await agent.get(`/api/admin/posts/${body.data.id}`)).status, 404);
  });

  test('un id con formato inválido devuelve 400', async () => {
    const res = await agent.get('/api/admin/posts/no-es-un-id');
    assert.equal(res.status, 400);
  });
});

describe('API pública', () => {
  test('no muestra borradores, pagina y filtra por categoría', async () => {
    for (let i = 1; i <= 3; i++) await create({ title: `Poema ${i}`, category: 'poesia' });
    await create({ title: 'Borrador', category: 'poesia', status: 'draft' });
    await create({ title: 'Cuento', category: 'cuentos' });

    const res = await request(app).get('/api/posts?category=poesia&limit=2&page=1');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.length, 2);
    assert.deepEqual(res.body.meta, { page: 1, limit: 2, total: 3, totalPages: 2 });
    assert.ok(res.body.data.every((p) => p.category === 'poesia' && p.status === 'published'));
    assert.equal(res.body.data[0].body, undefined, 'el listado no incluye el cuerpo');
  });

  test('detalle: devuelve el HTML pero no el Markdown ni datos internos', async () => {
    await create({ title: 'Visible', category: 'cuentos' });
    const res = await request(app).get('/api/posts/cuentos/visible');
    assert.equal(res.status, 200);
    assert.ok(res.body.data.bodyHtml);
    assert.equal(res.body.data.body, undefined);
    assert.equal(res.body.data.createdBy, undefined);
  });

  test('detalle: un borrador o una categoría equivocada dan 404', async () => {
    await create({ title: 'Oculto', category: 'cuentos', status: 'draft' });
    await create({ title: 'Poema', category: 'poesia' });
    assert.equal((await request(app).get('/api/posts/cuentos/oculto')).status, 404);
    assert.equal((await request(app).get('/api/posts/cuentos/poema')).status, 404);
  });

  test('latest agrupa las últimas publicaciones por categoría', async () => {
    await create({ title: 'P', category: 'poesia' });
    await create({ title: 'T', category: 'talleres' });
    const res = await request(app).get('/api/posts/latest?perCategory=2');
    assert.deepEqual(Object.keys(res.body.data), ['poesia', 'cuentos', 'talleres', 'convocatorias']);
    assert.equal(res.body.data.poesia.length, 1);
    assert.equal(res.body.data.cuentos.length, 0);
  });
});
