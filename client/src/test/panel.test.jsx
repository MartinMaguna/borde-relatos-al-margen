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

    await user.type(screen.getByLabelText('O pegá la dirección de una imagen (opcional)'), 'https://example.com/foto.jpg');
    await user.click(screen.getByRole('button', { name: 'Guardar borrador' }));

    const heading = await screen.findByRole('heading', { level: 2, name: 'Hay 2 problemas' });
    await waitFor(() => expect(heading.closest('.error-summary')).toHaveFocus());
    expect(document.title).toMatch(/^Error: Nueva publicación/);

    const title = screen.getByLabelText('Título');
    expect(title).toHaveAttribute('aria-invalid', 'true');
    expect(title).toHaveAccessibleDescription('Error: El título es obligatorio');

    const alt = screen.getByLabelText('Texto alternativo (opcional)');
    expect(alt).toHaveAccessibleDescription(/Obligatorio si hay imagen.*Error: El texto alternativo es obligatorio/);

    // Lo escrito no se pierde.
    expect(screen.getByLabelText('O pegá la dirección de una imagen (opcional)')).toHaveValue('https://example.com/foto.jpg');

    await user.click(screen.getByRole('link', { name: /El texto alternativo es obligatorio/ }));
    expect(alt).toHaveFocus();
    expect(await axeViolations()).toEqual([]);
  });

  async function fillRequired(user) {
    await user.type(screen.getByLabelText('Título'), 'Nuevo poema');
    await user.type(screen.getByLabelText('Autor o autora'), 'Ana');
    await user.type(screen.getByLabelText('Texto'), 'verso uno{enter}verso dos');
  }

  const createMocks = () =>
    mockApi({
      ...ME,
      'POST /admin/posts': (body) => ok({ ...body, id: 'n1', slug: 'nuevo' }),
      'POST /admin/images': ok({ id: 'a'.repeat(24), url: `/api/images/${'a'.repeat(24)}`, size: 1000, contentType: 'image/png' }),
      '/admin/posts?page=1&limit=10': ok([], listMeta(0)),
    });

  test('"Publicar" crea la publicación visible y vuelve al listado con un aviso', async () => {
    const calls = createMocks();
    await renderRoute('/panel/publicaciones/nueva');
    const user = userEvent.setup();

    await fillRequired(user);
    await user.click(screen.getByRole('button', { name: 'Publicar' }));

    expect(await screen.findByText('Se publicó «Nuevo poema». Ya está visible en el sitio.')).toBeInTheDocument();
    const sent = calls.find((c) => c.method === 'POST').body;
    expect(sent).toMatchObject({ title: 'Nuevo poema', author: 'Ana', category: 'poesia', status: 'published', image: null });
    expect(sent.body).toBe('verso uno\nverso dos');
  });

  test('"Guardar borrador" crea un borrador (no visible en el sitio)', async () => {
    const calls = createMocks();
    await renderRoute('/panel/publicaciones/nueva');
    const user = userEvent.setup();

    await fillRequired(user);
    await user.click(screen.getByRole('button', { name: 'Guardar borrador' }));

    expect(await screen.findByText(/Se guardó el borrador «Nuevo poema»/)).toBeInTheDocument();
    expect(calls.find((c) => c.method === 'POST').body.status).toBe('draft');
  });

  test('Enter en un campo guarda como borrador (nunca publica sin querer)', async () => {
    const calls = createMocks();
    await renderRoute('/panel/publicaciones/nueva');
    const user = userEvent.setup();

    await fillRequired(user);
    await user.type(screen.getByLabelText('Autor o autora'), '{enter}');

    await screen.findByText(/Se guardó el borrador/);
    expect(calls.find((c) => c.method === 'POST').body.status).toBe('draft');
  });

  test('subir una imagen: se anuncia, se muestra la vista previa y se envía su URL', async () => {
    const calls = createMocks();
    await renderRoute('/panel/publicaciones/nueva');
    const user = userEvent.setup();

    const file = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'foto.png', { type: 'image/png' });
    await user.upload(screen.getByLabelText('Subir una imagen (opcional)'), file);

    await waitFor(() =>
      expect(screen.getByTestId('announcer-polite')).toHaveTextContent('Imagen subida. Acordate de escribir el texto alternativo.'),
    );
    expect(screen.getByText('Imagen subida.')).toBeInTheDocument();
    expect(screen.getByLabelText('Reemplazar por otra imagen (opcional)')).toBeInTheDocument();
    // Con una imagen subida no se muestra el campo de dirección externa.
    expect(screen.queryByLabelText('O pegá la dirección de una imagen (opcional)')).toBeNull();
    expect(calls.find((c) => c.path === '/admin/images').body).toBeInstanceOf(FormData);

    await fillRequired(user);
    await user.type(screen.getByLabelText('Texto alternativo (opcional)'), 'Una mesa con libros');
    await user.click(screen.getByRole('button', { name: 'Guardar borrador' }));

    await screen.findByText(/Se guardó el borrador/);
    expect(calls.find((c) => c.path === '/admin/posts').body.image).toEqual({
      url: `/api/images/${'a'.repeat(24)}`,
      alt: 'Una mesa con libros',
    });
    expect(await axeViolations()).toEqual([]);
  });

  test('un archivo que no es imagen muestra el error junto al campo, sin subirlo', async () => {
    const calls = createMocks();
    await renderRoute('/panel/publicaciones/nueva');
    const user = userEvent.setup({ applyAccept: false });

    const input = screen.getByLabelText('Subir una imagen (opcional)');
    await user.upload(input, new File(['hola'], 'notas.txt', { type: 'text/plain' }));

    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription(/Error: El archivo tiene que ser una imagen/);
    expect(calls.some((c) => c.path === '/admin/images')).toBe(false);
  });

  test('"Quitar la imagen" la saca y devuelve el foco al selector de archivo', async () => {
    mockApi({
      ...ME,
      '/admin/posts/p1': ok({ ...poem, body: 'x', image: { url: `/api/images/${'b'.repeat(24)}`, alt: 'Foto' } }),
    });
    await renderRoute('/panel/publicaciones/p1');
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Quitar la imagen' }));
    expect(screen.queryByText('Imagen subida.')).toBeNull();
    expect(screen.getByLabelText('Subir una imagen (opcional)')).toHaveFocus();
  });

  test('editar una publicada: muestra el estado y ofrece "Guardar cambios" y "Pasar a borrador"', async () => {
    mockApi({ ...ME, '/admin/posts/p1': ok({ ...poem, body: 'El agua se fue' }) });
    await renderRoute('/panel/publicaciones/p1');

    expect(screen.getByRole('heading', { level: 1, name: 'Editar «Orilla»' })).toBeInTheDocument();
    expect(screen.getByLabelText('Título')).toHaveValue('Orilla');
    expect(screen.getByLabelText('Texto')).toHaveValue('El agua se fue');
    expect(screen.getByText(/Estado actual/)).toHaveTextContent('Estado actual: Publicado (visible en el sitio)');
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pasar a borrador' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Publicar' })).toBeNull();
  });
});
