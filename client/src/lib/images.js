export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
export const MAX_UPLOAD_BYTES = 3 * 1024 * 1024; // mismo límite que la API
const MAX_SIDE = 1600; // px: suficiente para leer en pantalla, liviano para guardar

/**
 * Achica una foto antes de subirla (lado mayor 1600 px, WebP o JPEG).
 * Las fotos de celular pesan 3–10 MB; así quedan en unos cientos de KB, entran
 * en el límite y no llenan la base. Los GIF no se tocan (perderían la animación).
 * Si el navegador no puede procesarla, se sube el archivo original.
 */
export async function prepareImage(file) {
  if (file.type === 'image/gif' || typeof createImageBitmap !== 'function') return file;

  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size <= 500 * 1024) {
    bitmap.close?.();
    return file; // ya es chica: se sube tal cual
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();

  const toBlob = (type) => new Promise((resolve) => canvas.toBlob(resolve, type, 0.85));
  let blob = await toBlob('image/webp');
  if (!blob || blob.type !== 'image/webp') blob = await toBlob('image/jpeg');
  if (!blob || blob.size >= file.size) return file;

  const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
  return new File([blob], file.name.replace(/\.[^.]+$/, '') + `.${ext}`, { type: blob.type });
}

export function isUploadedImage(url) {
  return /^\/api\/images\/[a-f\d]{24}$/i.test(url ?? '');
}

export function formatBytes(bytes) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB` : `${Math.round(bytes / 1024)} KB`;
}
