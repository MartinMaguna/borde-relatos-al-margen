import { Marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

/**
 * Markdown → HTML seguro.
 *
 * - `breaks: true`: un salto de línea simple se respeta como <br>.
 *   Imprescindible para poesía, donde cada verso es una línea.
 * - Sanitizamos SIEMPRE la salida de marked (que permite HTML crudo) con una
 *   lista blanca estricta: sin scripts, estilos, iframes ni atributos de eventos.
 * - Los encabezados se bajan un nivel (# → h2): el h1 de cada vista es el título
 *   de la publicación, y la jerarquía tiene que ser correcta para lectores de pantalla.
 * - No se permiten imágenes dentro del cuerpo: no podríamos garantizar su texto
 *   alternativo. La imagen de la publicación va en su propio campo, con alt obligatorio.
 */
const marked = new Marked({ gfm: true, breaks: true });

const SANITIZE_OPTIONS = {
  allowedTags: [
    'p', 'br', 'hr', 'h2', 'h3', 'h4', 'h5', 'h6',
    'strong', 'em', 'del', 's', 'blockquote', 'ul', 'ol', 'li', 'a', 'code', 'pre',
  ],
  allowedAttributes: { a: ['href', 'title'], ol: ['start'] },
  allowedSchemes: ['http', 'https', 'mailto'],
  transformTags: {
    h1: 'h2', h2: 'h3', h3: 'h4', h4: 'h5', h5: 'h6',
    b: 'strong',
    i: 'em',
  },
};

export function renderMarkdown(source = '') {
  const rawHtml = marked.parse(source);
  return sanitizeHtml(rawHtml, SANITIZE_OPTIONS).trim();
}
