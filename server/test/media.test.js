import { after, before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { youTubeId } from '../src/utils/youtube.js';
import { normalizeAudioUrl } from '../src/utils/audio.js';
import { createEditor, loginAgent, postData, startTestDb } from './helpers.js';

describe('youTubeId', () => {
  const ID = 'dQw4w9WgXcQ';
  for (const url of [
    `https://www.youtube.com/watch?v=${ID}`,
    `https://youtube.com/watch?v=${ID}&t=42s`,
    `https://m.youtube.com/watch?v=${ID}`,
    `https://youtu.be/${ID}`,
    `https://youtu.be/${ID}?si=abc`,
    `https://www.youtube.com/shorts/${ID}`,
    `https://www.youtube.com/embed/${ID}`,
    `https://www.youtube-nocookie.com/embed/${ID}`,
    `https://www.youtube.com/live/${ID}`,
  ]) {
    test(`reconoce ${url}`, () => assert.equal(youTubeId(url), ID));
  }

  for (const url of ['https://vimeo.com/123', 'https://www.youtube.com/watch?v=corto', 'https://evil.com/watch?v=dQw4w9WgXcQ', 'no es url', 'javascript:alert(1)']) {
    test(`rechaza ${url}`, () => assert.equal(youTubeId(url), null));
  }
});

describe('normalizeAudioUrl', () => {
  test('acepta enlaces https directos a archivos de audio', () => {
    assert.equal(normalizeAudioUrl('https://archive.org/download/x/lectura.mp3'), 'https://archive.org/download/x/lectura.mp3');
    assert.ok(normalizeAudioUrl('https://cdn.ejemplo.com/a/b/poema.M4A'));
    assert.ok(normalizeAudioUrl('https://ejemplo.com/voz.ogg?v=2'));
  });

  test('pasa los enlaces de Dropbox a enlace directo', () => {
    assert.equal(
      normalizeAudioUrl('https://www.dropbox.com/scl/fi/abc/lectura.mp3?rlkey=xyz&dl=0'),
      'https://www.dropbox.com/scl/fi/abc/lectura.mp3?rlkey=xyz&raw=1',
    );
  });

  test('rechaza páginas (no archivos), http y otros esquemas', () => {
    assert.equal(normalizeAudioUrl('https://soundcloud.com/autora/poema'), null);
    assert.equal(normalizeAudioUrl('https://open.spotify.com/episode/123'), null);
    assert.equal(normalizeAudioUrl('http://ejemplo.com/a.mp3'), null);
    assert.equal(normalizeAudioUrl('javascript:alert(1)//.mp3'), null);
  });
});

describe('Publicaciones con audio y lengua de señas', () => {
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

  test('guarda el audio y el video normalizado; la API pública expone signVideoId', async () => {
    const created = await agent.post('/api/admin/posts').send(
      postData({
        title: 'Con medios',
        audio: { url: 'https://archive.org/download/x/lectura.mp3', label: 'Lectura de la autora' },
        signVideoUrl: 'https://youtu.be/dQw4w9WgXcQ?si=compartido',
      }),
    );
    assert.equal(created.status, 201);
    assert.equal(created.body.data.signVideoUrl, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');

    const list = await request(app).get('/api/posts?category=cuentos');
    const card = list.body.data[0];
    assert.deepEqual(card.audio, { url: 'https://archive.org/download/x/lectura.mp3', label: 'Lectura de la autora' });
    assert.equal(card.signVideoId, 'dQw4w9WgXcQ');
  });

  test('sin descripción, el audio se llama "Lectura en voz alta"', async () => {
    const res = await agent.post('/api/admin/posts').send(postData({ audio: { url: 'https://ejemplo.com/a.mp3', label: '' } }));
    assert.equal(res.body.data.audio.label, 'Lectura en voz alta');
  });

  test('enlaces inválidos dan error en su campo', async () => {
    const res = await agent.post('/api/admin/posts').send(
      postData({ audio: { url: 'https://soundcloud.com/autora/poema' }, signVideoUrl: 'https://vimeo.com/123' }),
    );
    assert.equal(res.status, 400);
    const fields = res.body.error.details.map((d) => d.field);
    assert.ok(fields.includes('audio.url'));
    assert.ok(fields.includes('signVideoUrl'));
  });

  test('editar sin audio ni video los quita', async () => {
    const created = await agent.post('/api/admin/posts').send(
      postData({ audio: { url: 'https://ejemplo.com/a.mp3' }, signVideoUrl: 'https://youtu.be/dQw4w9WgXcQ' }),
    );
    const res = await agent.put(`/api/admin/posts/${created.body.data.id}`).send(postData({ audio: null, signVideoUrl: '' }));
    assert.equal(res.body.data.audio, null);
    assert.equal(res.body.data.signVideoUrl, null);
    assert.equal(res.body.data.signVideoId, null);
  });
});
