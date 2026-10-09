// Misma zona horaria que usa la API para las fechas límite (UTC-3).
const TIME_ZONE = 'America/Montevideo';

const dateFormatter = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long', year: 'numeric', timeZone: TIME_ZONE });

/** "2026-10-09T…" → "9 de octubre de 2026" (fecha completa, sin abreviaturas: se lee bien en voz). */
export function formatDate(iso) {
  return iso ? dateFormatter.format(new Date(iso)) : '';
}
