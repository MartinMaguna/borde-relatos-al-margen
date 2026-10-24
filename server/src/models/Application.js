import mongoose from 'mongoose';
import { toJSONOptions } from './shared.js';

/**
 * Postulación a una convocatoria, enviada con el formulario público.
 * No se aceptan archivos: el texto se pega (o se comparte por enlace), así no
 * se ocupa espacio ni se reciben archivos potencialmente peligrosos.
 */
const applicationSchema = new mongoose.Schema(
  {
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    // Medio de contacto que dejó la persona (correo, teléfono, WhatsApp…).
    contact: { type: String, trim: true, maxlength: 300, default: '' },
    // Solo en postulaciones anteriores al formulario configurable.
    email: { type: String, trim: true, lowercase: true, maxlength: 200, default: '' },
    workTitle: { type: String, trim: true, maxlength: 200, default: '' },
    text: { type: String, trim: true, maxlength: 30000, default: '' },
    link: { type: String, trim: true, default: null },
    message: { type: String, trim: true, maxlength: 2000, default: '' },
    // Respuestas a las preguntas propias del formulario (con la pregunta, por si después cambia).
    answers: {
      type: [{ key: String, label: String, answer: { type: String, default: '' }, _id: false }],
      default: [],
    },
    consent: { type: Boolean, required: true },
  },
  { timestamps: true, toJSON: toJSONOptions },
);

export const Application = mongoose.model('Application', applicationSchema);
