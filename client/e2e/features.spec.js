import { expect, test } from '@playwright/test';
import { expectNoA11yViolations, hasHorizontalScroll, login, waitForView } from './helpers.js';

test.describe('Artículos: guardar, compartir, comentar; contacto; postulaciones', () => {
  test('acciones del artículo: guardar, panel de compartir y foco a comentarios, sin violaciones', async ({ page }) => {
    await page.goto('/poesia/orilla');
    await waitForView(page);
    await expect(page.getByText(/minutos? de lectura/)).toBeVisible();

    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByRole('button', { name: 'Quitar de guardados' })).toBeVisible();

    const share = page.getByRole('button', { name: 'Compartir' });
    await share.click();
    await expect(page.getByRole('link', { name: /WhatsApp/ })).toBeVisible();
    await expectNoA11yViolations(page); // panel abierto: contraste y estructura
    expect(await hasHorizontalScroll(page)).toBe(false);
    await page.keyboard.press('Escape');
    await expect(share).toBeFocused();
    await expect(page.getByRole('link', { name: /WhatsApp/ })).toBeHidden();

    await page.getByRole('link', { name: 'Comentar' }).click();
    await expect(page.getByRole('heading', { level: 2, name: /Comentarios/ })).toBeFocused();

    await page.goto('/guardados');
    await waitForView(page);
    await expect(page.getByRole('link', { name: 'Orilla' })).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test('comentario: se envía, queda pendiente, se aprueba en el panel y aparece publicado', async ({ page }, testInfo) => {
    const text = `Comentario de prueba ${testInfo.project.name} ${testInfo.retry}`;
    await page.goto('/poesia/inventario-de-la-casa-vacia');
    await waitForView(page);
    await page.getByLabel('Tu nombre').fill('Lectora E2E');
    await page.getByLabel('Comentario', { exact: true }).fill(text);
    await page.getByRole('button', { name: 'Enviar comentario' }).click();
    await expect(page.locator('p.notice', { hasText: 'se publicará cuando el equipo lo revise' })).toBeFocused();
    await expect(page.getByText(text)).toBeHidden();

    await login(page);
    await page.goto('/panel/comentarios');
    await waitForView(page);
    await expectNoA11yViolations(page);
    const item = page.locator('.admin-item', { hasText: text });
    await item.getByRole('button', { name: /^Aprobar/ }).click();
    await expect(page.locator('.admin-item', { hasText: text })).toHaveCount(0);

    await page.goto('/poesia/inventario-de-la-casa-vacia');
    await waitForView(page);
    await expect(page.getByText(text)).toBeVisible();
  });

  test('postulación: el formulario aparece al activarlo, se envía y se descarga en CSV', async ({ page }, testInfo) => {
    await login(page);
    const title = `Convocatoria E2E ${testInfo.project.name} ${testInfo.retry}`;
    const created = await page.request.post('/api/admin/posts', {
      data: {
        title,
        category: 'convocatorias',
        author: 'Equipo',
        body: 'Bases breves.',
        status: 'published',
        deadline: '2999-12-31',
        acceptsApplications: true,
      },
    });
    const { data: call } = await created.json();

    await page.goto(`/convocatorias/${call.slug}`);
    await waitForView(page);
    const form = page.getByRole('region', { name: 'Postulate' });
    await expectNoA11yViolations(page);

    // Enviar vacío: errores juntos, incluido el consentimiento.
    await form.getByRole('button', { name: 'Enviar postulación' }).click();
    await expect(page.locator('.error-summary')).toBeFocused();
    await expect(form.getByLabel(/Leí las bases/)).toHaveAttribute('aria-invalid', 'true');
    await expectNoA11yViolations(page);

    await form.getByLabel('Nombre y apellido').fill('Ana Pérez');
    await form.getByLabel('Correo electrónico').fill('ana@ejemplo.com');
    await form.getByLabel('Título de la obra').fill('Orilla');
    await form.getByLabel('Texto (opcional)', { exact: true }).fill('El agua se fue');
    await form.getByLabel(/Leí las bases/).check();
    await form.getByRole('button', { name: 'Enviar postulación' }).click();
    await expect(page.locator('.notice', { hasText: 'Recibimos tu postulación.' })).toBeFocused();

    await page.goto(`/panel/publicaciones/${call.id}/postulaciones`);
    await waitForView(page);
    await expect(page.getByRole('heading', { level: 2, name: 'Ana Pérez: «Orilla»' })).toBeVisible();
    await expectNoA11yViolations(page);

    const download = page.waitForEvent('download');
    await page.getByRole('link', { name: /Descargar todas en CSV/ }).click();
    const file = await download;
    expect(file.suggestedFilename()).toBe(`postulaciones-${call.slug}.csv`);
  });

  test('contacto: correo visible, enlace para escribir y sin violaciones', async ({ page }) => {
    await page.goto('/contacto');
    await waitForView(page);
    await expect(page.getByText('martinmaguna33@gmail.com')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Escribir un correo' })).toHaveAttribute('href', 'mailto:martinmaguna33@gmail.com');
    await expectNoA11yViolations(page);
    expect(await hasHorizontalScroll(page)).toBe(false);
  });
});
