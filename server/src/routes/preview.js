import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { renderMarkdown } from '../utils/markdown.js';
import { sendOk } from '../utils/respond.js';

/**
 * POST /api/admin/preview — vista previa del texto del editor.
 * Usa exactamente la misma conversión y sanitización que al guardar, así lo que
 * se ve en la vista previa es lo que se publica. Montado detrás de requireAuth.
 */
const router = Router();

const previewSchema = z.object({
  markdown: z.string().max(100_000, 'El texto es demasiado largo para la vista previa').default(''),
});

router.post('/', validate({ body: previewSchema }), (req, res) => {
  sendOk(res, { html: renderMarkdown(req.valid.body.markdown) });
});

export default router;
