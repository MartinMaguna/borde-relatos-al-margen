import { describe, expect, test } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axeViolations, fail, mockApi, ok, renderRoute } from './utils.jsx';
import { poem, story } from './fixtures.js';

const USER = { id: 'u1', name: 'Editora Test', email: 'editora@test.local', role: 'editor' };
const ME = { '/auth/me': ok({ user: USER }) };
const NO_SESSION = { '/auth/me': fail(401, 'Tenés que iniciar sesión', { code: 'UNAUTHENTICATED' }) };
const listMeta = (total) => ({ page: 1, limit: 10, total, totalPages: 1 });
const adminPosts = [
  { ...poem, updatedAt: '2026-10-08T12:00:00.000Z' },
  { ...story, status: 'draft', updatedAt: '2026-10-01T12:00:00.000Z' },
];

describe('Acceso al panel', () => {
  test('sin sesión, una ruta del panel lleva al login recordando el destino', async () => {
    mockApi(NO_SESSION);
    const { router } = await renderRoute('/panel/acerca');

    expect(screen.getByRole('heading', { level: 1, name: 'Ingresar al panel' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/panel/ingresar');
    expect(router.state.location.search).toBe('?volver=%2Fpanel%2Facerca');
  });

  test('el formulario de login es accesible (axe) y sus campos tienen etiqueta y autocompletado', async () => {
    mockApi(NO_SESSION);
    await renderRoute('/panel/ingresar');

    expect(screen.getByLabelText('Correo electrónico')).toHaveAttribute('autocomplete', 'username');
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('autocomplete', 'current-password');
    expect(await axeViolations()).toEqual([]);
  });

  test('"Mostrar la contraseña" cambia el tipo del campo', async () => {
    mockApi(NO_SESSION);
    await renderRoute('/panel/ingresar');
    const user = userEvent.setup();

    await user.click(screen.getByLabelText('Mostrar la contraseña'));
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('type', 'text');
  });

  test('credenciales incorrectas: resumen de errores enfocado, campo marcado y título con "Error:"', async () => {
    mockApi({ ...NO_SESSION, 'POST /auth/login': fail(401, 'El correo o la contraseña no son correctos') });
    await renderRoute('/panel/ingresar');
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Correo electrónico'), 'editora@test.local');
    await user.type(screen.getByLabelText('Contraseña'), 'mala');
    await user.click(screen.getByRole('button', { name: 'Ingresar' }));

    const summary = await screen.findByRole('heading', { level: 2, name: 'Hay un problema' });
    await waitFor(() => expect(summary.closest('.error-summary')).toHaveFocus());
    expect(document.title).toMatch(/^Error: Ingresar al panel/);

    const email = screen.getByLabelText('Correo electrónico');
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(email).toHaveAccessibleDescription(/Error: El correo o la contraseña no son correctos/);

    // El enlace del resumen lleva el foco al campo.
    await user.click(within(summary.closest('.error-summary')).getByRole('link'));
    expect(email).toHaveFocus();
    expect(await axeViolations()).toEqual([]);
  });

  test('login correcto vuelve a la página que se había pedido', async () => {
    let loggedIn = false;
    mockApi({
      '/auth/me': () => (loggedIn ? ME['/auth/me'] : NO_SESSION['/auth/me']),
      'POST /auth/login': () => {
        loggedIn = true;
        return ok({ user: USER });
      },
      '/admin/pages/acerca': ok({ slug: 'acerca', title: 'Acerca de Borde', body: 'Hola' }),
    });
    await renderRoute('/panel/ingresar?volver=%2Fpanel%2Facerca');
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Correo electrónico'), 'editora@test.local');
    await user.type(screen.getByLabelText('Contraseña'), 'buena');
    await user.click(screen.getByRole('button', { name: 'Ingresar' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Editar la página Acerca' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Panel' })).toBeInTheDocument();
  });
});

describe('Listado del panel', () => {
  test('muestra publicaciones con estado en texto y acciones con nombre único (axe)', async () => {
    mockApi({ ...ME, '/admin/posts?page=1&limit=10': ok(adminPosts, listMeta(2)) });
    await renderRoute('/panel');

    expect(screen.getByRole('heading', { level: 1, name: 'Publicaciones' })).toBeInTheDocument();
    expect(screen.getByText('2 publicaciones.')).toBeInTheDocument();
    expect(screen.getByRole('search', { name: 'Filtrar publicaciones' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Editar «Orilla»' })).toHaveAttribute('href', '/panel/publicaciones/p1');
    expect(screen.getByRole('button', { name: 'Eliminar «El último colectivo»' })).toBeInTheDocument();
    // Solo las publicadas tienen "Ver en el sitio".
    expect(screen.getByRole('link', { name: 'Ver en el sitio «Orilla»' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Ver en el sitio «El último colectivo»' })).toBeNull();
    expect(screen.getByText('Borrador')).toBeInTheDocument();
    expect(await axeViolations()).toEqual([]);
  });

  test('los filtros se envían como parámetros de la URL', async () => {
    mockApi({
      ...ME,
      '/admin/posts?page=1&limit=10': ok(adminPosts, listMeta(2)),
      '/admin/posts?page=1&limit=10&status=draft&q=colectivo': ok([adminPosts[1]], listMeta(1)),
    });
    const { router } = await renderRoute('/panel');
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Buscar por título'), 'colectivo');
    await user.selectOptions(screen.getByLabelText('Estado'), 'draft');
    await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }));

    expect(await screen.findByText('1 publicación con estos filtros.')).toBeInTheDocument();
    expect(router.state.location.search).toBe('?q=colectivo&categoria=&estado=draft');
    expect(screen.getByRole('link', { name: 'Quitar filtros' })).toBeInTheDocument();
  });

  test('eliminar pide confirmación; Cancelar no borra y devuelve el foco', async () => {
    const calls = mockApi({ ...ME, '/admin/posts?page=1&limit=10': ok(adminPosts, listMeta(2)) });
    await renderRoute('/panel');
    const user = userEvent.setup();

    const trigger = screen.getByRole('button', { name: 'Eliminar «Orilla»' });
    await user.click(trigger);

    const dialog = screen.getByRole('dialog', { name: '¿Eliminar esta publicación?' });
    expect(dialog).toHaveAccessibleDescription(/Vas a eliminar «Orilla»/);
    expect(within(dialog).getByRole('button', { name: 'Cancelar' })).toHaveFocus();

    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(trigger).toHaveFocus();
    expect(calls.some((c) => c.method === 'DELETE')).toBe(false);
  });

  test('confirmar elimina, anuncia el resultado y lleva el foco al título', async () => {
    let deleted = false;
    const calls = mockApi({
      ...ME,
      '/admin/posts?page=1&limit=10': () =>
        deleted ? ok([adminPosts[1]], listMeta(1)) : ok(adminPosts, listMeta(2)),
      'DELETE /admin/posts/p1': () => {
        deleted = true;
        return ok({ id: 'p1', title: 'Orilla' });
      },
    });
    await renderRoute('/panel');
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Eliminar «Orilla»' }));
    await user.click(screen.getByRole('button', { name: 'Sí, eliminar' }));

    expect(await screen.findByText('Se eliminó «Orilla».')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('announcer-polite')).toHaveTextContent('Se eliminó «Orilla».'));
    expect(screen.getByRole('heading', { level: 1, name: 'Publicaciones' })).toHaveFocus();
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Eliminar «Orilla»' })).toBeNull());
    expect(calls.filter((c) => c.method === 'DELETE')).toHaveLength(1);
  });
});

describe('Formulario de publicación', () => {
  test('los campos de convocatoria aparecen solo al elegir esa categoría', async () => {
    mockApi(ME);
    await renderRoute('/panel/publicaciones/nueva');
    const user = userEvent.setup();

    expect(screen.queryByLabelText('Fecha límite')).toBeNull();
    await user.selectOptions(screen.getByLabelText('Categoría'), 'convocatorias');
    expect(screen.getByRole('group', { name: 'Datos de la convocatoria' })).toBeInTheDocument();
    expect(screen.getByLabelText('Fecha límite')).toHaveAttribute('type', 'date');
    expect(await axeViolations()).toEqual([]);
  });

  test('errores de validación: resumen enfocado, enlaces a campos y errores vinculados', async () => {
    mockApi({
      ...ME,
      'POST /admin/posts': fail(400, 'Hay datos inválidos. Revisá los campos marcados.', {
        code: 'VALIDATION_ERROR',
        details: [
          { field: 'title', message: 'El título es obligatorio' },
          { field: 'image.alt', message: 'El texto alternativo es obligatorio: describí qué muestra la imagen' },
        ],
      }),
    });
    await renderRoute('/panel/publicaciones/nueva');
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Dirección de la imagen (opcional)'), 'https://example.com/foto.jpg');
    await user.click(screen.getByRole('button', { name: 'Crear publicación' }));

    const heading = await screen.findByRole('heading', { level: 2, name: 'Hay 2 problemas' });
    await waitFor(() => expect(heading.closest('.error-summary')).toHaveFocus());
    expect(document.title).toMatch(/^Error: Nueva publicación/);

    const title = screen.getByLabelText('Título');
    expect(title).toHaveAttribute('aria-invalid', 'true');
    expect(title).toHaveAccessibleDescription('Error: El título es obligatorio');

    const alt = screen.getByLabelText('Texto alternativo (opcional)');
    expect(alt).toHaveAccessibleDescription(/Obligatorio si hay imagen.*Error: El texto alternativo es obligatorio/);

    // Lo escrito no se pierde.
    expect(screen.getByLabelText('Dirección de la imagen (opcional)')).toHaveValue('https://example.com/foto.jpg');

    await user.click(screen.getByRole('link', { name: /El texto alternativo es obligatorio/ }));
    expect(alt).toHaveFocus();
    expect(await axeViolations()).toEqual([]);
  });

  test('crear envía los datos y vuelve al listado con un aviso', async () => {
    const calls = mockApi({
      ...ME,
      'POST /admin/posts': (body) => ok({ ...body, id: 'n1', slug: 'nuevo', status: body.status }),
      '/admin/posts?page=1&limit=10': ok([], listMeta(0)),
    });
    await renderRoute('/panel/publicaciones/nueva');
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Título'), 'Nuevo poema');
    await user.type(screen.getByLabelText('Autor o autora'), 'Ana');
    await user.type(screen.getByLabelText('Texto'), 'verso uno{enter}verso dos');
    await user.click(screen.getByLabelText('Publicado (visible en el sitio)'));
    await user.click(screen.getByRole('button', { name: 'Crear publicación' }));

    expect(await screen.findByText('Se creó «Nuevo poema». Está publicada en el sitio.')).toBeInTheDocument();
    const sent = calls.find((c) => c.method === 'POST').body;
    expect(sent).toMatchObject({ title: 'Nuevo poema', author: 'Ana', category: 'poesia', status: 'published', image: null });
    expect(sent.body).toBe('verso uno\nverso dos');
  });

  test('editar carga los valores actuales', async () => {
    mockApi({ ...ME, '/admin/posts/p1': ok({ ...poem, body: 'El agua se fue' }) });
    await renderRoute('/panel/publicaciones/p1');

    expect(screen.getByRole('heading', { level: 1, name: 'Editar «Orilla»' })).toBeInTheDocument();
    expect(screen.getByLabelText('Título')).toHaveValue('Orilla');
    expect(screen.getByLabelText('Texto')).toHaveValue('El agua se fue');
    expect(screen.getByLabelText('Publicado (visible en el sitio)')).toBeChecked();
  });
});
