import { expect, test } from '@playwright/test';
import { expectNoA11yViolations, hasHorizontalScroll, login, waitForView } from './helpers.js';

const AUDIO_URL = 'https://audio.borde.test/lectura.wav';
const VIDEO_ID = 'dQw4w9WgXcQ';

/** WAV de 1 segundo (tono de 440 Hz, 8 kHz, 8 bits, mono). */
function wavTone() {
  const rate = 8000;
  const samples = Buffer.alloc(rate);
  for (let i = 0; i < rate; i++) samples[i] = 128 + Math.round(60 * Math.sin((2 * Math.PI * 440 * i) / rate));
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + samples.length, 4);
  header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(rate, 28);
  header.writeUInt16LE(1, 32);
  header.writeUInt16LE(8, 34);
  header.write('data', 36);
  header.writeUInt32LE(samples.length, 40);
  return Buffer.concat([header, samples]);
}

test.describe('Audio y lengua de señas en navegador real', () => {
  test.beforeEach(async ({ page }) => {
    // Sin depender de internet: el audio y el video de YouTube se simulan.
    await page.route(`${AUDIO_URL}*`, (route) =>
      route.fulfill({ status: 200, contentType: 'audio/wav', body: wavTone() }),
    );
    await page.route('https://www.youtube-nocookie.com/**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'text/html',
        // Sin <main>: el reproductor real de YouTube no agrega landmarks a la página.
        body: '<!doctype html><html lang="es"><head><title>Video</title></head><body><p>Video de prueba</p></body></html>',
      }),
    );
  });

  test('la tarjeta reproduce el audio y lleva a la versión en lengua de señas', async ({ page }, testInfo) => {
    await login(page);
    // Título único también en los reintentos (la base se comparte).
    const title = `Con audio ${testInfo.project.name} ${testInfo.retry}`;
    const created = await page.request.post('/api/admin/posts', {
      data: {
        title,
        category: 'poesia',
        author: 'E2E',
        body: 'verso uno\nverso dos',
        status: 'published',
        audio: { url: AUDIO_URL, label: 'Lectura de la autora' },
        signVideoUrl: `https://youtu.be/${VIDEO_ID}`,
      },
    });
    expect(created.ok()).toBe(true);

    await page.goto('/poesia');
    await waitForView(page);

    // Escuchar → suena de verdad → Pausar.
    await page.getByRole('button', { name: `Escuchar «${title}»` }).click();
    const pause = page.getByRole('button', { name: `Pausar «${title}»` });
    await expect(pause).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => [...document.querySelectorAll('audio')].some((a) => !a.paused && a.currentTime > 0)))
      .toBe(true);
    await pause.click();
    await expect(page.getByRole('button', { name: `Escuchar «${title}»` })).toBeVisible();

    await expectNoA11yViolations(page);

    // Lengua de señas → detalle, con foco en la sección del video.
    await page.getByRole('link', { name: `Lengua de señas «${title}»` }).click();
    await expect(page).toHaveURL(/#lengua-de-senas$/);
    await expect(page.getByRole('heading', { level: 2, name: 'Versión en lengua de señas' })).toBeFocused();
    const video = page.frameLocator(`iframe[title="Versión en lengua de señas de «${title}» (video de YouTube)"]`);
    await expect(video.getByText('Video de prueba')).toBeVisible();

    // Reproductor nativo del detalle, con su nombre.
    await expect(page.locator('audio[controls][aria-labelledby="audio-titulo"]')).toHaveAttribute('src', AUDIO_URL);

    await expectNoA11yViolations(page);
    expect(await hasHorizontalScroll(page)).toBe(false);
  });
});
