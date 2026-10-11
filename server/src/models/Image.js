import mongoose from 'mongoose';
import { toJSONOptions } from './shared.js';

/**
 * Imágenes subidas desde el panel, guardadas en MongoDB.
 * Railway no tiene disco persistente (se borra en cada deploy), así que los
 * archivos no pueden quedar en el servidor. El cliente las reduce antes de
 * subirlas, por eso cada una ocupa poco.
 */
const imageSchema = new mongoose.Schema(
  {
    // select: false → los listados nunca cargan los bytes por accidente.
    data: { type: Buffer, required: true, select: false },
    contentType: { type: String, required: true },
    size: { type: Number, required: true },
    originalName: { type: String, trim: true, maxlength: 200 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, toJSON: toJSONOptions },
);

/** URL pública (relativa: pasa por el mismo origen que el sitio). */
imageSchema.virtual('url').get(function () {
  return `/api/images/${this.id}`;
});

export const Image = mongoose.model('Image', imageSchema);

/** "/api/images/<id>" → id, o null si la URL no es de una imagen subida. */
export function uploadedImageId(url) {
  const match = /^\/api\/images\/([a-f\d]{24})$/i.exec(url ?? '');
  return match ? match[1] : null;
}
