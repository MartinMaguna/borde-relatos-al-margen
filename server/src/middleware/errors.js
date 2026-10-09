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

/** Traduce errores conocidos de librerías (Express, Mongoose, MongoDB) a HttpError. */
function normalize(err) {
  if (err instanceof HttpError) return err;

  // JSON mal formado en el body (body-parser)
  if (err.type === 'entity.parse.failed') {
    return new HttpError(400, 'El cuerpo de la petición no es JSON válido', { code: 'INVALID_JSON' });
  }
  if (err.type === 'entity.too.large') {
    return new HttpError(413, 'El contenido es demasiado grande', { code: 'PAYLOAD_TOO_LARGE' });
  }
  // Índice único violado (p. ej. slug repetido por una carrera entre dos guardados)
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern ?? {})[0] ?? 'campo';
    return new HttpError(409, `Ya existe un registro con ese valor de ${field}`, {
      code: 'DUPLICATE',
      details: [{ field, message: 'Ya está en uso' }],
    });
  }
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    return new HttpError(400, 'Hay datos inválidos. Revisá los campos marcados.', { code: 'VALIDATION_ERROR', details });
  }
  if (err.name === 'CastError') {
    return new HttpError(400, 'Identificador inválido', { code: 'INVALID_ID' });
  }
  return err;
}

// Express reconoce un manejador de errores por su firma de 4 argumentos.
export function errorHandler(rawErr, _req, res, _next) {
  const err = normalize(rawErr);
  const status = err.status ?? err.statusCode ?? 500;
  if (status >= 500) console.error(rawErr);

  res.status(status).json({
    ok: false,
    error: {
      // En errores 500 no exponemos detalles internos al cliente.
      message: status >= 500 ? 'Error interno del servidor' : err.message,
      code: status >= 500 ? 'INTERNAL_ERROR' : (err.code ?? 'ERROR'),
      ...(err.details && { details: err.details }),
    },
  });
}
