import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { startTestDb } from './helpers.js';

let db;
before(async () => {
  db = await startTestDb();
});
after(() => db.stop());
beforeEach(() => db.reset());

test('renameBrand cambia el nombre de la plataforma y deja el resto', async () => {
  const { renameBrand } = await import('../src/migrations/renameBrand.js');
  assert.equal(renameBrand('Se publicarán en Borde | Relatos al Margen.'), 'Se publicarán en Relatos al margen.');
  assert.equal(renameBrand('Borde  Relatos al Margen es un espacio'), 'Relatos al margen es un espacio');
  assert.equal(renameBrand('publicarlas en Borde, una plataforma'), 'publicarlas en Relatos al margen, una plataforma');
  assert.equal(renameBrand('caminaba por el borde del río'), 'caminaba por el borde del río', 'la palabra común no se toca');
  assert.equal(renameBrand('Bordes y bordados'), 'Bordes y bordados');
});

test('renameBrandOnce actualiza Acerca, talleres, convocatorias y autores, no las obras, y corre una sola vez', async () => {
  const { renameBrandOnce } = await import('../src/migrations/renameBrand.js');
  const { Post, Page } = db.models;
  await Page.create({ slug: 'acerca', title: 'Acerca de Borde', body: 'Borde  Relatos al Margen es un espacio.' });
  const call = await Post.create({
    title: 'Convocatoria',
    category: 'convocatorias',
    slug: 'conv',
    author: 'Borde',
    body: 'Se publicarán en Borde | Relatos al Margen.',
    deadline: new Date('2999-01-01'),
    status: 'published',
  });
  const story = await Post.create({ title: 'Cuento', category: 'cuentos', slug: 'cuento', author: 'Ana', body: 'Al Borde del mar.', status: 'published' });

  const log = { info: () => {} };
  const first = await renameBrandOnce({ log });
  assert.equal(first.changed, 2);

  const about = await Page.findOne({ slug: 'acerca' });
  assert.equal(about.title, 'Acerca de Relatos al margen');
  assert.match(about.bodyHtml, /<p>Relatos al margen es un espacio\.<\/p>/);
  const updated = await Post.findById(call.id);
  assert.equal(updated.author, 'Relatos al margen');
  assert.match(updated.bodyHtml, /Se publicarán en Relatos al margen\./);
  assert.equal((await Post.findById(story.id)).body, 'Al Borde del mar.', 'las obras no se tocan');

  await Page.updateOne({ slug: 'acerca' }, { title: 'Acerca de Borde' });
  assert.deepEqual(await renameBrandOnce({ log }), { skipped: true });
  assert.equal((await Page.findOne({ slug: 'acerca' })).title, 'Acerca de Borde', 'no vuelve a correr');
  assert.equal(await mongoose.connection.collection('migrations').countDocuments(), 1);
});
