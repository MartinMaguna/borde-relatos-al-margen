import { expect, test } from '@playwright/test';
import { EDITOR, expectNoA11yViolations, hasHorizontalScroll, login, waitForView } from './helpers.js';

test.describe('Panel del editor en navegador real', () => {
  test('login: formulario y estado de error sin violaciones; foco al resumen', async ({ page }) => {
    await page.goto('/panel/ingresar');
    await waitForView(page);
    await expectNoA11yViolations(page);

    await page.getByLabel('Correo electrónico').fill(EDITOR.email);
    await page.getByLabel('Contraseña', { exact: true }).fill('incorrecta');
    await page.getByRole('button', { name: 'Ingresar' }).click();

    await expect(page.locator('.error-summary')).toBeFocused();
    await expect(page).toHaveTitle(/^Error: Ingresar al panel/);
    await expect(page.getByLabel('Correo electrónico')).toHaveAttribute('aria-invalid', 'true');
    await expectNoA11yViolations(page);
  });

  test('listado, formulario y página Acerca sin violaciones', async ({ page }) => {
    await login(page);
    await expectNoA11yViolations(page);

    await page.goto('/panel/publicaciones/nueva');
    await waitForView(page);
    await page.getByLabel('Categoría').selectOption('convocatorias');
    await expect(page.getByLabel('Fecha límite')).toBeVisible();
    await expectNoA11yViolations(page);

    await page.goto('/panel/acerca');
    await waitForView(page);
    await expectNoA11yViolations(page);
  });

  test('formulario con errores: resumen enfocado, enlaces a campos, sin violaciones y sin scroll horizontal', async ({ page }) => {
    await login(page);
    await page.goto('/panel/publicaciones/nueva');
    await waitForView(page);

    await page.getByLabel('O pegá la dirección de una imagen (opcional)').fill('https://example.com/foto.jpg');
    await page.getByRole('button', { name: 'Guardar borrador' }).click();

    const summary = page.locator('.error-summary');
    await expect(summary).toBeFocused();
    await expect(page).toHaveTitle(/^Error: Nueva publicación/);
    await expect(page.getByLabel('Título')).toHaveAccessibleDescription(/^Error: /);

    await summary.getByRole('link', { name: /texto alternativo/i }).click();
    await expect(page.getByLabel('Texto alternativo (opcional)')).toBeFocused();

    await expectNoA11yViolations(page);
    expect(await hasHorizontalScroll(page)).toBe(false);
  });

  test('subir una foto grande: se achica en el navegador, se sube y se publica con su texto alternativo', async ({ page }, testInfo) => {
    await login(page);
    await page.goto('/panel/publicaciones/nueva');
    await waitForView(page);

    // Foto "de celular" de 2400×1800 generada en el navegador.
    const dataUrl = await page.evaluate(() => {
      const c = document.createElement('canvas');
      c.width = 2400;
      c.height = 1800;
      const ctx = c.getContext('2d');
      for (let i = 0; i < 400; i++) {
        ctx.fillStyle = `hsl(${(i * 37) % 360} 70% 50%)`;
        ctx.fillRect((i * 97) % 2400, (i * 53) % 1800, 300, 200);
      }
      return c.toDataURL('image/png');
    });
    const buffer = Buffer.from(dataUrl.split(',')[1], 'base64');

    const uploadResponse = page.waitForResponse((r) => r.url().endsWith('/api/admin/images') && r.request().method() === 'POST');
    await page.getByLabel('Subir una imagen (opcional)').setInputFiles({ name: 'foto.png', mimeType: 'image/png', buffer });
    const uploaded = await (await uploadResponse).json();

    expect(uploaded.ok).toBe(true);
    expect(uploaded.data.size).toBeLessThan(buffer.length); // se achicó antes de subir
    await expect(page.locator('.image-preview__label', { hasText: 'Imagen subida.' })).toBeVisible();
    await expect(page.locator('.image-preview__img')).toHaveJSProperty('naturalWidth', 1600);
    await expectNoA11yViolations(page);

    const title = `Con foto ${testInfo.project.name}`;
    await page.getByLabel('Título').fill(title);
    await page.getByLabel('Autor o autora').fill('E2E');
    await page.getByLabel('Texto', { exact: true }).fill('Texto con foto.');
    await page.getByLabel('Texto alternativo (opcional)').fill('Rectángulos de colores superpuestos');
    await page.getByRole('button', { name: 'Publicar' }).click();
    await expect(page.locator('.notice', { hasText: `Se publicó «${title}»` })).toBeVisible();

    // En el sitio público la imagen se ve con su texto alternativo.
    await page.goto(`/panel?q=${encodeURIComponent(title)}`);
    await page.getByRole('link', { name: `Ver en el sitio «${title}»` }).click();
    const img = page.getByRole('img', { name: 'Rectángulos de colores superpuestos' });
    await expect(img).toBeVisible();
    await expect(img).toHaveJSProperty('complete', true);
  });

  test('editor de texto: barra de formato, deshacer, vista previa del servidor y sin violaciones', async ({ page }) => {
    await login(page);
    await page.goto('/panel/publicaciones/nueva');
    await waitForView(page);

    const text = page.getByLabel('Texto', { exact: true });
    await text.fill('Primera parte\nhola mundo');
    // Título de sección en la primera línea.
    await text.evaluate((el) => el.setSelectionRange(0, 0));
    await page.getByRole('button', { name: 'Título de sección' }).click();
    // Negrita sobre "mundo".
    await text.evaluate((el) => {
      const i = el.value.indexOf('mundo');
      el.setSelectionRange(i, i + 5);
    });
    await page.getByRole('button', { name: 'Negrita' }).click();
    await expect(text).toHaveValue('# Primera parte\nhola **mundo**');
    await expect(text).toBeFocused();

    // Deshacer funciona (el formato se insertó como si se tipeara).
    await page.keyboard.press('Control+z');
    await expect(text).not.toHaveValue('# Primera parte\nhola **mundo**');

    await text.fill('# Sección\n\n**negrita** y *cursiva*');
    await page.getByRole('button', { name: 'Ver vista previa' }).click();
    const preview = page.getByRole('region', { name: 'Vista previa' });
    await expect(preview.locator('h2', { hasText: 'Sección' })).toBeVisible();
    await expect(preview.locator('strong', { hasText: 'negrita' })).toBeVisible();
    await expect(preview.locator('em', { hasText: 'cursiva' })).toBeVisible();

    await expectNoA11yViolations(page);
    expect(await hasHorizontalScroll(page)).toBe(false);
  });

  test('eliminar: nombre accesible con el título, diálogo modal real, Escape y confirmación', async ({ page }, testInfo) => {
    await login(page);

    // Publicación propia para este test (los proyectos comparten la base).
    const title = `Para borrar ${testInfo.project.name}`;
    const created = await page.request.post('/api/admin/posts', {
      data: { title, category: 'cuentos', author: 'E2E', body: 'Texto', status: 'draft' },
    });
    expect(created.ok()).toBe(true);

    await page.goto(`/panel?q=${encodeURIComponent(title)}`);
    await waitForView(page);

    // Chrome calcula el nombre incluyendo el texto oculto visualmente.
    const trigger = page.getByRole('button', { name: `Eliminar «${title}»` });
    await trigger.click();

    const dialog = page.getByRole('dialog', { name: '¿Eliminar esta publicación?' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Cancelar' })).toBeFocused();
    await expectNoA11yViolations(page);

    // El resto de la página queda inerte: con Tab el foco recorre el diálogo y, como
    // mucho, sale a la interfaz del navegador (comportamiento nativo), nunca al fondo.
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('Tab');
      const where = await page.evaluate(() => {
        const active = document.activeElement;
        if (document.querySelector('dialog').contains(active)) return 'diálogo';
        if (!active || active === document.body) return 'navegador';
        return active.outerHTML.slice(0, 80);
      });
      expect(['diálogo', 'navegador'], `Tab ${i + 1}`).toContain(where);
    }
    await dialog.getByRole('button', { name: 'Cancelar' }).focus();

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();

    await trigger.click();
    await dialog.getByRole('button', { name: 'Sí, eliminar' }).click();
    await expect(page.locator('.notice', { hasText: `Se eliminó «${title}».` })).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: 'Publicaciones' })).toBeFocused();
    await expect(page.getByTestId('announcer-polite')).toHaveText(`Se eliminó «${title}».`);
  });

  test('cerrar sesión vuelve al login con aviso, y el panel deja de ser accesible', async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Ingresar al panel' })).toBeVisible();
    // El texto está en el aviso visible y también en la región viva (oculta): buscamos el aviso.
    await expect(page.locator('.notice', { hasText: 'Cerraste la sesión.' })).toBeVisible();

    await page.goto('/panel');
    await expect(page).toHaveURL(/\/panel\/ingresar\?volver=%2Fpanel$/);
  });
});
