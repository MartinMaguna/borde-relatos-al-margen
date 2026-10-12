import { Router } from 'express';
import { Supporter, SUPPORTER_ROLES } from '../models/Supporter.js';
import { HttpError } from '../middleware/errors.js';
import { validate } from '../middleware/validate.js';
import { idParams } from '../validators/interactions.js';
import { supporterInput } from '../validators/site.js';
import { deleteImageIfUnused } from '../utils/images.js';
import { sendOk } from '../utils/respond.js';

/** Por grupo (en el orden de SUPPORTER_ROLES) y, dentro de cada uno, en el orden en que se cargaron. */
async function listSupporters() {
  const all = await Supporter.find().sort({ createdAt: 1 });
  return all.sort((a, b) => SUPPORTER_ROLES.indexOf(a.role) - SUPPORTER_ROLES.indexOf(b.role));
}

// GET /api/supporters (público)
export const publicSupportersRouter = Router();

publicSupportersRouter.get('/', async (_req, res) => {
  sendOk(res, await listSupporters());
});

// /api/admin/supporters (editor)
export const adminSupportersRouter = Router();

adminSupportersRouter.get('/', async (_req, res) => {
  sendOk(res, await listSupporters());
});

adminSupportersRouter.post('/', validate({ body: supporterInput }), async (req, res) => {
  const { link, ...data } = req.valid.body;
  const supporter = await Supporter.create({ ...data, link: link ?? null });
  sendOk(res, supporter, { status: 201 });
});

async function findOr404(id) {
  const supporter = await Supporter.findById(id);
  if (!supporter) throw new HttpError(404, 'No encontramos ese logo', { code: 'NOT_FOUND' });
  return supporter;
}

adminSupportersRouter.put('/:id', validate({ params: idParams, body: supporterInput }), async (req, res) => {
  const supporter = await findOr404(req.valid.params.id);
  const previousLogo = supporter.logoUrl;
  const { link, ...data } = req.valid.body;
  supporter.set({ ...data, link: link ?? null });
  await supporter.save();
  if (previousLogo !== supporter.logoUrl) await deleteImageIfUnused(previousLogo);
  sendOk(res, supporter);
});

adminSupportersRouter.delete('/:id', validate({ params: idParams }), async (req, res) => {
  const supporter = await findOr404(req.valid.params.id);
  await supporter.deleteOne();
  await deleteImageIfUnused(supporter.logoUrl);
  sendOk(res, { id: supporter.id });
});
