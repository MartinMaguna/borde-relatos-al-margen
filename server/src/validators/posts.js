import { z } from 'zod';
import { CATEGORIES, POST_STATUS } from '../constants.js';
import { emptyToUndefined, httpUrl, objectId, pagination } from './common.js';

/**
 * Una fecha sola ("2026-11-30") significa "hasta el final de ese día".
 * Usamos la hora de Uruguay/Argentina (UTC-3, sin horario de verano).
 */
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const deadlineDate = z.preprocess(
  (v) => (typeof v === 'string' && DATE_ONLY.test(v) ? `${v}T23:59:59.999-03:00` : v),
  z.coerce.date({ error: 'Fecha inválida' }),
);

// Una imagen subida desde el panel ("/api/images/<id>") o una dirección externa http(s).
const imageUrl = z.union([z.string().regex(/^\/api\/images\/[a-f\d]{24}$/i), httpUrl], {
  error: 'Subí una imagen o escribí una dirección que empiece con http:// o https://',
});

const imageSchema = z.object({
  url: imageUrl,
  alt: z
    .string({ error: 'El texto alternativo es obligatorio' })
    .trim()
    .min(1, 'El texto alternativo es obligatorio: describí qué muestra la imagen')
    .max(300),
});

export const postInputSchema = z
  .object({
    title: z.string({ error: 'El título es obligatorio' }).trim().min(1, 'El título es obligatorio').max(200),
    slug: emptyToUndefined(
      z
        .string()
        .trim()
        .toLowerCase()
        .max(100)
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Solo minúsculas sin tildes, números y guiones (ej.: mi-texto)')
        .optional(),
    ),
    category: z.enum(CATEGORIES, { error: 'Elegí una categoría válida' }),
    author: z.string({ error: 'El nombre de autor/a es obligatorio' }).trim().min(1, 'El nombre de autor/a es obligatorio').max(120),
    summary: z.string().trim().max(500, 'El resumen admite hasta 500 caracteres').default(''),
    body: z.string({ error: 'El texto es obligatorio' }).trim().min(1, 'El texto es obligatorio').max(100_000),
    image: imageSchema.nullable().default(null),
    status: z.enum(POST_STATUS).default('draft'),
    deadline: emptyToUndefined(deadlineDate.nullable().optional()),
    basesUrl: emptyToUndefined(httpUrl.nullable().optional()),
  })
  .superRefine((data, ctx) => {
    if (data.category === 'convocatorias' && !data.deadline) {
      ctx.addIssue({ code: 'custom', path: ['deadline'], message: 'La fecha límite es obligatoria en convocatorias' });
    }
  });

export const publicListQuery = pagination.extend({
  category: z.enum(CATEGORIES).optional(),
});

export const adminListQuery = pagination.extend({
  category: emptyToUndefined(z.enum(CATEGORIES).optional()),
  status: emptyToUndefined(z.enum(POST_STATUS).optional()),
  q: emptyToUndefined(z.string().trim().max(100).optional()),
});

export const latestQuery = z.object({
  perCategory: z.coerce.number().int().min(1).max(10).default(3),
});

export const categorySlugParams = z.object({
  category: z.enum(CATEGORIES),
  slug: z.string().max(120),
});

export const idParams = z.object({ id: objectId });
