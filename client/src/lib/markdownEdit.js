/**
 * Transformaciones de formato Markdown sobre el texto de un <textarea>.
 *
 * Cada función recibe el texto y la selección (start, end) y devuelve:
 *   { from, to, insert, selStart, selEnd, removed }
 * = reemplazar value[from..to] por `insert` y dejar seleccionado selStart..selEnd.
 * `removed` indica que se QUITÓ un formato (para anunciarlo bien).
 * Son funciones puras: el componente las aplica y se pueden probar sin DOM.
 */

/** Negrita, cursiva, tachado: envuelve la selección (o la desenvuelve si ya lo está). */
/** Cantidad de veces seguidas que aparece `ch` justo antes (dir -1) o después (dir 1) de `pos`. */
function runLength(value, pos, ch, dir) {
  let n = 0;
  for (let i = dir < 0 ? pos - 1 : pos; i >= 0 && i < value.length && value[i] === ch; i += dir) n += 1;
  return n;
}

export function toggleInline(value, start, end, marker, placeholder) {
  const m = marker.length;
  // ¿La selección ya tiene este formato? Se cuentan los caracteres del marcador a
  // cada lado: con "*" (cursiva) la cantidad es impar (*a* o ***a***); con "**" o
  // "~~" hacen falta al menos dos. Así "**a**" no se confunde con cursiva.
  const left = runLength(value, start, marker[0], -1);
  const right = runLength(value, end, marker[0], 1);
  const wrapped = m === 1 ? left % 2 === 1 && right % 2 === 1 : left >= m && right >= m;

  // Ya estaba envuelta: se quita el formato.
  if (start !== end && wrapped) {
    const inner = value.slice(start, end);
    return { from: start - m, to: end + m, insert: inner, selStart: start - m, selEnd: end - m, removed: true };
  }

  const text = start === end ? placeholder : value.slice(start, end);
  // Los espacios de los bordes quedan afuera: "**hola **" no es negrita en Markdown.
  const lead = text.match(/^\s*/)[0];
  const trail = text.match(/\s*$/)[0];
  const core = text.slice(lead.length, text.length - trail.length) || placeholder;
  const insert = `${lead}${marker}${core}${marker}${trail}`;
  const selStart = start + lead.length + m;
  return { from: start, to: end, insert, selStart, selEnd: selStart + core.length, removed: false };
}

const LINE_KINDS = {
  heading: /^#{1,6}\s+/,
  quote: /^>\s?/,
  bullet: /^[-*+]\s+/,
  ordered: /^\d+[.)]\s+/,
};
const ANY_BLOCK = /^(#{1,6}\s+|>\s?|[-*+]\s+|\d+[.)]\s+)/;

/** Rango de líneas completas que toca la selección. */
function lineRange(value, start, end) {
  const from = value.lastIndexOf('\n', start - 1) + 1;
  let to = value.indexOf('\n', end > start && value[end - 1] === '\n' ? end - 1 : end);
  if (to === -1) to = value.length;
  return { from, to };
}

/**
 * Formato de línea: títulos (#, ##, ###), cita (>), listas (- y 1.).
 * Se aplica a todas las líneas seleccionadas; si ya tenían exactamente ese
 * formato, se quita (alterna). Reemplaza otro formato de línea que hubiera.
 */
export function toggleLinePrefix(value, start, end, kind, prefix) {
  const { from, to } = lineRange(value, start, end);
  const lines = value.slice(from, to).split('\n');
  const pattern = LINE_KINDS[kind];
  const already = lines.filter((l) => l.trim() !== '').every((l) => {
    const match = l.match(pattern);
    return match && (kind !== 'heading' || match[0].trim() === prefix.trim());
  });

  let n = 0;
  const out = lines.map((line) => {
    if (line.trim() === '') return line;
    const bare = line.replace(ANY_BLOCK, '');
    if (already) return bare;
    n += 1;
    return (kind === 'ordered' ? `${n}. ` : prefix) + bare;
  });
  const insert = out.join('\n');
  return { from, to, insert, selStart: from, selEnd: from + insert.length, removed: already };
}

/** Enlace: [texto](https://). Deja seleccionado lo que falta completar. */
export function insertLink(value, start, end) {
  const text = value.slice(start, end).trim();
  if (text) {
    const insert = `[${text}](https://)`;
    const urlStart = start + text.length + 3;
    return { from: start, to: end, insert, selStart: urlStart, selEnd: urlStart + 'https://'.length, removed: false };
  }
  const placeholder = 'texto del enlace';
  const insert = `[${placeholder}](https://)`;
  return { from: start, to: end, insert, selStart: start + 1, selEnd: start + 1 + placeholder.length, removed: false };
}

/** Separador (línea horizontal), siempre rodeado de líneas en blanco. */
export function insertSeparator(value, start, end) {
  const beforeText = value.slice(0, start);
  const afterText = value.slice(end);
  const lead = beforeText === '' ? '' : beforeText.endsWith('\n\n') ? '' : beforeText.endsWith('\n') ? '\n' : '\n\n';
  const trail = afterText.startsWith('\n\n') ? '' : afterText.startsWith('\n') ? '\n' : '\n\n';
  const insert = `${lead}---${trail}`;
  const caret = start + insert.length;
  return { from: start, to: end, insert, selStart: caret, selEnd: caret, removed: false };
}
