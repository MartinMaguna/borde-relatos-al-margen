const API_URL = import.meta.env.VITE_API_URL ?? '/api';

/** Error de la API con la misma forma que devuelve el server: { message, code, details }. */
export class ApiError extends Error {
  constructor(status, { message, code, details } = {}) {
    super(message ?? 'Ocurrió un error inesperado');
    this.status = status;
    this.code = code ?? 'ERROR';
    this.details = details ?? [];
  }
}

/**
 * fetch con el formato común de la API.
 * Devuelve { data, meta } o lanza ApiError. La cookie de sesión viaja sola
 * porque cliente y API comparten origen.
 */
export async function api(path, { method = 'GET', body, signal } = {}) {
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      signal,
      credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError(0, { message: 'No se pudo conectar con el servidor. Revisá tu conexión.', code: 'NETWORK_ERROR' });
  }

  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.ok) throw new ApiError(res.status, json?.error);
  return { data: json.data, meta: json.meta };
}
