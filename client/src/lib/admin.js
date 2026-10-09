import { CATEGORIES } from './site.js';

export const STATUS_LABELS = { draft: 'Borrador', published: 'Publicado' };

export const CATEGORY_OPTIONS = CATEGORIES.map((c) => ({ value: c.slug, label: c.label }));

export const STATUS_OPTIONS = [
  { value: 'draft', label: 'Borrador (no se ve en el sitio)' },
  { value: 'published', label: 'Publicado (visible en el sitio)' },
];

const dateInputFormatter = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: 'America/Montevideo',
});

/** ISO → "2026-11-30" para <input type="date">, en la misma zona horaria que la API. */
export function toDateInput(iso) {
  return iso ? dateInputFormatter.format(new Date(iso)) : '';
}
