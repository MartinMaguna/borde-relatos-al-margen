/**
 * Levanta la API con una base MongoDB EN MEMORIA y datos de ejemplo.
 * No necesita Atlas ni .env: sirve para probar el sitio localmente y para
 * los tests end-to-end (Playwright). Todo se borra al cerrar el proceso.
 *
 *   npm run dev:memory -w server
 *
 * Credenciales del editor de prueba: las de SEED_EDITOR_* si están definidas;
 * si no, los valores por defecto de abajo (solo válidos en esta base efímera).
 */
import { execFileSync, spawn } from 'node:child_process';
import { MongoMemoryServer } from 'mongodb-memory-server';

const DEFAULTS = {
  NODE_ENV: 'development',
  PORT: '4000',
  JWT_SECRET: 'secreto-solo-para-la-base-en-memoria-de-desarrollo',
  SEED_EDITOR_NAME: 'Editora de prueba',
  SEED_EDITOR_EMAIL: 'editora@borde.test',
  SEED_EDITOR_PASSWORD: 'contrasena-de-prueba',
  // Los tests e2e hacen muchos logins y envíos seguidos desde la misma IP.
  LOGIN_RATE_LIMIT: '100',
  COMMENT_RATE_LIMIT: '100',
  APPLICATION_RATE_LIMIT: '100',
};

const mongod = await MongoMemoryServer.create({ instance: { launchTimeout: 60_000 } });
const env = { ...DEFAULTS, ...process.env, MONGODB_URI: mongod.getUri('borde') };

execFileSync(process.execPath, ['scripts/seed.js', '--demo'], { env, stdio: 'inherit' });
console.info(`🔑 Editor de prueba: ${env.SEED_EDITOR_EMAIL} (contraseña en SEED_EDITOR_PASSWORD o en scripts/dev-memory.js)`);

const api = spawn(process.execPath, ['src/index.js'], { env, stdio: 'inherit' });

async function stop() {
  api.kill();
  await mongod.stop();
  process.exit(0);
}
api.on('exit', stop);
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
