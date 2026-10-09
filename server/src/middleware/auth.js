import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AUTH_COOKIE } from '../constants.js';
import { User } from '../models/User.js';
import { HttpError } from './errors.js';

/**
 * Exige una sesión válida: lee el JWT de la cookie httpOnly, lo verifica
 * y confirma que el usuario siga existiendo (si se borra, la sesión muere).
 */
export async function requireAuth(req, _res, next) {
  const token = req.cookies?.[AUTH_COOKIE];
  if (!token) throw new HttpError(401, 'Tenés que iniciar sesión', { code: 'UNAUTHENTICATED' });

  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    throw new HttpError(401, 'Tu sesión venció. Iniciá sesión de nuevo.', { code: 'UNAUTHENTICATED' });
  }

  const user = await User.findById(payload.sub);
  if (!user) throw new HttpError(401, 'Tenés que iniciar sesión', { code: 'UNAUTHENTICATED' });

  req.user = user;
  next();
}

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!roles.includes(req.user?.role)) {
      throw new HttpError(403, 'No tenés permiso para esta acción', { code: 'FORBIDDEN' });
    }
    next();
  };
}
