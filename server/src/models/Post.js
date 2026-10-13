import mongoose from 'mongoose';
import { CATEGORIES, POST_STATUS } from '../constants.js';
import { renderMarkdown } from '../utils/markdown.js';
import { youTubeId } from '../utils/youtube.js';

/** Minutos de lectura: palabras / 200, mínimo 1. */
export function readingMinutes(markdown = '') {
  const words = markdown.replace(/[#>*_~`[\]()-]/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
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

// Solo cuentos: capítulos, cada uno con su título y su texto (Markdown y HTML sanitizado).
const chapterSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, required: true },
    bodyHtml: { type: String, default: '' },
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
    // Markdown original, para editar. En un cuento con capítulos puede quedar vacío (o ser la introducción).
    body: {
      type: String,
      default: '',
      required: [
        function () { return !(this.category === 'cuentos' && this.chapters?.length); },
        'El texto es obligatorio',
      ],
    },
    bodyHtml: { type: String, default: '' }, // HTML sanitizado, para leer
    chapters: { type: [chapterSchema], default: [] },
    image: { type: imageSchema, default: null },
    audio: { type: audioSchema, default: null },
    // Versión en lengua de señas: video de YouTube (guardado en forma canónica).
    signVideoUrl: { type: String, trim: true, default: null },
    // Minutos de lectura estimados (≈200 palabras por minuto), calculados al guardar.
    readingMinutes: { type: Number, default: null },
    // Solo convocatorias: si se reciben postulaciones con el formulario del sitio.
    acceptsApplications: { type: Boolean, default: false },
    status: { type: String, enum: POST_STATUS, default: 'draft' },
    publishedAt: { type: Date, default: null },
    // Solo convocatorias. Apertura opcional (antes de esa fecha, "Próximamente").
    opensAt: { type: Date, default: null },
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
  const now = Date.now();
  if (this.opensAt && this.opensAt.getTime() > now) return 'proxima';
  return this.deadline.getTime() >= now ? 'abierta' : 'cerrada';
});

/** Id del video de YouTube, para que el sitio lo inserte sin tener que interpretar la URL. */
postSchema.virtual('signVideoId').get(function () {
  return this.signVideoUrl ? youTubeId(this.signVideoUrl) : null;
});

postSchema.pre('validate', function () {
  if (this.category !== 'cuentos') this.chapters = [];
  if (this.isModified('body') || this.isModified('chapters') || this.readingMinutes == null) {
    this.bodyHtml = this.body ? renderMarkdown(this.body) : '';
    for (const chapter of this.chapters) chapter.bodyHtml = renderMarkdown(chapter.body);
    this.readingMinutes = readingMinutes([this.body, ...this.chapters.map((c) => c.body)].join(' '));
  }
  // La primera vez que se publica, registramos la fecha. Si vuelve a borrador, se conserva.
  if (this.status === 'published' && !this.publishedAt) this.publishedAt = new Date();
  if (this.category !== 'convocatorias') {
    this.deadline = null;
    this.opensAt = null;
    this.basesUrl = null;
    this.acceptsApplications = false;
  }
});

export const Post = mongoose.model('Post', postSchema);
