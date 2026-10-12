import { env } from '../config/env.js';

/** ¿Hay un servicio de correo configurado? (Resend: RESEND_API_KEY + CONTACT_TO_EMAIL). */
export const mailEnabled = () => Boolean(env.RESEND_API_KEY && env.CONTACT_TO_EMAIL);

/**
 * Reenvía un mensaje del formulario de contacto al correo del equipo, con
 * Resend (https://resend.com), por su API HTTP: sin dependencias extra.
 * El correo del equipo nunca se expone en el sitio: solo vive en las
 * variables de entorno del servidor. "Responder" le contesta a quien escribió.
 * Devuelve 'sent' | 'failed' | 'skipped'; nunca lanza.
 */
export async function sendContactEmail({ name, email, message }) {
  if (!mailEnabled()) return 'skipped';
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10_000),
      body: JSON.stringify({
        from: env.CONTACT_FROM_EMAIL,
        to: [env.CONTACT_TO_EMAIL],
        reply_to: email,
        // Solo texto plano: nada de lo que escribió la persona se interpreta como HTML.
        subject: `Borde · Mensaje de ${name.replace(/[\r\n]+/g, ' ').slice(0, 80)}`,
        text: `${message}\n\n—\n${name} <${email}>\nEnviado desde el formulario de contacto de Borde. Respondé este correo para contestarle.`,
      }),
    });
    if (!res.ok) {
      console.error(`✉️  Resend respondió ${res.status}: ${(await res.text().catch(() => '')).slice(0, 300)}`);
      return 'failed';
    }
    return 'sent';
  } catch (err) {
    console.error(`✉️  No se pudo enviar el correo de contacto: ${err.message}`);
    return 'failed';
  }
}
