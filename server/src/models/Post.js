import mongoose from 'mongoose';
import { CATEGORIES, POST_STATUS } from '../constants.js';
import { renderMarkdown } from '../utils/markdown.js';
import { youTubeId } from '../utils/youtube.js';
import { toJSONOptions } from './shared.js';

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true },
    // Obligatorio: sin texto alternativo, la imagen no existe para un lector de pantalla.
    alt: { type: String, required: true, trim: true, maxlength: 300 },
  },
  { _id: false },
);

// Audio alojado en otro sitio: solo se guarda el enlace directo al archivo.
const audioSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true },
    // Qué es el audio, p. ej. "Lectura de la autora". Se usa en el reproductor.
    label: { type: String, trim: true, maxlength: 120, default: 'Lectura en voz alta' },
  },
  { _id: false },
);

const postSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    category: { type: String, required: true, enum: CATEGORIES },
    // Autor/a del texto publicado (no necesariamente quien lo carga en el panel).
    author: { type: String, required: true, trim: true, maxlength: 120 },
    summary: { type: String, trim: true, maxlength: 500, default: '' },
    body: { type: String, required: true }, // Markdown original, para editar
    bodyHtml: { type: String, default: '' }, // HTML sanitizado, para leer
    image: { type: imageSchema, default: null },
    audio: { type: audioSchema, default: null },
    // Versión en lengua de señas: video de YouTube (guardado en forma canónica).
    signVideoUrl: { type: String, trim: true, default: null },
    status: { type: String, enum: POST_STATUS, default: 'draft' },
    publishedAt: { type: Date, default: null },
    // Solo convocatorias
    deadline: {
      type: Date,
      default: null,
      required: [
        function () { return this.category === 'convocatorias'; },
        'La fecha límite es obligatoria en convocatorias',
      ],
    },
    basesUrl: { type: String, trim: true, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, toJSON: toJSONOptions },
);

// Listados públicos: por categoría y estado, ordenados por fecha de publicación.
postSchema.index({ category: 1, status: 1, publishedAt: -1 });

/** Estado de una convocatoria, calculado en el momento (no se guarda, así nunca queda desactualizado). */
postSchema.virtual('callStatus').get(function () {
  if (this.category !== 'convocatorias' || !this.deadline) return undefined;
  return this.deadline.getTime() >= Date.now() ? 'abierta' : 'cerrada';
});

/** Id del video de YouTube, para que el sitio lo inserte sin tener que interpretar la URL. */
postSchema.virtual('signVideoId').get(function () {
  return this.signVideoUrl ? youTubeId(this.signVideoUrl) : null;
});

postSchema.pre('validate', function () {
  if (this.isModified('body')) this.bodyHtml = renderMarkdown(this.body);
  // La primera vez que se publica, registramos la fecha. Si vuelve a borrador, se conserva.
  if (this.status === 'published' && !this.publishedAt) this.publishedAt = new Date();
  if (this.category !== 'convocatorias') {
    this.deadline = null;
    this.basesUrl = null;
  }
});

export const Post = mongoose.model('Post', postSchema);
