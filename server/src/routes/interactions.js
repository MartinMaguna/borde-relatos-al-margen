import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { Post } from '../models/Post.js';
import { Application } from '../models/Application.js';
import { HttpError } from '../middleware/errors.js';
import { validate } from '../middleware/validate.js';
import { applicationInputFor, callSlugParams, idParams } from '../validators/interactions.js';
import { CORE_KEYS, questionsOf, resolveApplicationForm } from '../utils/applicationForm.js';
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
    validate({ params: callSlugParams }),
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
      // El formulario depende de cómo lo armó el equipo en esta convocatoria.
      const result = applicationInputFor(post).safeParse(req.body ?? {});
      if (!result.success) {
        const details = result.error.issues.map((i) => ({ field: i.path.join('.') || 'body', message: i.message }));
        throw new HttpError(400, 'Hay datos inválidos. Revisá los campos marcados.', { code: 'VALIDATION_ERROR', details });
      }
      const { website, answers } = result.data;
      if (!website) {
        const questions = questionsOf(resolveApplicationForm(post.applicationForm));
        await Application.create({
          post: post.id,
          name: answers.name,
          contact: answers.contact,
          workTitle: answers.workTitle ?? '',
          consent: true,
          // Se guarda también la pregunta: si después se edita el formulario, la respuesta conserva su contexto.
          answers: questions.filter((q) => !CORE_KEYS.includes(q.key)).map((q) => ({ key: q.key, label: q.label, answer: answers[q.key] ?? '' })),
        });
      }
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
  const post = await Post.findById(req.valid.params.id).select('slug applicationForm');
  if (!post) throw new HttpError(404, 'No encontramos esa publicación', { code: 'NOT_FOUND' });
  const applications = await Application.find({ post: post.id }).sort({ createdAt: 1 });
  // Una columna por pregunta: las del formulario actual y las de respuestas a preguntas que ya se quitaron.
  const questions = new Map(
    questionsOf(resolveApplicationForm(post.applicationForm))
      .filter((q) => !CORE_KEYS.includes(q.key))
      .map((q) => [q.key, q.label]),
  );
  for (const a of applications) for (const ans of a.answers ?? []) if (!questions.has(ans.key)) questions.set(ans.key, ans.label);
  // Postulaciones del formato anterior: sus campos fijos pasan a columnas.
  const legacy = (a, key) => ({ workTitle: a.workTitle, text: a.text, link: a.link, message: a.message })[key];
  const header = ['Fecha', 'Nombre', 'Contacto', ...questions.values()];
  const rows = applications.map((a) => {
    const byKey = new Map((a.answers ?? []).map((ans) => [ans.key, ans.answer]));
    return [a.createdAt.toISOString(), a.name, a.contact || a.email, ...[...questions.keys()].map((k) => byKey.get(k) ?? legacy(a, k) ?? '')]
      .map(csvCell)
      .join(',');
  });
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
