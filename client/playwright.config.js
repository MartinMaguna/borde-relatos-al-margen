import { defineConfig, devices } from '@playwright/test';
import { API_PORT, EDITOR, WEB_PORT } from './e2e/helpers.js';

/**
 * Tests end-to-end de accesibilidad en navegador real (Chromium).
 * Levanta su propia API con MongoDB en memoria y datos de ejemplo (no toca Atlas)
 * y un Vite apuntando a ella, en puertos distintos a los de desarrollo.
 *
 *   npm run test:e2e -w client
 */
export default defineConfig({
  testDir: './e2e',
  // Una sola base compartida: los tests corren en serie.
  workers: 1,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  // Un reintento: los tests que solo pasan al reintentar se reportan como «flaky», no se ocultan.
  retries: 1,
  globalSetup: './e2e/global-setup.js',
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: 'retain-on-failure',
    locale: 'es-UY',
    timezoneId: 'America/Montevideo',
  },
  projects: [
    { name: 'escritorio-claro', use: { ...devices['Desktop Chrome'], colorScheme: 'light' } },
    { name: 'escritorio-oscuro', use: { ...devices['Desktop Chrome'], colorScheme: 'dark' } },
    { name: 'movil', use: { ...devices['Pixel 7'], colorScheme: 'light' } },
  ],
  webServer: [
    {
      command: 'npm run dev:memory -w server',
      cwd: '..',
      url: `http://localhost:${API_PORT}/api/health`,
      timeout: 180_000,
      reuseExistingServer: false,
      env: {
        PORT: String(API_PORT),
        CLIENT_ORIGIN: `http://localhost:${WEB_PORT}`,
        SEED_EDITOR_NAME: EDITOR.name,
        SEED_EDITOR_EMAIL: EDITOR.email,
        SEED_EDITOR_PASSWORD: EDITOR.password,
      },
    },
    {
      // Build de producción + preview (usa el mismo proxy /api que el modo dev):
      // es lo que se publica, y evita las recargas por optimización de dependencias de Vite dev.
      command: `npx vite build && npx vite preview --port ${WEB_PORT} --strictPort`,
      url: `http://localhost:${WEB_PORT}`,
      timeout: 180_000,
      reuseExistingServer: false,
      env: { API_PROXY_TARGET: `http://localhost:${API_PORT}` },
    },
  ],
});
