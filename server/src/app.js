import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { env } from './config/env.js';
import healthRouter from './routes/health.js';
import { notFound, errorHandler } from './middleware/errors.js';

/**
 * Crea la app de Express sin levantar el servidor,
 * para poder testearla con supertest (Fase 2).
 */
export function createApp() {
  const app = express();

  // Railway (y Vercel al hacer el rewrite) están detrás de un proxy:
  // necesario para que req.ip (rate limiting) y las cookies Secure funcionen bien.
  app.set('trust proxy', 1);

  app.use(helmet());
  // En producción las peticiones llegan same-origin vía rewrite de Vercel;
  // CORS queda para el desarrollo local cuando no se usa el proxy de Vite.
  app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  if (env.NODE_ENV !== 'test') app.use(morgan(env.isProduction ? 'combined' : 'dev'));

  app.use('/api/health', healthRouter);
  // Fase 2: /api/auth, /api/posts, /api/pages

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
