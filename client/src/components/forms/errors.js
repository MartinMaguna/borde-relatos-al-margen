import { ApiError } from '../../api/client.js';

/**
 * Convierte un error de la API en la lista que usan ErrorSummary y los campos.
 * - VALIDATION_ERROR / SLUG_TAKEN traen `details` por campo.
 * - Cualquier otro (credenciales, sesión vencida, red) es un error general.
 */
export function errorsFromApi(err) {
  if (err instanceof ApiError && err.details?.length) {
    return err.details.map((d) => ({ field: d.field, message: d.message }));
  }
  return [{ field: null, message: err?.message ?? 'Ocurrió un error inesperado.' }];
}

/** { campo: mensaje } para mostrar el primer error de cada campo junto a él. */
export function errorsByField(errors) {
  const map = {};
  for (const e of errors) if (e.field && !map[e.field]) map[e.field] = e.message;
  return map;
}
