import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { AUTH_COOKIE } from '../constants.js';
import { User } from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/errors.js';
import { validate } from '../middleware/validate.js';
import { loginSchema } from '../validators/auth.js';
import { sendOk } from '../utils/respond.js';

// Hash de relleno: si el email no existe igual comparamos contra algo,
// así el tiempo de respuesta no revela qué cuentas existen.
const DUMMY_HASH = bcrypt.hashSync('borde-dummy-password', 12);

/**
 * Cookie de sesión:
 * - httpOnly: JavaScript del navegador no puede leerla (mitiga XSS).
 * - secure: solo viaja por HTTPS. Se activa en producción y también siempre que
 *   el pedido llegue por HTTPS (req.secure, vía el proxy), aunque falte NODE_ENV.
 * - sameSite strict: el navegador no la envía en requests iniciados desde otros
 *   sitios (mitiga CSRF). Funciona porque el cliente y la API comparten origen
 *   (proxy de Vite en local, rewrite de Vercel en producción).
 */
function cookieOptions(req) {
  return {
    httpOnly: true,
    secure: env.isProduction || req.secure,
    sameSite: 'strict',
    path: '/',
    maxAge: env.SESSION_TTL_HOURS * 60 * 60 * 1000,
  };
}

export function createAuthRouter() {
  const router = Router();

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: env.LOGIN_RATE_LIMIT,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, _res, next) =>
      next(new HttpError(429, 'Demasiados intentos de inicio de sesión. Esperá 15 minutos y volvé a intentar.', { code: 'RATE_LIMITED' })),
  });

  router.post('/login', loginLimiter, validate({ body: loginSchema }), async (req, res) => {
    const { email, password } = req.valid.body;
    const user = await User.findOne({ email }).select('+passwordHash');
    const passwordOk = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

    if (!user || !passwordOk) {
      // Mensaje genérico a propósito: no decimos si falló el email o la contraseña.
      throw new HttpError(401, 'El correo o la contraseña no son correctos', { code: 'INVALID_CREDENTIALS' });
    }

    const token = jwt.sign({ sub: user.id, role: user.role }, env.JWT_SECRET, {
      algorithm: 'HS256',
      expiresIn: `${env.SESSION_TTL_HOURS}h`,
    });
    res.cookie(AUTH_COOKIE, token, cookieOptions(req));
    sendOk(res, { user });
  });

  router.post('/logout', (req, res) => {
    const { maxAge: _maxAge, ...options } = cookieOptions(req);
    res.clearCookie(AUTH_COOKIE, options);
    sendOk(res, { loggedOut: true });
  });

  router.get('/me', requireAuth, (req, res) => {
    sendOk(res, { user: req.user });
  });

  return router;
}
