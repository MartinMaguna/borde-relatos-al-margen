import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User } from './models/User.js';
import { Page } from './models/Page.js';
import { Post } from './models/Post.js';

export const DEFAULT_ABOUT = {
  title: 'Acerca de Borde',
  body: 'Borde Relatos al margen es un espacio de lectura para voces que escriben desde los márgenes.\n\nEste texto se puede editar desde el panel.',
};

const editorEnv = z.object({
  SEED_EDITOR_NAME: z.string().trim().min(1).default('Editor/a'),
  SEED_EDITOR_EMAIL: z.string().trim().toLowerCase().pipe(z.email()),
  SEED_EDITOR_PASSWORD: z.string().min(12),
});

/**
 * Datos mínimos para que el sitio funcione, al arrancar la API:
 *
 * 1. Si la base NO tiene ningún usuario y están definidas las variables
 *    SEED_EDITOR_*, crea el primer editor. Así un deploy nuevo queda usable sin
 *    tener que correr el seed a mano. Nunca toca usuarios existentes (para
 *    cambiar una contraseña, usar `npm run seed`).
 * 2. Si falta la página "Acerca", la crea con un texto inicial.
 *
 * Es idempotente y no bloquea el arranque: si algo falla, solo lo registra.
 */
export async function ensureInitialData({ env = process.env, log = console } = {}) {
  let editorId;

  if (!(await User.exists({}))) {
    const parsed = editorEnv.safeParse(env);
    if (!parsed.success) {
      log.warn(
        '⚠️  No hay ningún usuario editor. Definí SEED_EDITOR_EMAIL y SEED_EDITOR_PASSWORD (12+ caracteres) ' +
          'y reiniciá, o corré `npm run seed`.',
      );
    } else {
      const { SEED_EDITOR_NAME, SEED_EDITOR_EMAIL, SEED_EDITOR_PASSWORD } = parsed.data;
      const editor = await User.create({
        name: SEED_EDITOR_NAME,
        email: SEED_EDITOR_EMAIL,
        passwordHash: await bcrypt.hash(SEED_EDITOR_PASSWORD, 12),
        role: 'editor',
      });
      editorId = editor.id;
      log.info(`👤 Primer editor creado: ${editor.email}. Ya podés borrar las variables SEED_* del servidor.`);
    }
  }

  // Publicaciones anteriores al tiempo de lectura: se calcula al guardarlas otra vez.
  for (const post of await Post.find({ readingMinutes: null })) {
    await post.save();
  }

  if (!(await Page.exists({ slug: 'acerca' }))) {
    await Page.create({ slug: 'acerca', ...DEFAULT_ABOUT, updatedBy: editorId });
    log.info('📄 Página "Acerca" creada con el texto inicial');
  }
}
