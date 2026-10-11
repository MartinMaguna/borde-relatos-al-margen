import { Router } from 'express';
import multer from 'multer';
import { Image } from '../models/Image.js';
import { HttpError } from '../middleware/errors.js';
import { validate } from '../middleware/validate.js';
import { idParams } from '../validators/posts.js';
import { sendOk } from '../utils/respond.js';

export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

/**
 * Tipo real del archivo según sus primeros bytes ("firma"), sin confiar en el
 * nombre ni en el tipo que declara el navegador. No se acepta SVG: puede
 * contener scripts.
 */
function detectImageType(buffer) {
  const b = buffer;
  if (b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (b.subarray(0, 4).toString('ascii') === 'GIF8') return 'image/gif';
  if (b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  if (b.subarray(4, 8).toString('ascii') === 'ftyp' && /^avi[fs]$/.test(b.subarray(8, 12).toString('ascii'))) return 'image/avif';
  return null;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
}).single('imagen');

/** multer con errores traducidos al formato de la API. */
function receiveFile(req, res, next) {
  upload(req, res, (err) => {
    if (err?.code === 'LIMIT_FILE_SIZE') {
      return next(
        new HttpError(413, 'La imagen pesa más de 3 MB. Probá con una versión más liviana.', {
          code: 'IMAGE_TOO_LARGE',
          details: [{ field: 'imagen', message: 'La imagen pesa más de 3 MB.' }],
        }),
      );
    }
    if (err) return next(new HttpError(400, 'No se pudo recibir el archivo', { code: 'UPLOAD_ERROR' }));
    next();
  });
}

// POST /api/admin/images (campo "imagen") — montado detrás de requireAuth
export const adminImagesRouter = Router();

adminImagesRouter.post('/', receiveFile, async (req, res) => {
  if (!req.file) {
    throw new HttpError(400, 'Elegí una imagen para subir', {
      code: 'VALIDATION_ERROR',
      details: [{ field: 'imagen', message: 'Elegí una imagen para subir.' }],
    });
  }
  const contentType = detectImageType(req.file.buffer);
  if (!contentType) {
    throw new HttpError(400, 'El archivo no es una imagen válida', {
      code: 'VALIDATION_ERROR',
      details: [{ field: 'imagen', message: 'El archivo tiene que ser una imagen JPG, PNG, WebP, GIF o AVIF.' }],
    });
  }

  const image = await Image.create({
    data: req.file.buffer,
    contentType,
    size: req.file.size,
    originalName: req.file.originalname?.slice(0, 200),
    createdBy: req.user.id,
  });
  sendOk(res, { id: image.id, url: image.url, size: image.size, contentType }, { status: 201 });
});

// GET /api/images/:id — público
export const publicImagesRouter = Router();

publicImagesRouter.get('/:id', validate({ params: idParams }), async (req, res) => {
  const image = await Image.findById(req.valid.params.id).select('+data contentType size');
  if (!image) throw new HttpError(404, 'Imagen no encontrada', { code: 'NOT_FOUND' });

  res.set({
    'Content-Type': image.contentType,
    'Content-Length': String(image.size),
    // Cada imagen tiene una URL única que nunca cambia de contenido.
    'Cache-Control': 'public, max-age=31536000, immutable',
  });
  res.send(image.data);
});
