/** Respuesta de éxito con el formato común de la API: { ok, data, meta? }. */
export function sendOk(res, data, { status = 200, meta } = {}) {
  res.status(status).json({ ok: true, data, ...(meta && { meta }) });
}

/** Meta de paginación consistente para todos los listados. */
export function paginationMeta({ page, limit, total }) {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}
