import { Router } from 'express';
import { dbStatus } from '../config/db.js';

const router = Router();

// Usado como healthcheck de Railway y para verificar el rewrite de Vercel.
router.get('/', (_req, res) => {
  res.json({ ok: true, data: { status: 'ok', db: dbStatus(), uptime: Math.round(process.uptime()) } });
});

export default router;
