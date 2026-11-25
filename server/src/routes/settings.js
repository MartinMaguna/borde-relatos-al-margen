import { Router } from 'express';
import { z } from 'zod';
import { DEFAULT_SETTINGS, SiteSettings, currentSettings } from '../models/SiteSettings.js';
import { validate } from '../middleware/validate.js';
import { sendOk } from '../utils/respond.js';

const settingsInput = z.object({
  convocatoriasEmpty: z.string().trim().max(1000, 'El texto admite hasta 1000 caracteres').default(''),
});

// GET /api/settings (público): textos del sitio editables.
export const publicSettingsRouter = Router();

publicSettingsRouter.get('/', async (_req, res) => {
  sendOk(res, await currentSettings());
});

// GET y PUT /api/admin/settings (editor). Vacío = vuelve al texto por defecto.
export const adminSettingsRouter = Router();

adminSettingsRouter.get('/', async (_req, res) => {
  const doc = await SiteSettings.findById('sitio').lean();
  sendOk(res, { convocatoriasEmpty: doc?.convocatoriasEmpty ?? '', defaults: DEFAULT_SETTINGS });
});

adminSettingsRouter.put('/', validate({ body: settingsInput }), async (req, res) => {
  await SiteSettings.updateOne({ _id: 'sitio' }, { $set: { ...req.valid.body, updatedBy: req.user.id } }, { upsert: true });
  sendOk(res, await currentSettings());
});
