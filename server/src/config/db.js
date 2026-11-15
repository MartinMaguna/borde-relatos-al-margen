import mongoose from 'mongoose';

// Rechaza consultas con campos no definidos en el schema (evita filtros inesperados).
mongoose.set('strictQuery', true);

// En Vercel (funciones serverless) una misma instancia atiende varias
// peticiones seguidas: la conexión se reutiliza en lugar de abrir una nueva
// cada vez (Atlas M0 admite hasta 500 conexiones). Se guarda en globalThis
// para que sobreviva aunque el módulo se vuelva a evaluar.
const cache = (globalThis.__bordeMongo ??= { promise: null, listeners: false });

/** Conecta a MongoDB Atlas (una sola vez por proceso). Lanza error si no logra conectar. */
export async function connectDB(uri, dbName) {
  if (mongoose.connection.readyState === 1) return;
  if (!cache.listeners) {
    mongoose.connection.on('disconnected', () => console.warn('⚠️  MongoDB desconectado'));
    mongoose.connection.on('reconnected', () => console.info('🔁 MongoDB reconectado'));
    cache.listeners = true;
  }
  cache.promise ??= mongoose
    .connect(uri, {
      serverSelectionTimeoutMS: 10_000,
      ...(dbName && { dbName }),
      // Pocas conexiones por instancia: en serverless hay muchas instancias chicas.
      maxPoolSize: process.env.VERCEL ? 5 : 100,
    })
    .then(() => console.info(`✅ MongoDB conectado (base: ${mongoose.connection.name})`))
    .catch((err) => {
      cache.promise = null; // la próxima petición vuelve a intentar
      throw err;
    });
  await cache.promise;
}

export async function disconnectDB() {
  cache.promise = null;
  await mongoose.connection.close();
}

/** Estado legible de la conexión, usado por /api/health. */
export function dbStatus() {
  const states = ['desconectado', 'conectado', 'conectando', 'desconectando'];
  return states[mongoose.connection.readyState] ?? 'desconocido';
}
