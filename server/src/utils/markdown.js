import { Marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

/**
 * Markdown → HTML seguro.
 *
 * El texto se ve en el sitio como se escribió en el editor:
 * - `breaks: true`: cada Enter es un salto de línea (<br>). Imprescindible
 *   para poesía, donde cada verso es una línea.
 * - Una línea en blanco separa párrafos (en el sitio ocupa una línea, ver
 *   `.prose` en el CSS). Varias líneas en blanco seguidas se conservan: cada
 *   una de más es un <p class="linea-vacia"> que ocupa exactamente una línea.
 * - Los espacios y tabulaciones al comienzo de una línea (sangrías de versos)
 *   y los espacios repetidos se conservan como espacios no separables. Así,
 *   además, una línea con sangría nunca se convierte en un bloque de código.
 *   Las listas anidadas (sangría + "-", "*", "+" o "1.") se dejan como están.
 *
 * Seguridad:
 * - Sanitizamos SIEMPRE la salida de marked (que permite HTML crudo) con una
 *   lista blanca estricta: sin scripts, estilos, iframes ni atributos de eventos.
 * - Los encabezados se bajan un nivel (# → h2): el h1 de cada vista es el título
 *   de la publicación, y la jerarquía tiene que ser correcta para lectores de pantalla.
 * - No se permiten imágenes dentro del cuerpo: no podríamos garantizar su texto
 *   alternativo. La imagen de la publicación va en su propio campo, con alt obligatorio.
 */
const marked = new Marked({ gfm: true, breaks: true });

export const BLANK_LINE_CLASS = 'linea-vacia';

const SANITIZE_OPTIONS = {
  allowedTags: [
    'p', 'br', 'hr', 'h2', 'h3', 'h4', 'h5', 'h6',
    'strong', 'em', 'del', 's', 'blockquote', 'ul', 'ol', 'li', 'a', 'code', 'pre',
  ],
  allowedAttributes: { a: ['href', 'title'], ol: ['start'], p: ['class'] },
  allowedClasses: { p: [BLANK_LINE_CLASS] },
  allowedSchemes: ['http', 'https', 'mailto'],
  transformTags: {
    h1: 'h2', h2: 'h3', h3: 'h4', h4: 'h5', h5: 'h6',
    b: 'strong',
    i: 'em',
  },
};

const NBSP = ' ';
const LIST_ITEM = /^([-*+]|\d+[.)])\s/;

/** Conserva sangrías y espacios repetidos de una línea (salvo en listas anidadas). */
function keepSpaces(line) {
  const indent = /^[ \t]*/.exec(line)[0];
  let rest = line.slice(indent.length).replace(/[ \t]+$/, '');
  if (!rest) return '';
  // Espacios repetidos dentro del verso: uno común y el resto no separables.
  rest = rest.replace(/ {2,}/g, (spaces) => ` ${NBSP.repeat(spaces.length - 1)}`);
  if (!indent || LIST_ITEM.test(rest)) return indent + rest;
  return indent.replace(/\t/g, '    ').replace(/ /g, NBSP) + rest;
}

/** Texto del editor → Markdown que respeta líneas, líneas en blanco y sangrías. */
export function preserveLayout(source = '') {
  const lines = source.replace(/\r\n?/g, '\n').split('\n').map(keepSpaces);
  const out = [];
  let blanks = 0;
  for (const line of lines) {
    if (line === '') {
      blanks++;
      continue;
    }
    if (out.length && blanks) {
      out.push('');
      // La primera línea en blanco separa párrafos; cada una de más ocupa una línea vacía.
      for (let i = 1; i < blanks; i++) out.push(`<p class="${BLANK_LINE_CLASS}"></p>`, '');
    }
    blanks = 0;
    out.push(line);
  }
  return out.join('\n');
}

export function renderMarkdown(source = '') {
  const rawHtml = marked.parse(preserveLayout(source));
  return sanitizeHtml(rawHtml, SANITIZE_OPTIONS).trim();
}
