export const SITE_NAME = 'Borde. Relatos al Margen';

/**
 * Categorías en el orden del menú. `slug` coincide con la URL y con el valor de la API.
 * Los textos de "ver todo" son distintos para cada una: así cada enlace se
 * entiende fuera de contexto (los lectores de pantalla permiten listar enlaces).
 */
export const CATEGORIES = [
  {
    slug: 'poesia',
    label: 'Poesía',
    intro: 'Poemas de voces que escriben desde los márgenes.',
    seeAll: 'Ver toda la poesía',
    empty: 'Todavía no hay poemas publicados.',
  },
  {
    slug: 'cuentos',
    label: 'Cuentos',
    intro: 'Narrativa breve: historias para leer de una sentada.',
    seeAll: 'Ver todos los cuentos',
    empty: 'Todavía no hay cuentos publicados.',
  },
  {
    slug: 'talleres',
    label: 'Talleres',
    intro: 'Espacios de escritura y lectura compartida.',
    seeAll: 'Ver todos los talleres',
    empty: 'Por ahora no hay talleres anunciados.',
  },
  {
    slug: 'convocatorias',
    label: 'Convocatorias',
    intro: 'Llamados abiertos para enviar textos, con su fecha límite y sus bases.',
    seeAll: 'Ver todas las convocatorias',
    empty: 'Por ahora no hay convocatorias.',
  },
];

export const CATEGORY_BY_SLUG = Object.fromEntries(CATEGORIES.map((c) => [c.slug, c]));

/** Elementos del menú principal, en el orden pedido. */
export const NAV_ITEMS = [
  { to: '/', label: 'Inicio' },
  ...CATEGORIES.map((c) => ({ to: `/${c.slug}`, label: c.label })),
  { to: '/acerca', label: 'Acerca' },
];

export const PAGE_SIZE = 10;
