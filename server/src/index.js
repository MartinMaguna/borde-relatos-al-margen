import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { createApp } from './app.js';

async function main() {
  await connectDB(env.MONGODB_URI);

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.info(`🚀 API escuchando en http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });

  // Apagado ordenado: Railway envía SIGTERM en cada redeploy.
  const shutdown = (signal) => {
    console.info(`\n${signal} recibido, cerrando…`);
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  console.error('❌ No se pudo iniciar el servidor:', err.message);
  process.exit(1);
});
