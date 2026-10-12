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
  test('formulario: no muestra el correo del equipo; está en el menú; sin violaciones', async () => {
    mockApi({});
    await renderRoute('/contacto');
    expect(screen.getByRole('heading', { level: 1, name: 'Contacto' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Nombre' })).toHaveAttribute('aria-required', 'true');
    expect(screen.getByRole('textbox', { name: 'Correo electrónico' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Mensaje' })).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/@gmail.com/);
    expect(screen.queryByRole('link', { name: /correo/i })).toBeNull();
    expect(screen.getByRole('navigation', { name: 'Principal' })).toHaveTextContent('Contacto');
    expect(await axeViolations()).toEqual([]);
  });

  test('envía el mensaje y la confirmación recibe el foco', async () => {
    const calls = mockApi({ 'POST /contact': { status: 201, body: { ok: true, data: { received: true } } } });
    await renderRoute('/contacto');
    const user = userEvent.setup();
    await user.type(screen.getByRole('textbox', { name: 'Nombre' }), 'Ana');
    await user.type(screen.getByRole('textbox', { name: 'Correo electrónico' }), 'ana@ejemplo.com');
    await user.type(screen.getByRole('textbox', { name: 'Mensaje' }), 'Hola');
    await user.click(screen.getByRole('button', { name: 'Enviar mensaje' }));
    const done = await screen.findByText('Mensaje enviado.');
    await waitFor(() => expect(done.closest('.notice')).toHaveFocus());
    expect(calls.find((c) => c.method === 'POST').body).toMatchObject({ name: 'Ana', email: 'ana@ejemplo.com', message: 'Hola' });
  });

  test('errores: resumen y cada campo marcado', async () => {
    mockApi({
      'POST /contact': fail(400, 'Revisá los datos', {
        code: 'VALIDATION_ERROR',
        details: [
          { field: 'email', message: 'Escribí un correo electrónico válido, por ejemplo nombre@ejemplo.com' },
          { field: 'message', message: 'Escribí tu mensaje' },
        ],
      }),
    });
    await renderRoute('/contacto');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Enviar mensaje' }));
    expect(await screen.findAllByText('Escribí tu mensaje')).not.toHaveLength(0);
    await waitFor(() => expect(document.title).toMatch(/^Error: Contacto/));
    expect(screen.getByRole('textbox', { name: 'Mensaje' })).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('textbox', { name: 'Correo electrónico' })).toHaveAccessibleDescription(/Error: Escribí un correo/);
  });
});

describe('Logos al pie y portada', () => {
  const supporters = [
    { id: 's1', name: 'Municipio', role: 'impulsan', logoUrl: '/api/images/aaaaaaaaaaaaaaaaaaaaaaaa', link: 'https://municipio.example' },
    { id: 's2', name: 'Biblioteca Popular', role: 'colaboran', logoUrl: '/api/images/bbbbbbbbbbbbbbbbbbbbbbbb', link: null },
  ];

  test('se muestran agrupados dentro del pie, con el nombre como texto alternativo', async () => {
    mockApi({ '/posts/poesia/orilla': ok(poem), '/supporters': ok(supporters) });
    await renderRoute('/poesia/orilla');
    const footer = screen.getByRole('contentinfo');
    const region = await within(footer).findByRole('region', { name: 'Acompañan a Borde' });
    expect(within(region).getByRole('list', { name: 'Impulsan' })).toBeInTheDocument();
    expect(within(region).getByRole('link', { name: 'Municipio' })).toHaveAttribute('href', 'https://municipio.example');
    expect(within(region).getByRole('img', { name: 'Biblioteca Popular' })).toBeInTheDocument();
    expect(within(region).queryByRole('list', { name: 'Apoyan' })).toBeNull();
    expect(within(footer).queryByRole('link', { name: /Ingreso/ })).toBeNull();
    expect(await axeViolations()).toEqual([]);
  });

  test('sin logos, la sección no aparece', async () => {
    mockApi({ '/posts/poesia/orilla': ok(poem), '/supporters': ok([]) });
    await renderRoute('/poesia/orilla');
    expect(screen.queryByRole('region', { name: 'Acompañan a Borde' })).toBeNull();
  });

  test('poesía y cuentos van en una columna centrada; talleres no', async () => {
    mockApi({
      '/posts/poesia/orilla': ok(poem),
      '/posts?category=talleres&page=1&limit=10': ok([], { page: 1, limit: 10, total: 0, totalPages: 0 }),
    });
    const { router } = await renderRoute('/poesia/orilla');
    expect(screen.getByRole('article').closest('.column-centered')).not.toBeNull();
    await router.navigate('/talleres');
    await screen.findByRole('heading', { level: 1, name: 'Talleres' });
    expect(document.querySelector('.column-centered')).toBeNull();
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

describe('Panel: mensajes y logos', () => {
  test('mensajes: lista con aviso si no llegó por correo, responder y eliminar', async () => {
    mockApi({
      ...ME,
      '/admin/messages?page=1&limit=10': ok(
        [{ id: 'm1', name: 'Ana', email: 'ana@ejemplo.com', message: 'Hola', emailStatus: 'failed', createdAt: '2026-10-08T12:00:00.000Z' }],
        { page: 1, limit: 10, total: 1, totalPages: 1 },
      ),
    });
    await renderRoute('/panel/mensajes');
    expect(screen.getByRole('heading', { level: 1, name: 'Mensajes de contacto' })).toBeInTheDocument();
    expect(screen.getByText(/No llegó por correo/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Responder a Ana' })).toHaveAttribute('href', expect.stringMatching(/^mailto:ana@ejemplo\.com/));
    expect(screen.getByRole('button', { name: 'Eliminar el mensaje de Ana' })).toBeInTheDocument();
    expect(await axeViolations()).toEqual([]);
  });

  test('logos: agregar uno envía nombre, rol, logo y enlace, y lo anuncia', async () => {
    let list = [];
    const calls = mockApi({
      ...ME,
      '/admin/supporters': () => ok(list),
      'POST /admin/supporters': (body) => {
        list = [{ id: 's1', ...body, link: body.link || null }];
        return { status: 201, body: { ok: true, data: list[0] } };
      },
    });
    await renderRoute('/panel/logos');
    expect(screen.getByText(/Todavía no hay logos/)).toBeInTheDocument();
    expect(await axeViolations()).toEqual([]);

    const user = userEvent.setup();
    await user.type(screen.getByRole('textbox', { name: 'Nombre' }), 'Municipio');
    await user.selectOptions(screen.getByRole('combobox', { name: '¿Qué hace?' }), 'apoyan');
    await user.type(screen.getByRole('textbox', { name: /dirección de una imagen/ }), 'https://municipio.example/logo.png');
    await user.click(screen.getByRole('button', { name: 'Agregar logo' }));

    await waitFor(() => expect(calls.some((c) => c.method === 'POST')).toBe(true));
    expect(calls.find((c) => c.method === 'POST').body).toEqual({
      name: 'Municipio',
      role: 'apoyan',
      logoUrl: 'https://municipio.example/logo.png',
      link: '',
    });
    expect(await screen.findByRole('button', { name: 'Editar Municipio' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('heading', { level: 2, name: 'Cargados' })).toHaveFocus());
  });
});
