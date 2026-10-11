import { StrictMode } from 'react';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import axe from 'axe-core';
import { vi } from 'vitest';
import { AnnouncerProvider } from '../a11y/Announcer.jsx';
import { routes } from '../routes/routes.jsx';

/**
 * Simula la API. `responses` mapea "ruta sin /api" (GET) o "MÉTODO ruta" → { status, body }
 * o una función (requestBody) => { status, body } para respuestas dinámicas.
 * Si una ruta no está definida, responde 404 como el server.
 * Devuelve la lista de llamadas hechas ({ method, path, body }) para poder verificarlas.
 */
export function mockApi(responses) {
  const calls = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options = {}) => {
    const path = String(url).replace(/^\/api/, '');
    const method = options.method ?? 'GET';
    const body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
    calls.push({ method, path, body });

    let match = responses[`${method} ${path}`] ?? (method === 'GET' ? responses[path] : undefined);
    if (typeof match === 'function') match = match(body);
    const status = match?.status ?? (match ? 200 : 404);
    const json = match?.body ?? { ok: false, error: { message: 'No encontrado', code: 'NOT_FOUND' } };
    return new Response(JSON.stringify(json), { status, headers: { 'Content-Type': 'application/json' } });
  });
  return calls;
}

export const ok = (data, meta) => ({ body: { ok: true, data, ...(meta && { meta }) } });

export const fail = (status, message, extra = {}) => ({ status, body: { ok: false, error: { message, ...extra } } });

/**
 * Renderiza la app en una ruta (con StrictMode, como en main.jsx: así se detectan
 * efectos que fallan al ejecutarse dos veces) y espera el h1 de la vista.
 */
export async function renderRoute(path) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const utils = render(
    <StrictMode>
      <AnnouncerProvider>
        <RouterProvider router={router} />
      </AnnouncerProvider>
    </StrictMode>,
  );
  await screen.findByRole('heading', { level: 1 });
  return { router, ...utils };
}

/**
 * Corre axe sobre el documento completo (para incluir landmarks).
 * El contraste de color no se puede medir en jsdom (no hay CSS renderizado):
 * se verificó a mano en global.css y se revisa en la auditoría con navegador real.
 */
export async function axeViolations() {
  const results = await axe.run(document.body, {
    // jsdom no permite entrar a iframes (p. ej. YouTube); el título del iframe sí se verifica.
    iframes: false,
    rules: { 'color-contrast': { enabled: false } },
  });
  return results.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`);
}
