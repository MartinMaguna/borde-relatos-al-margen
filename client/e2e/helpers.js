import { expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/** Editor de prueba de la base en memoria que levanta playwright.config.js. */
export const EDITOR = { name: 'Editora E2E', email: 'editora@e2e.test', password: 'contrasena-e2e-segura' };

export const API_PORT = 4100;
export const WEB_PORT = 5174;

/** Reglas WCAG 2.0, 2.1 y 2.2 niveles A y AA, más buenas prácticas de axe. */
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

/** Corre axe sobre la página tal como se ve (con CSS, contraste y tema reales). */
export async function expectNoA11yViolations(page) {
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const readable = violations.map(
    (v) => `${v.id} (${v.impact}): ${v.help}\n    ${v.nodes.map((n) => n.target.join(' ')).join('\n    ')}`,
  );
  expect(readable, 'Violaciones de accesibilidad detectadas por axe').toEqual([]);
}

/** Espera a que la vista esté lista: el h1 visible y ninguna navegación en curso. */
export async function waitForView(page) {
  await expect(page.locator('main h1')).toBeVisible();
  await expect(page.locator('main')).toHaveAttribute('aria-busy', 'false');
}

export async function login(page) {
  await page.goto('/panel/ingresar');
  await page.getByLabel('Correo electrónico').fill(EDITOR.email);
  await page.getByLabel('Contraseña', { exact: true }).fill(EDITOR.password);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Publicaciones' })).toBeVisible();
}

/** true si la página se desborda horizontalmente (falla de reflow, WCAG 1.4.10). */
export function hasHorizontalScroll(page) {
  return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
}
