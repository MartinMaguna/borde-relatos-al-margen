import mongoose from 'mongoose';

// Rechaza consultas con campos no definidos en el schema (evita filtros inesperados).
mongoose.set('strictQuery', true);

/** Conecta a MongoDB Atlas. Lanza error si no logra conectar. */
export async function connectDB(uri) {
  mongoose.connection.on('disconnected', () => console.warn('⚠️  MongoDB desconectado'));
  mongoose.connection.on('reconnected', () => console.info('🔁 MongoDB reconectado'));

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
  console.info(`✅ MongoDB conectado (base: ${mongoose.connection.name})`);
}

export async function disconnectDB() {
  await mongoose.connection.close();
}

/** Estado legible de la conexión, usado por /api/health. */
export function dbStatus() {
  const states = ['desconectado', 'conectado', 'conectando', 'desconectando'];
  return states[mongoose.connection.readyState] ?? 'desconocido';
}
