import { z } from 'zod';
import { emptyToUndefined, httpUrl, pagination } from './common.js';
import { SUPPORTER_ROLES } from '../models/Supporter.js';

const honeypot = z.string().max(200).optional();

export const contactInput = z.object({
  name: z.string({ error: 'Escribí tu nombre' }).trim().min(1, 'Escribí tu nombre').max(120, 'El nombre admite hasta 120 caracteres'),
  email: z
    .string({ error: 'Escribí tu correo electrónico' })
    .trim()
    .toLowerCase()
    .min(1, 'Escribí tu correo electrónico')
    .pipe(z.email({ error: 'Escribí un correo electrónico válido, por ejemplo nombre@ejemplo.com' })),
  message: z
    .string({ error: 'Escribí tu mensaje' })
    .trim()
    .min(1, 'Escribí tu mensaje')
    .max(5000, 'El mensaje admite hasta 5000 caracteres'),
  website: honeypot,
});

export const contactListQuery = pagination;

// Logo subido desde el panel ("/api/images/<id>") o una dirección externa http(s).
const logoUrl = z.union([z.string().regex(/^\/api\/images\/[a-f\d]{24}$/i), httpUrl], {
  error: 'Subí el logo o escribí una dirección que empiece con http:// o https://',
});

export const supporterInput = z.object({
  name: z.string({ error: 'Escribí el nombre' }).trim().min(1, 'Escribí el nombre').max(120, 'El nombre admite hasta 120 caracteres'),
  role: z.enum(SUPPORTER_ROLES, { error: 'Elegí qué hace: impulsa, apoya, organiza o colabora' }),
  logoUrl: z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), logoUrl.optional()).refine(Boolean, {
    message: 'Subí el logo',
  }),
  link: emptyToUndefined(httpUrl.optional()),
});
