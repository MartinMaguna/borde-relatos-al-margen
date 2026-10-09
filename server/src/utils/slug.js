/** "¿Qué es el Borde, señora?" → "que-es-el-borde-senora" (quita tildes y signos). */
export function slugify(text) {
  return text
    .normalize('NFD') // separa letra y tilde: "é" → "e" + "´", "ñ" → "n" + "~"
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100)
    .replace(/-+$/, '');
}

/**
 * Devuelve un slug libre agregando -2, -3… si ya existe.
 * `exists(slug)` es una función async que consulta la base.
 */
export async function uniqueSlug(base, exists) {
  const root = base || 'sin-titulo';
  let candidate = root;
  for (let n = 2; await exists(candidate); n++) {
    candidate = `${root}-${n}`;
  }
  return candidate;
}
