import { z } from 'zod';
import { httpUrl, objectId } from './common.js';
import { questionsOf, resolveApplicationForm } from '../utils/applicationForm.js';

// Campo trampa: invisible para personas (oculto también al lector de pantalla);
// los bots que completan todo lo llenan y el envío se descarta.
const honeypot = z.string().max(200).optional();

const LIMITS = { short: 300, long: 30000, number: 10, email: 254, link: 2000, select: 200, choice: 200 };

/** Esquema de la respuesta a una pregunta, según su tipo. Vacía y opcional → ''. */
function answerSchema(item) {
  const requiredMessage = item.type === 'select' || item.type === 'choice' ? 'Elegí una opción' : 'Completá este campo';
  const max = LIMITS[item.type] ?? 300;
  let check;
  if (item.type === 'number') check = z.string().regex(/^\d{1,3}$/, 'Escribí un número, por ejemplo 27');
  else if (item.type === 'email') check = z.email({ error: 'Escribí un correo electrónico válido, por ejemplo nombre@ejemplo.com' });
  else if (item.type === 'link') check = httpUrl;
  else if (item.type === 'select' || item.type === 'choice') check = z.enum(item.options.length ? item.options : [''], { error: 'Elegí una de las opciones' });
  else check = z.string().max(max, `Hasta ${max} caracteres`);

  return z.preprocess(
    (v) => (v == null ? '' : typeof v === 'string' ? v.trim() : v),
    z.string({ error: 'Completá este campo' }).max(Math.max(max, 2000)).superRefine((value, ctx) => {
      if (!value) {
        if (item.required) ctx.addIssue({ code: 'custom', message: requiredMessage });
        return;
      }
      const result = check.safeParse(value);
      if (!result.success) ctx.addIssue({ code: 'custom', message: result.error.issues[0].message });
    }),
  );
}

/**
 * Esquema de una postulación según el formulario de la convocatoria.
 * Las respuestas llegan en `answers` ({ clave: valor }); "name" y "contact"
 * van ahí también, como cualquier otra pregunta.
 */
export function applicationInputFor(post) {
  const form = resolveApplicationForm(post.applicationForm);
  const answers = Object.fromEntries(questionsOf(form).map((item) => [item.key, answerSchema(item)]));
  return z.object({
    answers: z.preprocess((v) => v ?? {}, z.object(answers)),
    consent: z.literal(true, { error: 'Para postularte tenés que marcar la confirmación' }),
    website: honeypot,
  });
}

export const idParams = z.object({ id: objectId });

export const callSlugParams = z.object({ slug: z.string().max(120) });
