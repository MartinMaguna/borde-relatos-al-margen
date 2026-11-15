import { Router } from 'express';
import { dbStatus } from '../config/db.js';

const router = Router();

// Para verificar que la API (función de Vercel) responde y llega a MongoDB.
router.get('/', (_req, res) => {
  res.json({ ok: true, data: { status: 'ok', db: dbStatus(), uptime: Math.round(process.uptime()) } });
});

export default router;
