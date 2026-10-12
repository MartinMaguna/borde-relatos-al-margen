import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { ContactMessage } from '../models/ContactMessage.js';
import { HttpError } from '../middleware/errors.js';
import { validate } from '../middleware/validate.js';
import { idParams } from '../validators/interactions.js';
import { contactInput, contactListQuery } from '../validators/site.js';
import { sendContactEmail } from '../utils/mailer.js';
import { paginationMeta, sendOk } from '../utils/respond.js';

/**
 * POST /api/contact — formulario de contacto. Una instancia por app (límite
 * de envíos aislado en los tests).
 */
export function createContactRouter() {
  const router = Router();
  const limit = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: env.CONTACT_RATE_LIMIT,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, _res, next) =>
      next(new HttpError(429, 'Enviaste varios mensajes seguidos. Esperá un rato y volvé a intentar.', { code: 'RATE_LIMITED' })),
  });

  router.post('/', limit, validate({ body: contactInput }), async (req, res) => {
    const { website, ...data } = req.valid.body;
    // Campo trampa completo: se responde como si nada para no darle pistas al bot.
    if (!website) {
      const saved = await ContactMessage.create(data);
      saved.emailStatus = await sendContactEmail(data);
      await saved.save();
    }
    sendOk(res, { received: true }, { status: 201 });
  });

  return router;
}

// /api/admin/messages (editor): los mensajes quedan guardados aunque el correo falle.
export const adminMessagesRouter = Router();

adminMessagesRouter.get('/', validate({ query: contactListQuery }), async (req, res) => {
  const { page, limit } = req.valid.query;
  const [items, total] = await Promise.all([
    ContactMessage.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    ContactMessage.countDocuments(),
  ]);
  sendOk(res, items, { meta: paginationMeta({ page, limit, total }) });
});

adminMessagesRouter.delete('/:id', validate({ params: idParams }), async (req, res) => {
  const message = await ContactMessage.findByIdAndDelete(req.valid.params.id);
  if (!message) throw new HttpError(404, 'No encontramos ese mensaje', { code: 'NOT_FOUND' });
  sendOk(res, { id: message.id });
});
