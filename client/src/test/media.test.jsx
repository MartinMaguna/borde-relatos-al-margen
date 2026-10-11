import { beforeEach, describe, expect, test, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axeViolations, mockApi, ok, renderRoute } from './utils.jsx';
import { poem, story } from './fixtures.js';

const AUDIO = 'https://archive.org/download/borde/orilla.mp3';
const VIDEO_ID = 'dQw4w9WgXcQ';
const withMedia = {
  ...poem,
  audio: { url: AUDIO, label: 'Lectura de la autora' },
  signVideoUrl: `https://www.youtube.com/watch?v=${VIDEO_ID}`,
  signVideoId: VIDEO_ID,
};
const meta = { page: 1, limit: 10, total: 2, totalPages: 1 };

// jsdom no reproduce audio: simulamos play/pause con sus eventos.
beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function play() {
    Object.defineProperty(this, 'paused', { value: false, configurable: true });
    this.dispatchEvent(new Event('play'));
    return Promise.resolve();
  });
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(function pause() {
    Object.defineProperty(this, 'paused', { value: true, configurable: true });
    this.dispatchEvent(new Event('pause'));
  });
});

describe('Tarjetas con audio y lengua de señas', () => {
  test('muestran "Escuchar" y "Lengua de señas" con el título en el nombre; sin medios, no', async () => {
    mockApi({ '/posts?category=poesia&page=1&limit=10': ok([withMedia, { ...story, category: 'poesia' }], meta) });
    await renderRoute('/poesia');

    expect(screen.getByRole('button', { name: 'Escuchar «Orilla»' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Lengua de señas «Orilla»' })).toHaveAttribute('href', '/poesia/orilla#lengua-de-senas');
    expect(screen.queryByRole('button', { name: /Escuchar «El último colectivo»/ })).toBeNull();
    expect(screen.queryByRole('link', { name: /Lengua de señas «El último colectivo»/ })).toBeNull();
    expect(await axeViolations()).toEqual([]);
  });

  test('el botón alterna Escuchar / Pausar y suena un solo audio a la vez', async () => {
    const other = { ...withMedia, id: 'p2', slug: 'otro', title: 'Otro', audio: { url: 'https://ejemplo.com/otro.mp3', label: 'x' } };
    mockApi({ '/posts?category=poesia&page=1&limit=10': ok([withMedia, other], meta) });
    await renderRoute('/poesia');
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Escuchar «Orilla»' }));
    expect(screen.getByRole('button', { name: 'Pausar «Orilla»' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Escuchar «Otro»' }));
    expect(screen.getByRole('button', { name: 'Pausar «Otro»' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Escuchar «Orilla»' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Pausar «Otro»' }));
    expect(screen.getByRole('button', { name: 'Escuchar «Otro»' })).toBeInTheDocument();
  });

  test('si el audio no se puede reproducir, se avisa con texto y en la región viva', async () => {
    HTMLMediaElement.prototype.play.mockImplementation(() => Promise.reject(new DOMException('no', 'NotSupportedError')));
    mockApi({ '/posts?category=poesia&page=1&limit=10': ok([withMedia], meta) });
    await renderRoute('/poesia');
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Escuchar «Orilla»' }));
    expect(await screen.findByText('No se pudo reproducir el audio.')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId('announcer-assertive')).toHaveTextContent('No se pudo reproducir el audio de «Orilla».'),
    );
  });
});

describe('Detalle con audio y lengua de señas', () => {
  test('reproductor nativo con nombre, video insertado sin cookies y con título; secciones en la lista de encabezados', async () => {
    mockApi({ '/posts/poesia/orilla': ok(withMedia) });
    const { container } = await renderRoute('/poesia/orilla');

    const h2 = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent.trim());
    expect(h2).toContain('Escuchar: Lectura de la autora');
    expect(h2).toContain('Versión en lengua de señas');

    const audio = container.querySelector('audio[controls]');
    expect(audio).toHaveAttribute('src', AUDIO);
    expect(audio).toHaveAttribute('preload', 'none');

    const iframe = screen.getByTitle('Versión en lengua de señas de «Orilla» (video de YouTube)');
    expect(iframe).toHaveAttribute('src', `https://www.youtube-nocookie.com/embed/${VIDEO_ID}`);
    expect(screen.getByRole('link', { name: 'Ver en YouTube la versión en lengua de señas' })).toHaveAttribute(
      'href',
      withMedia.signVideoUrl,
    );
    expect(await axeViolations()).toEqual([]);
  });

  test('al llegar desde "Lengua de señas", el foco va a esa sección', async () => {
    mockApi({
      '/posts?category=poesia&page=1&limit=10': ok([withMedia], { ...meta, total: 1 }),
      '/posts/poesia/orilla': ok(withMedia),
    });
    await renderRoute('/poesia');
    const user = userEvent.setup();

    await user.click(screen.getByRole('link', { name: 'Lengua de señas «Orilla»' }));
    const section = await screen.findByRole('heading', { level: 2, name: 'Versión en lengua de señas' });
    await waitFor(() => expect(section).toHaveFocus());
  });
});

describe('Formulario: enlaces de audio y lengua de señas', () => {
  const ME = { '/auth/me': ok({ user: { id: 'u1', name: 'Ed', email: 'e@x.test', role: 'editor' } }) };

  test('con un enlace de audio válido aparece el reproductor de prueba; se envían audio y video', async () => {
    const calls = mockApi({
      ...ME,
      'POST /admin/posts': (body) => ok({ ...body, id: 'n1', slug: 'nuevo' }),
      '/admin/posts?page=1&limit=10': ok([], { ...meta, total: 0 }),
    });
    await renderRoute('/panel/publicaciones/nueva');
    const user = userEvent.setup();

    const group = screen.getByRole('group', { name: 'Audio y lengua de señas' });
    await user.type(within(group).getByLabelText('Enlace al audio (opcional)'), 'https://soundcloud.com/autora');
    expect(within(group).getByText(/todavía no parece un archivo de audio/)).toBeInTheDocument();

    await user.clear(within(group).getByLabelText('Enlace al audio (opcional)'));
    await user.type(within(group).getByLabelText('Enlace al audio (opcional)'), AUDIO);
    expect(within(group).getByText('Probá que se escuche antes de guardar:')).toBeInTheDocument();

    await user.type(within(group).getByLabelText('Descripción del audio (opcional)'), 'Lectura de la autora');
    await user.type(within(group).getByLabelText('Video en lengua de señas (YouTube) (opcional)'), `https://youtu.be/${VIDEO_ID}`);

    await user.type(screen.getByLabelText('Título'), 'Con medios');
    await user.type(screen.getByLabelText('Autor o autora'), 'Ana');
    await user.type(screen.getByLabelText('Texto'), 'verso');
    await user.click(screen.getByRole('button', { name: 'Guardar borrador' }));

    await screen.findByText(/Se guardó el borrador/);
    const sent = calls.find((c) => c.method === 'POST').body;
    expect(sent.audio).toEqual({ url: AUDIO, label: 'Lectura de la autora' });
    expect(sent.signVideoUrl).toBe(`https://youtu.be/${VIDEO_ID}`);
  });

  test('sin enlaces se envía audio null y video vacío; los errores de la API se muestran en su campo', async () => {
    const calls = mockApi({
      ...ME,
      'POST /admin/posts': {
        status: 400,
        body: {
          ok: false,
          error: {
            message: 'Hay datos inválidos.',
            code: 'VALIDATION_ERROR',
            details: [{ field: 'signVideoUrl', message: 'Tiene que ser un enlace a un video de YouTube' }],
          },
        },
      },
    });
    await renderRoute('/panel/publicaciones/nueva');
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Guardar borrador' }));
    const field = await screen.findByLabelText('Video en lengua de señas (YouTube) (opcional)');
    await waitFor(() => expect(field).toHaveAttribute('aria-invalid', 'true'));
    expect(field).toHaveAccessibleDescription(/Error: Tiene que ser un enlace a un video de YouTube/);

    const sent = calls.find((c) => c.method === 'POST').body;
    expect(sent.audio).toBeNull();
    expect(sent.signVideoUrl).toBe('');
  });
});
