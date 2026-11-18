import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slugify, uniqueSlug } from '../src/utils/slug.js';
import { renderMarkdown } from '../src/utils/markdown.js';

test('slugify quita tildes, eñes y signos', () => {
  assert.equal(slugify('¿Qué es el Borde, señora?'), 'que-es-el-borde-senora');
  assert.equal(slugify('  Ñandú   & Cía.  '), 'nandu-cia');
});

test('uniqueSlug agrega sufijos numéricos', async () => {
  const taken = new Set(['poema', 'poema-2']);
  assert.equal(await uniqueSlug('poema', async (s) => taken.has(s)), 'poema-3');
  assert.equal(await uniqueSlug('', async () => false), 'sin-titulo');
});

test('renderMarkdown respeta los versos con <br>', () => {
  assert.equal(renderMarkdown('verso uno\nverso dos'), '<p>verso uno<br />verso dos</p>');
});

test('renderMarkdown elimina HTML peligroso', () => {
  const html = renderMarkdown('Hola <script>alert(1)</script> <img src=x onerror=alert(1)> [x](javascript:alert(1))');
  assert.doesNotMatch(html, /<script|onerror|<img|javascript:/i);
});

test('renderMarkdown baja los encabezados un nivel (el h1 es el título de la página)', () => {
  const html = renderMarkdown('# Uno\n\n## Dos');
  assert.match(html, /<h2>Uno<\/h2>/);
  assert.match(html, /<h3>Dos<\/h3>/);
  assert.doesNotMatch(html, /<h1/);
});

test('renderMarkdown muestra el texto como en el editor', async () => {
  const { renderMarkdown } = await import('../src/utils/markdown.js');
  const nbsp = ' ';
  assert.equal(renderMarkdown('uno\ndos'), '<p>uno<br />dos</p>', 'Enter = salto de línea');
  assert.equal(renderMarkdown('uno\n\ndos'), '<p>uno</p>\n<p>dos</p>', 'línea en blanco = párrafo');
  assert.equal(
    renderMarkdown('uno\n\n\n\ndos'),
    '<p>uno</p>\n<p class="linea-vacia"></p><p class="linea-vacia"></p><p>dos</p>',
    'tres líneas en blanco = un párrafo y dos líneas vacías',
  );
  assert.equal(renderMarkdown('    verso con sangría'), `<p>${nbsp.repeat(4)}verso con sangría</p>`, 'la sangría no es un bloque de código');
  assert.equal(renderMarkdown('\tverso'), `<p>${nbsp.repeat(4)}verso</p>`);
  assert.equal(renderMarkdown('palabra   lejos'), `<p>palabra ${nbsp.repeat(2)}lejos</p>`);
  assert.match(renderMarkdown('- uno\n  - anidado'), /<li>uno<ul>\n<li>anidado<\/li>/, 'las listas anidadas siguen funcionando');
  assert.equal(renderMarkdown('<p class="otra">x</p>'), '<p>x</p>', 'solo se permite la clase de línea vacía');
});
