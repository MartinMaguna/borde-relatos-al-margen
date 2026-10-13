export const SITE_NAME = 'Borde Relatos al Margen';

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
    centered: true, // listado y lectura en una columna centrada
  },
  {
    slug: 'cuentos',
    label: 'Cuentos',
    intro: 'Narrativa breve: historias para leer de una sentada.',
    seeAll: 'Ver todos los cuentos',
    empty: 'Todavía no hay cuentos publicados.',
    centered: true,
  },
  {
    slug: 'talleres',
    label: 'Talleres',
    intro: 'Espacios de escritura y lectura compartida.',
    seeAll: 'Ver todos los talleres',
    empty: 'Por ahora no hay talleres anunciados.',
    banner: true, // a todo el ancho, con el formato de la portada
  },
  {
    slug: 'convocatorias',
    label: 'Convocatorias',
    intro: 'Llamados abiertos para enviar textos, con su fecha límite y sus bases.',
    seeAll: 'Ver todas las convocatorias',
    empty: 'Por ahora no hay convocatorias.',
    banner: true,
  },
];

export const CATEGORY_BY_SLUG = Object.fromEntries(CATEGORIES.map((c) => [c.slug, c]));

/** Elementos del menú principal, en el orden pedido. */
export const NAV_ITEMS = [
  { to: '/', label: 'Inicio' },
  ...CATEGORIES.map((c) => ({ to: `/${c.slug}`, label: c.label })),
  { to: '/acerca', label: 'Acerca' },
  { to: '/contacto', label: 'Contacto' },
];

/**
 * Grupos de logos al pie del sitio, en el orden en que se muestran
 * (coinciden con los roles de la API).
 */
export const SUPPORTER_GROUPS = [
  { role: 'impulsan', label: 'Impulsan' },
  { role: 'apoyan', label: 'Apoyan' },
  { role: 'organizan', label: 'Organizan' },
  { role: 'colaboran', label: 'Colaboran' },
];

export const PAGE_SIZE = 10;

/**
 * Redes sociales del pie. PENDIENTE: reemplazar por las cuentas reales de Borde
 * (por ahora llevan a la portada de cada red).
 */
export const SOCIAL_LINKS = [
  { network: 'instagram', label: 'Instagram', url: 'https://www.instagram.com/' },
  { network: 'youtube', label: 'YouTube', url: 'https://www.youtube.com/' },
];
