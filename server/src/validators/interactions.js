import { z } from 'zod';
import { emptyToUndefined, httpUrl, objectId } from './common.js';

// Campo trampa: invisible para personas (oculto también al lector de pantalla);
// los bots que completan todo lo llenan y el envío se descarta.
const honeypot = z.string().max(200).optional();

export const applicationInput = z.object({
  name: z.string({ error: 'Escribí tu nombre' }).trim().min(1, 'Escribí tu nombre').max(120),
  email: z
    .string({ error: 'Escribí tu correo electrónico' })
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: 'Escribí un correo electrónico válido, por ejemplo nombre@ejemplo.com' })),
  workTitle: z.string({ error: 'Escribí el título de tu obra' }).trim().min(1, 'Escribí el título de tu obra').max(200),
  text: z.string().trim().max(30000, 'El texto admite hasta 30.000 caracteres').default(''),
  link: emptyToUndefined(httpUrl.optional()),
  message: z.string().trim().max(2000, 'El mensaje admite hasta 2000 caracteres').default(''),
  consent: z.literal(true, { error: 'Para postularte tenés que aceptar las bases y el uso de tus datos' }),
  website: honeypot,
}).refine((data) => Boolean(data.text?.trim?.() || data.link), {
  path: ['text'],
  message: 'Pegá tu texto o compartí un enlace a él',
  // Se evalúa aunque haya otros errores: la persona ve todos los problemas de una vez.
  when: () => true,
});

export const idParams = z.object({ id: objectId });

export const callSlugParams = z.object({ slug: z.string().max(120) });
