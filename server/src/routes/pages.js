import { Router } from 'express';
import { Page } from '../models/Page.js';
import { HttpError } from '../middleware/errors.js';
import { validate } from '../middleware/validate.js';
import { pageInputSchema, pageParams } from '../validators/pages.js';
import { sendOk } from '../utils/respond.js';

// GET /api/pages/acerca (público)
export const publicPagesRouter = Router();

publicPagesRouter.get('/:slug', validate({ params: pageParams }), async (req, res) => {
  const page = await Page.findOne({ slug: req.valid.params.slug }).select('-body -updatedBy');
  if (!page) throw new HttpError(404, 'Esta página todavía no tiene contenido', { code: 'NOT_FOUND' });
  sendOk(res, page);
});

// GET y PUT /api/admin/pages/acerca (editor)
export const adminPagesRouter = Router();

adminPagesRouter.get('/:slug', validate({ params: pageParams }), async (req, res) => {
  const page = await Page.findOne({ slug: req.valid.params.slug });
  // Si todavía no existe, devolvemos una página vacía para que el formulario arranque en blanco.
  sendOk(res, page ?? { slug: req.valid.params.slug, title: '', body: '' });
});

// Upsert: crea la página si no existe, si no la actualiza.
adminPagesRouter.put('/:slug', validate({ params: pageParams, body: pageInputSchema }), async (req, res) => {
  const { slug } = req.valid.params;
  const page = (await Page.findOne({ slug })) ?? new Page({ slug });
  page.set({ ...req.valid.body, updatedBy: req.user.id });
  await page.save();
  sendOk(res, page);
});
