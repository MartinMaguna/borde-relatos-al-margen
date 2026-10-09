import { z } from 'zod';

// Mensajes de error de Zod en español por defecto.
z.config(z.locales.es());

/** Los formularios envían "" para campos vacíos: los tratamos como ausentes. */
export const emptyToUndefined = (schema) =>
  z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), schema);

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Identificador inválido');

export const httpUrl = z.url({ protocol: /^https?$/, error: 'Tiene que ser una URL que empiece con http:// o https://' });

export const pagination = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});
