/**
 * Seed: crea (o actualiza) el usuario editor y la página "Acerca".
 *
 *   npm run seed            → editor + página Acerca (si no existe)
 *   npm run seed -- --demo  → además, publicaciones de ejemplo (solo si no hay ninguna)
 *
 * Es idempotente: se puede correr varias veces sin duplicar datos.
 * Si el editor ya existe, se actualizan su nombre y su contraseña
 * (sirve también para resetear la contraseña).
 */
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { env } from '../src/config/env.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { Page } from '../src/models/Page.js';
import { Post } from '../src/models/Post.js';
import { demoPosts } from './demo-posts.js';

const seedEnv = z
  .object({
    SEED_EDITOR_NAME: z.string().trim().min(1, 'es obligatorio'),
    SEED_EDITOR_EMAIL: z.string().trim().toLowerCase().pipe(z.email('tiene que ser un email válido')),
    SEED_EDITOR_PASSWORD: z.string().min(12, 'debe tener al menos 12 caracteres'),
  })
  .safeParse(process.env);

if (!seedEnv.success) {
  console.error('❌ Faltan variables para el seed:');
  for (const issue of seedEnv.error.issues) console.error(`   - ${issue.path.join('.')}: ${issue.message}`);
  process.exit(1);
}

const { SEED_EDITOR_NAME, SEED_EDITOR_EMAIL, SEED_EDITOR_PASSWORD } = seedEnv.data;
const withDemo = process.argv.includes('--demo');

async function run() {
  await connectDB(env.MONGODB_URI);
  // Asegura los índices únicos (email, slug) antes de insertar.
  await Promise.all([User.syncIndexes(), Post.syncIndexes(), Page.syncIndexes()]);

  const passwordHash = await bcrypt.hash(SEED_EDITOR_PASSWORD, 12);
  const editor = await User.findOneAndUpdate(
    { email: SEED_EDITOR_EMAIL },
    { name: SEED_EDITOR_NAME, passwordHash, role: 'editor' },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
  );
  console.info(`👤 Editor listo: ${editor.email}`);

  if (!(await Page.exists({ slug: 'acerca' }))) {
    await Page.create({
      slug: 'acerca',
      title: 'Acerca de Borde',
      body: 'Borde. Relatos al Margen es un espacio de lectura para voces que escriben desde los márgenes.\n\nEste texto se puede editar desde el panel.',
      updatedBy: editor.id,
    });
    console.info('📄 Página "Acerca" creada');
  } else {
    console.info('📄 Página "Acerca" ya existía (sin cambios)');
  }

  if (withDemo) {
    if (await Post.estimatedDocumentCount()) {
      console.info('📚 Ya hay publicaciones: no se cargan las de ejemplo');
    } else {
      // Uno por uno para que corran los hooks del modelo (Markdown → HTML, fechas).
      for (const post of demoPosts()) {
        await Post.create({ ...post, createdBy: editor.id, updatedBy: editor.id });
      }
      console.info(`📚 ${demoPosts().length} publicaciones de ejemplo creadas`);
    }
  }
}

run()
  .catch((err) => {
    console.error('❌ Error en el seed:', err.message);
    process.exitCode = 1;
  })
  .finally(disconnectDB);
