import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { Post } from '../models/Post.js';
import { Application } from '../models/Application.js';
import { HttpError } from '../middleware/errors.js';
import { validate } from '../middleware/validate.js';
import { applicationInput, callSlugParams, idParams } from '../validators/interactions.js';
import { sendOk } from '../utils/respond.js';

/** Límite de envíos públicos por IP (postulaciones). */
function limiter(limit, windowMinutes, message) {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, _res, next) => next(new HttpError(429, message, { code: 'RATE_LIMITED' })),
  });
}

async function publishedPostOr404(category, slug) {
  const post = await Post.findOne({ category, slug, status: 'published' });
  if (!post) throw new HttpError(404, 'No encontramos esa publicación', { code: 'NOT_FOUND' });
  return post;
}

/**
 * Rutas públicas: postulaciones. Se crea una instancia por app
 * (como el login) para que los límites de envío no se compartan entre tests.
 */
export function createPublicInteractionsRouter() {
  const router = Router();
  const applicationLimit = limiter(env.APPLICATION_RATE_LIMIT, 60, 'Enviaste varias postulaciones seguidas. Esperá un rato y volvé a intentar.');

  // POST /api/posts/convocatorias/:slug/applications — solo si la convocatoria acepta postulaciones y está abierta.
  router.post(
    '/convocatorias/:slug/applications',
    applicationLimit,
    validate({ params: callSlugParams, body: applicationInput }),
    async (req, res) => {
      const post = await publishedPostOr404('convocatorias', req.valid.params.slug);
      if (!post.acceptsApplications) {
        throw new HttpError(403, 'Esta convocatoria no recibe postulaciones por el sitio. Revisá sus bases.', { code: 'APPLICATIONS_CLOSED' });
      }
      if (post.callStatus === 'proxima') {
        throw new HttpError(403, 'La convocatoria todavía no abrió: las postulaciones empiezan en la fecha de apertura.', { code: 'APPLICATIONS_CLOSED' });
      }
      if (post.callStatus !== 'abierta') {
        throw new HttpError(403, 'La convocatoria ya cerró: la fecha límite pasó.', { code: 'APPLICATIONS_CLOSED' });
      }
      const { website, ...data } = req.valid.body;
      if (!website) await Application.create({ ...data, link: data.link ?? null, post: post.id });
      sendOk(res, { received: true }, { status: 201 });
    },
  );

  return router;
}

/** Rutas del panel (detrás de requireAuth). */
export const adminInteractionsRouter = Router();

// GET /api/admin/posts/:id/applications
adminInteractionsRouter.get('/posts/:id/applications', validate({ params: idParams }), async (req, res) => {
  const post = await Post.findById(req.valid.params.id).select('title slug category');
  if (!post) throw new HttpError(404, 'No encontramos esa publicación', { code: 'NOT_FOUND' });
  const applications = await Application.find({ post: post.id }).sort({ createdAt: -1 });
  sendOk(res, { post, applications });
});

/** Una celda CSV segura: entre comillas, y sin fórmulas (evita inyección al abrirla en una planilla). */
function csvCell(value) {
  let text = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

// GET /api/admin/posts/:id/applications.csv — descarga para abrir en una planilla.
adminInteractionsRouter.get('/posts/:id/applications.csv', validate({ params: idParams }), async (req, res) => {
  const post = await Post.findById(req.valid.params.id).select('slug');
  if (!post) throw new HttpError(404, 'No encontramos esa publicación', { code: 'NOT_FOUND' });
  const applications = await Application.find({ post: post.id }).sort({ createdAt: 1 });
  const header = ['Fecha', 'Nombre', 'Correo', 'Título de la obra', 'Enlace', 'Mensaje', 'Texto'];
  const rows = applications.map((a) =>
    [a.createdAt.toISOString(), a.name, a.email, a.workTitle, a.link ?? '', a.message, a.text].map(csvCell).join(','),
  );
  res.set({
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="postulaciones-${post.slug}.csv"`,
  });
  // BOM para que Excel reconozca los acentos.
  res.send('﻿' + [header.map(csvCell).join(','), ...rows].join('\r\n'));
});

adminInteractionsRouter.delete('/applications/:id', validate({ params: idParams }), async (req, res) => {
  const application = await Application.findByIdAndDelete(req.valid.params.id);
  if (!application) throw new HttpError(404, 'No encontramos esa postulación', { code: 'NOT_FOUND' });
  sendOk(res, { id: application.id });
});
