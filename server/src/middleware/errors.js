/**
 * Manejo de errores centralizado.
 * Formato de respuesta consistente en toda la API:
 *   éxito: { ok: true, data, meta? }
 *   error: { ok: false, error: { message, code, details? } }
 */

export class HttpError extends Error {
  constructor(status, message, { code, details } = {}) {
    super(message);
    this.status = status;
    this.code = code ?? 'ERROR';
    this.details = details;
  }
}

export function notFound(req, _res, next) {
  next(new HttpError(404, `Ruta no encontrada: ${req.method} ${req.originalUrl}`, { code: 'NOT_FOUND' }));
}

// Express reconoce un manejador de errores por su firma de 4 argumentos.
export function errorHandler(err, _req, res, _next) {
  const status = err.status ?? err.statusCode ?? 500;
  if (status >= 500) console.error(err);

  res.status(status).json({
    ok: false,
    error: {
      // En errores 500 no exponemos detalles internos al cliente.
      message: status >= 500 ? 'Error interno del servidor' : err.message,
      code: err.code ?? (status >= 500 ? 'INTERNAL_ERROR' : 'ERROR'),
      ...(err.details && { details: err.details }),
    },
  });
}
