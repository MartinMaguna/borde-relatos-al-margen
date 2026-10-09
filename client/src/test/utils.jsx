import { render, screen } from '@testing-library/react';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import axe from 'axe-core';
import { vi } from 'vitest';
import { AnnouncerProvider } from '../a11y/Announcer.jsx';
import { routes } from '../routes/routes.jsx';

/**
 * Simula la API: `responses` mapea "ruta sin /api" → { status, body }.
 * Si una ruta no está definida, responde 404 como el server.
 */
export function mockApi(responses) {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
    const path = String(url).replace(/^\/api/, '');
    const match = responses[path];
    const status = match?.status ?? (match ? 200 : 404);
    const body = match?.body ?? { ok: false, error: { message: 'No encontrado', code: 'NOT_FOUND' } };
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  });
}

export const ok = (data, meta) => ({ body: { ok: true, data, ...(meta && { meta }) } });

/** Renderiza la app en una ruta y espera a que aparezca el h1 de la vista. */
export async function renderRoute(path) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const utils = render(
    <AnnouncerProvider>
      <RouterProvider router={router} />
    </AnnouncerProvider>,
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
    rules: { 'color-contrast': { enabled: false } },
  });
  return results.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`);
}
