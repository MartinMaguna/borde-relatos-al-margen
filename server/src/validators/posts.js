import { z } from 'zod';
import { CATEGORIES, POST_STATUS } from '../constants.js';
import { emptyToUndefined, httpUrl, objectId, pagination } from './common.js';
import { normalizeAudioUrl } from '../utils/audio.js';
import { canonicalYouTubeUrl, youTubeId } from '../utils/youtube.js';

/**
 * Una fecha sola ("2026-11-30") significa "hasta el final de ese día".
 * Usamos la hora de Uruguay/Argentina (UTC-3, sin horario de verano).
 */
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const deadlineDate = z.preprocess(
  (v) => (typeof v === 'string' && DATE_ONLY.test(v) ? `${v}T23:59:59.999-03:00` : v),
  z.coerce.date({ error: 'Fecha inválida' }),
);

/** Fecha de apertura: desde el comienzo de ese día (UTC-3). */
const openingDate = z.preprocess(
  (v) => (typeof v === 'string' && DATE_ONLY.test(v) ? `${v}T00:00:00.000-03:00` : v),
  z.coerce.date({ error: 'Fecha inválida' }),
);

const chapterSchema = z.object({
  title: z.string({ error: 'Escribí el título del capítulo' }).trim().min(1, 'Escribí el título del capítulo').max(200),
  body: z.string({ error: 'Escribí el texto del capítulo' }).trim().min(1, 'Escribí el texto del capítulo').max(100_000),
});

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

// Audio en otro sitio: enlace https directo al archivo (se normaliza, p. ej. Dropbox).
const audioSchema = z.object({
  url: z
    .string({ error: 'Pegá el enlace al archivo de audio' })
    .trim()
    .transform((value, ctx) => {
      const url = normalizeAudioUrl(value);
      if (!url) {
        ctx.addIssue({
          code: 'custom',
          message:
            'Tiene que ser un enlace https directo al archivo de audio, que termine en .mp3, .m4a, .ogg, .wav u otro formato de audio.',
        });
        return z.NEVER;
      }
      return url;
    }),
  label: z
    .string()
    .trim()
    .max(120, 'La descripción del audio admite hasta 120 caracteres')
    .default('')
    .transform((v) => v || 'Lectura en voz alta'),
});

// Cualquier formato de enlace de YouTube; se guarda en forma canónica.
const signVideoUrl = z
  .string()
  .trim()
  .transform((value, ctx) => {
    const id = youTubeId(value);
    if (!id) {
      ctx.addIssue({
        code: 'custom',
        message: 'Tiene que ser un enlace a un video de YouTube, por ejemplo https://www.youtube.com/watch?v=…',
      });
      return z.NEVER;
    }
    return canonicalYouTubeUrl(id);
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
    body: z.string().trim().max(100_000).default(''),
    chapters: z.array(chapterSchema).max(60, 'Hasta 60 capítulos').default([]),
    image: imageSchema.nullable().default(null),
    audio: audioSchema.nullable().default(null),
    signVideoUrl: emptyToUndefined(signVideoUrl.nullable().optional()),
    acceptsApplications: z.boolean().default(false),
    status: z.enum(POST_STATUS).default('draft'),
    opensAt: emptyToUndefined(openingDate.nullable().optional()),
    deadline: emptyToUndefined(deadlineDate.nullable().optional()),
    basesUrl: emptyToUndefined(httpUrl.nullable().optional()),
  })
  // `when: () => true`: se evalúan aunque haya otros errores, así el formulario los muestra todos juntos.
  .refine((data) => Boolean(data.body) || (data.category === 'cuentos' && data.chapters?.length > 0), {
    path: ['body'],
    message: 'El texto es obligatorio',
    when: () => true,
  })
  .refine((data) => data.category !== 'convocatorias' || Boolean(data.deadline), {
    path: ['deadline'],
    message: 'La fecha límite es obligatoria en convocatorias',
    when: () => true,
  })
  .refine(
    (data) =>
      data.category !== 'convocatorias' ||
      !(data.opensAt instanceof Date) ||
      !(data.deadline instanceof Date) ||
      data.opensAt <= data.deadline,
    { path: ['opensAt'], message: 'La fecha de apertura tiene que ser anterior a la fecha límite', when: () => true },
  );

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
