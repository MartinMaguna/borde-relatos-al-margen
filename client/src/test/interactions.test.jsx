import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axeViolations, fail, mockApi, ok, renderRoute } from './utils.jsx';
import { openCall, poem } from './fixtures.js';
import { resetSavedCache } from '../lib/saved.js';

const poemWithTime = { ...poem, readingMinutes: 3 };
const ME = { '/auth/me': ok({ user: { id: 'u1', name: 'Ed', email: 'e@x.test', role: 'editor' } }) };

beforeEach(() => {
  localStorage.clear();
  resetSavedCache();
});
afterEach(() => localStorage.clear());

describe('Acciones del artículo', () => {
  test('muestra autor, tiempo de lectura y fecha, y las tres acciones', async () => {
    mockApi({ '/posts/poesia/orilla': ok(poemWithTime) });
    await renderRoute('/poesia/orilla');
    expect(screen.getByText(/Por Lucía Ferreyra · 3 minutos de lectura ·/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Compartir' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('link', { name: 'Comentar' })).toHaveAttribute('href', '#comentarios');
    expect(await axeViolations()).toEqual([]);
  });

  test('Guardar lo guarda en el navegador, lo anuncia y aparece en Guardados', async () => {
    mockApi({ '/posts/poesia/orilla': ok(poemWithTime) });
    const { router } = await renderRoute('/poesia/orilla');
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(screen.getByRole('button', { name: 'Quitar de guardados' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('announcer-polite')).toHaveTextContent(/Guardado en este navegador/));
    expect(JSON.parse(localStorage.getItem('borde:guardados'))[0]).toMatchObject({ slug: 'orilla', title: 'Orilla' });

    await router.navigate('/guardados');
    expect(await screen.findByRole('heading', { level: 1, name: 'Guardados' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Orilla' })).toHaveAttribute('href', '/poesia/orilla');

    await user.click(screen.getByRole('button', { name: 'Quitar «Orilla» de Guardados' }));
    expect(screen.getByText('Todavía no guardaste ningún texto.')).toBeInTheDocument();
  });

  test('Compartir despliega las opciones; Escape cierra y devuelve el foco; Copiar enlace se anuncia', async () => {
    mockApi({ '/posts/poesia/orilla': ok(poemWithTime) });
    await renderRoute('/poesia/orilla');
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue();
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    const share = screen.getByRole('button', { name: 'Compartir' });
    await user.click(share);
    expect(share).toHaveAttribute('aria-expanded', 'true');
    const panel = document.getElementById(share.getAttribute('aria-controls'));
    expect(within(panel).getByRole('link', { name: 'WhatsApp (se abre en otra pestaña)' }).getAttribute('href')).toMatch(/^https:\/\/wa\.me\/\?text=/);
    expect(within(panel).getByRole('link', { name: 'Correo electrónico' }).getAttribute('href')).toMatch(/^mailto:\?subject=Orilla/);
    expect(within(panel).getByRole('link', { name: 'Facebook (se abre en otra pestaña)' })).toBeInTheDocument();
    expect(within(panel).getByRole('link', { name: 'LinkedIn (se abre en otra pestaña)' })).toBeInTheDocument();
    expect(await axeViolations()).toEqual([]);

    await user.keyboard('{Escape}');
    expect(share).toHaveAttribute('aria-expanded', 'false');
    expect(share).toHaveFocus();

    await user.click(share);
    await user.click(within(panel).getByRole('button', { name: 'Copiar enlace' }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('/poesia/orilla'));
    await waitFor(() => expect(screen.getByTestId('announcer-polite')).toHaveTextContent('Enlace copiado.'));
  });

  test('Comentar lleva el foco a la sección de comentarios', async () => {
    mockApi({ '/posts/poesia/orilla': ok(poemWithTime) });
    await renderRoute('/poesia/orilla');
    Element.prototype.scrollIntoView = vi.fn();
    await userEvent.setup().click(screen.getByRole('link', { name: 'Comentar' }));
    expect(screen.getByRole('heading', { level: 2, name: /Comentarios/ })).toHaveFocus();
  });
});

describe('Comentarios', () => {
  test('lista los aprobados y envía uno nuevo, que queda pendiente', async () => {
    const calls = mockApi({
      '/posts/poesia/orilla': ok(poemWithTime),
      '/posts/poesia/orilla/comments': ok([{ id: 'c1', name: 'Lu', text: 'Hermoso', createdAt: '2026-10-08T12:00:00.000Z' }]),
      'POST /posts/poesia/orilla/comments': { status: 201, body: { ok: true, data: { status: 'pending' } } },
    });
    await renderRoute('/poesia/orilla');
    const user = userEvent.setup();

    expect(screen.getByRole('heading', { level: 2, name: 'Comentarios (1)' })).toBeInTheDocument();
    expect(screen.getByText('Hermoso')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Tu nombre'), 'Ana');
    await user.type(screen.getByLabelText('Comentario'), 'Me encantó');
    await user.click(screen.getByRole('button', { name: 'Enviar comentario' }));

    expect(await screen.findByText(/se publicará cuando el equipo lo revise/, { selector: 'p.notice' })).toBeInTheDocument();
    expect(calls.find((c) => c.method === 'POST').body).toMatchObject({ name: 'Ana', text: 'Me encantó' });
    expect(screen.getByLabelText('Tu nombre')).toHaveValue('');
  });

  test('los errores de la API se muestran en sus campos', async () => {
    mockApi({
      '/posts/poesia/orilla': ok(poemWithTime),
      'POST /posts/poesia/orilla/comments': fail(400, 'Hay datos inválidos.', {
        code: 'VALIDATION_ERROR',
        details: [{ field: 'text', message: 'Escribí tu comentario' }],
      }),
    });
    await renderRoute('/poesia/orilla');
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Enviar comentario' }));
    const field = await screen.findByLabelText('Comentario');
    await waitFor(() => expect(field).toHaveAttribute('aria-invalid', 'true'));
    expect(field).toHaveAccessibleDescription(/Error: Escribí tu comentario/);
    expect(screen.getByRole('link', { name: 'Escribí tu comentario' })).toHaveAttribute('href', '#campo-comment-text');
  });
});

describe('Postulación a convocatorias', () => {
  const callWithForm = { ...openCall, acceptsApplications: true, readingMinutes: 1 };

  test('con la convocatoria abierta muestra el formulario; al enviar, la confirmación recibe el foco', async () => {
    const calls = mockApi({
      '/posts/convocatorias/convocatoria-antologia': ok(callWithForm),
      'POST /posts/convocatorias/convocatoria-antologia/applications': { status: 201, body: { ok: true, data: { received: true } } },
    });
    await renderRoute('/convocatorias/convocatoria-antologia');
    const user = userEvent.setup();
    const form = screen.getByRole('region', { name: 'Postulate' });
    expect(await axeViolations()).toEqual([]);

    await user.type(within(form).getByLabelText('Nombre y apellido'), 'Ana Pérez');
    await user.type(within(form).getByLabelText('Correo electrónico'), 'ana@ejemplo.com');
    await user.type(within(form).getByLabelText('Título de la obra'), 'Orilla');
    await user.type(within(form).getByLabelText('Texto (opcional)'), 'El agua se fue');
    await user.click(within(form).getByLabelText(/Leí las bases/));
    await user.click(within(form).getByRole('button', { name: 'Enviar postulación' }));

    const done = await screen.findByText('Recibimos tu postulación.');
    await waitFor(() => expect(done.closest('.notice')).toHaveFocus());
    expect(calls.find((c) => c.method === 'POST').body).toMatchObject({
      name: 'Ana Pérez',
      email: 'ana@ejemplo.com',
      workTitle: 'Orilla',
      text: 'El agua se fue',
      consent: true,
    });
  });

  test('el consentimiento sin marcar se muestra como error en la casilla', async () => {
    mockApi({
      '/posts/convocatorias/convocatoria-antologia': ok(callWithForm),
      'POST /posts/convocatorias/convocatoria-antologia/applications': fail(400, 'Hay datos inválidos.', {
        code: 'VALIDATION_ERROR',
        details: [{ field: 'consent', message: 'Para postularte tenés que aceptar las bases y el uso de tus datos' }],
      }),
    });
    await renderRoute('/convocatorias/convocatoria-antologia');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Enviar postulación' }));
    const box = await screen.findByLabelText(/Leí las bases/);
    await waitFor(() => expect(box).toHaveAttribute('aria-invalid', 'true'));
    expect(box).toHaveAccessibleDescription(/Error: Para postularte/);
  });

  test('cerrada, dice que no se reciben más postulaciones; sin formulario activado, no aparece', async () => {
    mockApi({ '/posts/convocatorias/convocatoria-antologia': ok({ ...callWithForm, callStatus: 'cerrada' }) });
    await renderRoute('/convocatorias/convocatoria-antologia');
    expect(screen.getByText(/ya cerró: no se reciben más postulaciones/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enviar postulación' })).toBeNull();
  });
});

describe('Contacto', () => {
  test('muestra el correo, permite escribir y copiarlo; está en el menú', async () => {
    mockApi({});
    await renderRoute('/contacto');
    expect(screen.getByRole('heading', { level: 1, name: 'Contacto' })).toBeInTheDocument();
    expect(screen.getByText('martinmaguna33@gmail.com')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Escribir un correo' })).toHaveAttribute('href', 'mailto:martinmaguna33@gmail.com');
    expect(screen.getByRole('navigation', { name: 'Principal' })).toHaveTextContent('Contacto');
    expect(await axeViolations()).toEqual([]);
  });
});

describe('Panel: comentarios y postulaciones', () => {
  test('moderar: aprobar un comentario pendiente lo anuncia', async () => {
    const calls = mockApi({
      ...ME,
      '/admin/comments?status=pending&page=1&limit=10': ok(
        [{ id: 'c1', name: 'Lu', text: 'Hermoso', status: 'pending', createdAt: '2026-10-08T12:00:00.000Z', post: { title: 'Orilla', slug: 'orilla', category: 'poesia' } }],
        { page: 1, limit: 10, total: 1, totalPages: 1 },
      ),
      'PATCH /admin/comments/c1': ok({ id: 'c1', status: 'approved' }),
    });
    await renderRoute('/panel/comentarios');
    expect(screen.getByRole('link', { name: 'Pendientes' })).toHaveAttribute('aria-current', 'page');
    expect(await axeViolations()).toEqual([]);

    await userEvent.setup().click(screen.getByRole('button', { name: 'Aprobar el comentario de Lu' }));
    await waitFor(() => expect(screen.getByTestId('announcer-polite')).toHaveTextContent('Se aprobó el comentario de Lu'));
    expect(calls.find((c) => c.method === 'PATCH').body).toEqual({ status: 'approved' });
  });

  test('postulaciones: lista con datos, texto desplegable y descarga en CSV', async () => {
    mockApi({
      ...ME,
      '/admin/posts/v1/applications': ok({
        post: { id: 'v1', title: 'Antología', slug: 'antologia', category: 'convocatorias' },
        applications: [
          { id: 'a1', name: 'Ana', email: 'ana@ejemplo.com', workTitle: 'Orilla', text: 'El agua', link: null, message: '', createdAt: '2026-10-08T12:00:00.000Z' },
        ],
      }),
    });
    await renderRoute('/panel/publicaciones/v1/postulaciones');
    expect(screen.getByRole('heading', { level: 1, name: 'Postulaciones: «Antología»' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Ana: «Orilla»' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Descargar todas en CSV/ })).toHaveAttribute('href', '/api/admin/posts/v1/applications.csv');
    expect(screen.getByText('Ver el texto')).toBeInTheDocument();
    expect(await axeViolations()).toEqual([]);
  });
});
