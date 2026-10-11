import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { env } from './config/env.js';
import healthRouter from './routes/health.js';
import { createAuthRouter } from './routes/auth.js';
import postsRouter from './routes/posts.js';
import adminPostsRouter from './routes/adminPosts.js';
import { adminPagesRouter, publicPagesRouter } from './routes/pages.js';
import { adminImagesRouter, publicImagesRouter } from './routes/images.js';
import previewRouter from './routes/preview.js';
import { adminInteractionsRouter, createPublicInteractionsRouter } from './routes/interactions.js';
import { requireAuth, requireRole } from './middleware/auth.js';
import { notFound, errorHandler } from './middleware/errors.js';

/**
 * Crea la app de Express sin levantar el servidor, para poder testearla
 * con supertest. Cada llamada crea su propio rate limiter (tests aislados).
 */
export function createApp() {
  const app = express();

  // En producción la API está detrás de proxies (Vercel hace el rewrite y Railway
  // tiene su propio borde): hay que indicarlo para que req.ip sea la IP real de
  // quien navega (límite de intentos de login) y las cookies Secure funcionen.
  app.set('trust proxy', env.TRUST_PROXY);

  app.use(helmet());
  // En producción las peticiones llegan same-origin vía rewrite de Vercel;
  // CORS queda para el desarrollo local cuando no se usa el proxy de Vite.
  app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  if (env.NODE_ENV !== 'test') app.use(morgan(env.isProduction ? 'combined' : 'dev'));

  // Las respuestas de la API no se cachean en el navegador ni en proxies intermedios.
  app.use('/api', (_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  // Públicas
  app.use('/api/health', healthRouter);
  app.use('/api/auth', createAuthRouter());
  app.use('/api/posts', postsRouter);
  app.use('/api/posts', createPublicInteractionsRouter());
  app.use('/api/pages', publicPagesRouter);
  app.use('/api/images', publicImagesRouter);

  // Panel del editor: todo lo que cuelga de /api/admin exige sesión y rol.
  app.use('/api/admin', requireAuth, requireRole('editor'));
  app.use('/api/admin/posts', adminPostsRouter);
  app.use('/api/admin/pages', adminPagesRouter);
  app.use('/api/admin/images', adminImagesRouter);
  app.use('/api/admin/preview', previewRouter);
  app.use('/api/admin', adminInteractionsRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
