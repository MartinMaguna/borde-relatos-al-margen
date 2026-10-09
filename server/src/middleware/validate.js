import { HttpError } from './errors.js';

/**
 * Valida body, query y/o params con esquemas Zod.
 * Los datos ya limpios quedan en `req.valid` (en Express 5 `req.query` es de solo lectura).
 *
 * Los errores se devuelven como `details: [{ field, message }]` para que el
 * formulario del panel pueda asociar cada mensaje a su campo (aria-describedby).
 */
export function validate(schemas) {
  return (req, _res, next) => {
    req.valid = {};
    const details = [];

    for (const key of ['params', 'query', 'body']) {
      if (!schemas[key]) continue;
      const result = schemas[key].safeParse(req[key] ?? {});
      if (result.success) {
        req.valid[key] = result.data;
      } else {
        for (const issue of result.error.issues) {
          details.push({ field: issue.path.join('.') || key, message: issue.message });
        }
      }
    }

    if (details.length) {
      return next(new HttpError(400, 'Hay datos inválidos. Revisá los campos marcados.', { code: 'VALIDATION_ERROR', details }));
    }
    next();
  };
}
