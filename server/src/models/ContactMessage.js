import mongoose from 'mongoose';
import { toJSONOptions } from './shared.js';

/**
 * Mensajes del formulario de contacto. Además de enviarse por correo al
 * equipo, quedan guardados: si el correo falla, no se pierden (se leen en el panel).
 */
const contactMessageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    message: { type: String, required: true, trim: true, maxlength: 5000 },
    // sent: llegó al correo · failed: el envío falló · skipped: no hay servicio de correo configurado.
    emailStatus: { type: String, enum: ['sent', 'failed', 'skipped'], default: 'skipped' },
  },
  { timestamps: true, toJSON: toJSONOptions },
);

export const ContactMessage = mongoose.model('ContactMessage', contactMessageSchema);
