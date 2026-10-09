import { WEB_PORT } from './helpers.js';

/**
 * Precalentamiento: el primer pedido a través del proxy de `vite preview`
 * recién levantado puede tardar mucho en máquinas lentas. Lo hacemos acá,
 * antes de los tests, para que ningún test cargue con ese costo.
 */
export default async function globalSetup() {
  const url = `http://localhost:${WEB_PORT}/api/health`;
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
      if (res.ok) return;
    } catch {
      // reintentar
    }
    await new Promise((r) => setTimeout(r, 1_000));
  }
  throw new Error(`La API no respondió a través del proxy (${url})`);
}
