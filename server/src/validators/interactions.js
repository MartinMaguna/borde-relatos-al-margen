import { z } from 'zod';
import { emptyToUndefined, httpUrl, objectId } from './common.js';
import { resolveApplicationForm } from '../utils/applicationForm.js';

// Campo trampa: invisible para personas (oculto también al lector de pantalla);
// los bots que completan todo lo llenan y el envío se descarta.
const honeypot = z.string().max(200).optional();

/** Un campo según su modo: obligatorio, opcional o no pedido (se ignora lo que llegue). */
function byMode(mode, schema, requiredMessage) {
  if (mode === 'off') return z.unknown().optional().transform(() => undefined);
  if (mode === 'required') return z.preprocess((v) => (v == null ? '' : v), schema.min(1, requiredMessage));
  return schema.default('');
}

/**
 * Esquema de una postulación según cómo armó el formulario el equipo
 * (post.applicationForm). Nombre, correo y consentimiento van siempre.
 */
export function applicationInputFor(post) {
  const form = resolveApplicationForm(post.applicationForm);
  const { fields } = form;
  const linkSchema =
    fields.link === 'off'
      ? z.unknown().optional().transform(() => undefined)
      : fields.link === 'required'
        ? z.preprocess((v) => (typeof v === 'string' ? v.trim() : v), httpUrl)
        : emptyToUndefined(httpUrl.optional());

  const answers = {};
  for (const q of form.questions) {
    const max = q.type === 'long' ? 5000 : 300;
    const base = z.string({ error: 'Respondé esta pregunta' }).trim().max(max, `Hasta ${max} caracteres`);
    answers[q.key] = q.required ? z.preprocess((v) => (v == null ? '' : v), base.min(1, 'Respondé esta pregunta')) : base.default('');
  }

  return z
    .object({
      name: z.string({ error: 'Escribí tu nombre' }).trim().min(1, 'Escribí tu nombre').max(120),
      email: z
        .string({ error: 'Escribí tu correo electrónico' })
        .trim()
        .toLowerCase()
        .pipe(z.email({ error: 'Escribí un correo electrónico válido, por ejemplo nombre@ejemplo.com' })),
      workTitle: byMode(fields.workTitle, z.string().trim().max(200), 'Escribí el título de tu obra'),
      text: byMode(fields.text, z.string().trim().max(30000, 'El texto admite hasta 30.000 caracteres'), 'Pegá tu texto'),
      link: linkSchema,
      message: byMode(fields.message, z.string().trim().max(2000, 'El mensaje admite hasta 2000 caracteres'), 'Escribí tu mensaje'),
      // preprocess (no default): así se validan las preguntas aunque no llegue ninguna respuesta.
      answers: z.preprocess((v) => v ?? {}, z.object(answers)),
      consent: z.literal(true, { error: 'Para postularte tenés que aceptar las bases y el uso de tus datos' }),
      website: honeypot,
    })
    .refine((data) => !form.needsTextOrLink || Boolean(data.text?.trim?.() || data.link), {
      path: ['text'],
      message: 'Pegá tu texto o compartí un enlace a él',
      // Se evalúa aunque haya otros errores: la persona ve todos los problemas de una vez.
      when: () => true,
    });
}

export const idParams = z.object({ id: objectId });

export const callSlugParams = z.object({ slug: z.string().max(120) });
