
/**
 * Entrada de la API como función serverless de Vercel (la usa client/api/index.js).
 *
 * Es la misma app de Express que en local (src/index.js): acá no hay
 * app.listen(); Vercel llama a esta función con cada petición a /api/*.
 * La app, la conexión a MongoDB y los datos iniciales se preparan una sola vez
 * por instancia y se reutilizan en las peticiones siguientes.
 */
let ready = null;

function prepare() {
  ready ??= (async () => {
    // Importaciones dentro del arranque: si falta una variable de entorno, la
    // función responde 503 con un mensaje claro (y el detalle queda en los logs)
    // en lugar de fallar al cargarse.
    const { env } = await import('./config/env.js');
    const { connectDB } = await import('./config/db.js');
    const { createApp } = await import('./app.js');
    const { ensureInitialData } = await import('./bootstrap.js');
    await connectDB(env.MONGODB_URI);
    // Primer editor y página "Acerca" si faltan. Un fallo acá no impide atender.
    await ensureInitialData().catch((err) => console.error('⚠️  No se pudieron crear los datos iniciales:', err.message));
    return createApp();
  })().catch((err) => {
    ready = null; // la próxima petición vuelve a intentar
    throw err;
  });
  return ready;
}

/**
 * vercel.json reescribe /api/<ruta> a esta función como /api?__ruta=<ruta>:
 * se reconstruye la URL original para que las rutas de Express (/api/posts, …)
 * funcionen igual que siempre.
 */
export function restoreOriginalUrl(req) {
  const url = new URL(req.url, 'http://localhost');
  const route = url.searchParams.get('__ruta');
  if (route == null) return;
  url.searchParams.delete('__ruta');
  // Vercel agrega también ?path=<ruta> al reescribir: se quita para no mezclarlo con los parámetros de la API.
  if (url.searchParams.get('path') === route) url.searchParams.delete('path');
  req.url = `/api/${route.replace(/^\/+/, '')}${url.search}`;
}

/** Qué falló al iniciar, en términos seguros de mostrar. */
export function startupReason(err) {
  const envMatch = /^Variables de entorno inválidas: (.+)$/.exec(err?.message ?? '');
  if (envMatch) return `Revisá estas variables de entorno: ${envMatch[1]}`;
  if (/auth/i.test(err?.message ?? '') || err?.codeName === 'AtlasError') return 'MongoDB rechazó el usuario o la contraseña de MONGODB_URI';
  if (err?.name === 'MongoParseError' || /Invalid scheme|URI/i.test(err?.message ?? '')) return 'MONGODB_URI no tiene un formato válido';
  if (err?.name === 'MongoServerSelectionError') return 'No se pudo llegar a MongoDB Atlas (revisá Network Access)';
  return err?.name ?? 'Error';
}

export default async function handler(req, res) {
  restoreOriginalUrl(req);
  let app;
  try {
    app = await prepare();
  } catch (err) {
    console.error('❌ La API no pudo iniciar:', err.message);
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(
      JSON.stringify({
        ok: false,
        error: {
          message: 'El servidor no está disponible en este momento. Probá de nuevo en unos minutos.',
          code: 'UNAVAILABLE',
          // Pista para quien configura el deploy, sin datos sensibles: solo nombres
          // de variables o el tipo de error de conexión (nunca valores ni contraseñas).
          reason: startupReason(err),
        },
      }),
    );
    return;
  }
  return app(req, res);
}
