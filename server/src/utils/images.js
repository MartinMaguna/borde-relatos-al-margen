import { Image, uploadedImageId } from '../models/Image.js';
import { Post } from '../models/Post.js';
import { Supporter } from '../models/Supporter.js';

/**
 * Borra una imagen subida que dejó de usarse (se cambió, o se eliminó la
 * publicación o el logo), salvo que otra publicación o logo la siga usando.
 * Las imágenes externas (http…) no se tocan.
 */
export async function deleteImageIfUnused(url) {
  const id = uploadedImageId(url);
  if (!id) return;
  if (await Post.exists({ 'image.url': url })) return;
  if (await Supporter.exists({ logoUrl: url })) return;
  await Image.deleteOne({ _id: id });
}
