import { expect, test } from '@playwright/test';
import { expectNoA11yViolations, hasHorizontalScroll, login, waitForView } from './helpers.js';

test.describe('Artículos: guardar y compartir; contacto; postulaciones', () => {
  test('acciones del artículo: guardar, panel de compartir y acceso a Mis guardados, sin violaciones', async ({ page }) => {
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

    await page.getByRole('link', { name: 'Mis guardados' }).click();
    await waitForView(page);
    await expect(page.getByRole('link', { name: 'Orilla' })).toBeVisible();
    await expectNoA11yViolations(page);
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
    await expect(form.getByLabel(/Confirmo que deseo presentar/)).toHaveAttribute('aria-invalid', 'true');
    await expect(form.getByRole('radiogroup', { name: 'Idioma de la obra' })).toHaveAttribute('aria-invalid', 'true');
    await expectNoA11yViolations(page);

    // Formulario modelo de Borde (la convocatoria no tiene uno propio).
    await form.getByLabel('Nombre y apellido').fill('Ana Pérez');
    await form.getByLabel('Edad').fill('27');
    await form.getByLabel('Departamento de residencia').selectOption('Montevideo');
    await form.getByLabel('Medio de contacto').fill('ana@ejemplo.com');
    await form.getByRole('radio', { name: 'Por escrito' }).check();
    await form.getByLabel(/^Tu presentación/).fill('Escribo desde Malvín.');
    await form.getByLabel('Título de la obra').fill('Orilla');
    await form.getByRole('radio', { name: 'Texto escrito' }).check();
    await form.getByRole('radio', { name: 'Español' }).check();
    await form.getByLabel('Enlace a tu obra').fill('https://drive.google.com/file/d/abc');
    await form.getByLabel(/Confirmo que deseo presentar/).check();
    await form.getByRole('button', { name: 'Enviar postulación' }).click();
    await expect(page.locator('.notice', { hasText: 'Recibimos tu postulación.' })).toBeFocused();

    await page.goto(`/panel/publicaciones/${call.id}/postulaciones`);
    await waitForView(page);
    await expect(page.getByRole('heading', { level: 2, name: 'Ana Pérez: «Orilla»' })).toBeVisible();
    await expect(page.getByText('Escribo desde Malvín.')).toBeVisible();
    await expectNoA11yViolations(page);

    // El editor del formulario en el panel, sin violaciones.
    await page.goto(`/panel/publicaciones/${call.id}`);
    await waitForView(page);
    await expect(page.getByRole('group', { name: /Formulario de postulación/ })).toBeVisible();
    await expectNoA11yViolations(page);
    expect(await hasHorizontalScroll(page)).toBe(false);
    await page.goto(`/panel/publicaciones/${call.id}/postulaciones`);
    await waitForView(page);

    const download = page.waitForEvent('download');
    await page.getByRole('link', { name: /Descargar todas en CSV/ }).click();
    const file = await download;
    expect(file.suggestedFilename()).toBe(`postulaciones-${call.slug}.csv`);
  });

  test('contacto: formulario sin el correo a la vista; el mensaje llega al panel', async ({ page }, testInfo) => {
    const name = `Persona ${testInfo.project.name}`;
    await page.goto('/contacto');
    await waitForView(page);
    await expect(page.getByText(/@gmail\.com/)).toHaveCount(0);
    await expectNoA11yViolations(page);
    expect(await hasHorizontalScroll(page)).toBe(false);

    // Enviar vacío: resumen de errores y campos marcados.
    await page.getByRole('button', { name: 'Enviar mensaje' }).click();
    await expect(page.locator('.error-summary')).toBeFocused();
    await expect(page.getByLabel('Mensaje')).toHaveAttribute('aria-invalid', 'true');

    await page.getByLabel('Nombre').fill(name);
    await page.getByLabel('Correo electrónico').fill('persona@ejemplo.com');
    await page.getByLabel('Mensaje').fill('Quiero sumarme al próximo taller.');
    await page.getByRole('button', { name: 'Enviar mensaje' }).click();
    await expect(page.locator('.notice--success', { hasText: 'Mensaje enviado.' })).toBeFocused();
    await expectNoA11yViolations(page);

    await login(page);
    await page.goto('/panel/mensajes');
    await waitForView(page);
    await expect(page.getByRole('heading', { level: 2, name })).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test('logos: se cargan en el panel y aparecen al pie, sin violaciones', async ({ page }, testInfo) => {
    const name = `Institución ${testInfo.project.name}`;
    await login(page);
    await page.goto('/panel/logos');
    await waitForView(page);
    await expectNoA11yViolations(page);

    const dataUrl = await page.evaluate(() => {
      const c = document.createElement('canvas');
      c.width = 300;
      c.height = 120;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#5b2a86';
      ctx.fillRect(0, 0, 120, 120);
      ctx.fillStyle = '#e8613c';
      ctx.fillRect(140, 30, 160, 60);
      return c.toDataURL('image/png');
    });
    await page.getByLabel('Nombre').fill(name);
    await page.getByLabel('¿Qué hace?').selectOption('apoyan');
    const upload = page.waitForResponse((r) => r.url().endsWith('/api/admin/images') && r.request().method() === 'POST');
    await page.getByLabel(/^Subir una imagen/).setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: Buffer.from(dataUrl.split(',')[1], 'base64') });
    await upload;
    await page.getByRole('button', { name: 'Agregar logo' }).click();
    await expect(page.getByRole('button', { name: `Editar ${name}` })).toBeVisible();

    await page.goto('/');
    await waitForView(page);
    const footer = page.getByRole('contentinfo');
    await expect(footer.getByRole('region', { name: 'Acompañan a Borde' })).toBeVisible();
    await expect(footer.getByRole('list', { name: 'Apoyan' }).getByRole('img', { name })).toBeVisible();
    await expect(footer.getByRole('link', { name: /Ingreso/ })).toHaveCount(0);
    await expectNoA11yViolations(page);
    expect(await hasHorizontalScroll(page)).toBe(false);
  });
});
