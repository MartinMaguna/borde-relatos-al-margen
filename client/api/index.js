/**
 * Función serverless de Vercel: toda la API (/api/*) la atiende la app de
 * Express de /server. vercel.json reescribe /api/<ruta> → /api?__ruta=<ruta>.
 * Vercel incluye en el paquete de la función el código de /server y sus
 * dependencias (instaladas en el node_modules de la raíz del monorepo).
 */
export { default } from '../../server/src/serverless.js';
