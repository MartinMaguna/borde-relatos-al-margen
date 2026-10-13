import { expect, test } from '@playwright/test';
import { expectNoA11yViolations, hasHorizontalScroll, waitForView } from './helpers.js';

/** Vistas públicas con datos del seed de ejemplo (scripts/demo-posts.js). */
const PAGES = [
  { path: '/', h1: 'Borde Relatos al margen' },
  { path: '/poesia', h1: 'Poesía' },
  { path: '/cuentos', h1: 'Cuentos' },
  { path: '/talleres', h1: 'Talleres' },
  { path: '/convocatorias', h1: 'Convocatorias' },
  { path: '/poesia/orilla', h1: 'Orilla' },
  { path: '/convocatorias/convocatoria-antologia-bordes', h1: 'Convocatoria: antología "Bordes"' },
  { path: '/acerca', h1: 'Acerca de Borde' },
  { path: '/no-existe', h1: 'Página no encontrada' },
];

test.describe('axe sin violaciones (WCAG 2.2 A/AA, contraste incluido)', () => {
  for (const { path, h1 } of PAGES) {
    test(`${path}`, async ({ page }) => {
      await page.goto(path);
      await waitForView(page);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(h1);
      await expectNoA11yViolations(page);
    });
  }
});

test.describe('Teclado y foco', () => {
  test('el primer Tab muestra "Saltar al contenido" y Enter lleva el foco al main', async ({ page }) => {
    await page.goto('/');
    await waitForView(page);

    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Saltar al contenido' });
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();

    await page.keyboard.press('Enter');
    await expect(page.locator('main#contenido')).toBeFocused();
  });

  test('el foco es visible: contorno de al menos 2px en enlaces y botones', async ({ page }) => {
    await page.goto('/');
    await waitForView(page);

    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('Tab');
      const outline = await page.evaluate(() => {
        const s = getComputedStyle(document.activeElement);
        return { style: s.outlineStyle, width: parseFloat(s.outlineWidth) };
      });
      expect(outline.style, `elemento ${i + 1}`).not.toBe('none');
      expect(outline.width, `elemento ${i + 1}`).toBeGreaterThanOrEqual(2);
    }
  });

  test('al navegar, el foco pasa al h1 y cambia el título del documento', async ({ page, isMobile }) => {
    await page.goto('/');
    await waitForView(page);
    if (isMobile) await page.getByRole('button', { name: 'Menú' }).click();

    await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Cuentos' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Cuentos' })).toBeFocused();
    await expect(page).toHaveTitle('Cuentos · Borde Relatos al margen');
  });

  test('menú: en móvil se abre y cierra con el botón y Escape; en escritorio siempre visible', async ({ page, isMobile }) => {
    await page.goto('/');
    await waitForView(page);
    const nav = page.getByRole('navigation', { name: 'Principal' });
    const button = nav.getByRole('button', { name: 'Menú' });
    const firstLink = nav.getByRole('link', { name: 'Inicio' });

    if (!isMobile) {
      await expect(button).toBeHidden();
      await expect(firstLink).toBeVisible();
      return;
    }

    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await expect(firstLink).toBeHidden();

    await button.click();
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    await expect(firstLink).toBeVisible();
    await expectNoA11yViolations(page);

    await firstLink.focus();
    await page.keyboard.press('Escape');
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await expect(button).toBeFocused();
    await expect(firstLink).toBeHidden();
  });
});

test.describe('Adaptación visual', () => {
  test('reflow: a 320px de ancho (equivale a 1280px con zoom 400%) no hay scroll horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    for (const { path } of PAGES) {
      await page.goto(path);
      await waitForView(page);
      expect(await hasHorizontalScroll(page), path).toBe(false);
    }
  });

  test('espaciado de texto (WCAG 1.4.12): nada se desborda con interlineado y espaciado aumentados', async ({ page }) => {
    for (const path of ['/', '/poesia/orilla', '/convocatorias/convocatoria-antologia-bordes']) {
      await page.goto(path);
      await waitForView(page);
      await page.addStyleTag({
        content: `* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; }
                  p { margin-bottom: 2em !important; }`,
      });
      expect(await hasHorizontalScroll(page), path).toBe(false);
    }
  });

  test('movimiento reducido: la barra de carga no se anima', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await waitForView(page);
    const animation = await page.evaluate(() => {
      const bar = document.createElement('div');
      bar.className = 'loading-bar';
      document.body.append(bar);
      return getComputedStyle(bar).animationName;
    });
    expect(animation).toBe('none');
  });

  test('alto contraste forzado (Windows): la página se mantiene accesible', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await page.goto('/poesia');
    await waitForView(page);
    await expectNoA11yViolations(page);
  });
});
