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
    expect(screen.getByRole('link', { name: 'Mis guardados' })).toHaveAttribute('href', '/guardados');
    expect(screen.queryByRole('link', { name: 'Comentar' })).toBeNull();
    expect(screen.queryByRole('heading', { name: /Comentarios/ })).toBeNull();
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

});

describe('Postulación a convocatorias', () => {
  const callWithForm = { ...openCall, acceptsApplications: true, readingMinutes: 1 };

  test('el formulario modelo de Borde: secciones, lista, opciones y enlace; al enviar, la confirmación recibe el foco', async () => {
    const calls = mockApi({
      '/posts/convocatorias/convocatoria-antologia': ok(callWithForm),
      'POST /posts/convocatorias/convocatoria-antologia/applications': { status: 201, body: { ok: true, data: { received: true } } },
    });
    await renderRoute('/convocatorias/convocatoria-antologia');
    const user = userEvent.setup();
    const form = screen.getByRole('region', { name: 'Postulate' });
    for (const title of ['Datos personales', 'Presentación personal', 'Sobre tu obra', 'Accesibilidad y apoyos', 'Confirmación']) {
      expect(within(form).getByRole('heading', { level: 3, name: title })).toBeInTheDocument();
    }
    expect(within(form).getByRole('textbox', { name: /^Nombre artístico o seudónimo/ })).toBeInTheDocument();
    expect(within(form).queryByRole('textbox', { name: /Correo electrónico/ })).toBeNull();
    expect(within(form).getByRole('radiogroup', { name: '¿En qué formato presentás tu obra?' })).toHaveAttribute('aria-required', 'true');
    expect(await axeViolations()).toEqual([]);

    await user.type(within(form).getByRole('textbox', { name: 'Nombre y apellido' }), 'Ana Pérez');
    await user.type(within(form).getByRole('textbox', { name: 'Edad' }), '27');
    await user.selectOptions(within(form).getByRole('combobox', { name: 'Departamento de residencia' }), 'Rocha');
    await user.type(within(form).getByRole('textbox', { name: 'Medio de contacto' }), '099 123 456');
    await user.type(within(form).getByRole('textbox', { name: 'Título de la obra' }), 'Orilla');
    await user.click(within(form).getByRole('radio', { name: 'Audio' }));
    await user.click(within(form).getByRole('radio', { name: 'Lengua de Señas Uruguaya (LSU)' }));
    await user.type(within(form).getByRole('textbox', { name: 'Enlace a tu obra' }), 'https://drive.google.com/x');
    await user.click(within(form).getByLabelText(/Confirmo que deseo presentar esta obra/));
    await user.click(within(form).getByRole('button', { name: 'Enviar postulación' }));

    const done = await screen.findByText('Recibimos tu postulación.');
    await waitFor(() => expect(done.closest('.notice')).toHaveFocus());
    const sent = calls.find((c) => c.method === 'POST').body;
    expect(sent.consent).toBe(true);
    expect(sent.answers).toMatchObject({
      name: 'Ana Pérez',
      edad: '27',
      departamento: 'Rocha',
      contact: '099 123 456',
      workTitle: 'Orilla',
      formato: 'Audio',
      idioma: 'Lengua de Señas Uruguaya (LSU)',
      obra: 'https://drive.google.com/x',
      seudonimo: '',
    });
  });

  test('los errores de la API se muestran en su pregunta (también en las opciones) y en la confirmación', async () => {
    mockApi({
      '/posts/convocatorias/convocatoria-antologia': ok(callWithForm),
      'POST /posts/convocatorias/convocatoria-antologia/applications': fail(400, 'Hay datos inválidos.', {
        code: 'VALIDATION_ERROR',
        details: [
          { field: 'answers.formato', message: 'Elegí una opción' },
          { field: 'consent', message: 'Para postularte tenés que marcar la confirmación' },
        ],
      }),
    });
    await renderRoute('/convocatorias/convocatoria-antologia');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Enviar postulación' }));
    const box = await screen.findByLabelText(/Confirmo que deseo presentar/);
    await waitFor(() => expect(box).toHaveAttribute('aria-invalid', 'true'));
    expect(box).toHaveAccessibleDescription(/Error: Para postularte/);
    const group = screen.getByRole('radiogroup', { name: '¿En qué formato presentás tu obra?' });
    expect(group).toHaveAttribute('aria-invalid', 'true');
    expect(group).toHaveAccessibleDescription(/Error: Elegí una opción/);
    expect(screen.getByRole('link', { name: 'Elegí una opción' })).toHaveAttribute('href', '#campo-application-answers-formato');
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
    const workshop = { ...poem, category: 'talleres', slug: 'taller', title: 'Taller' };
    mockApi({ '/posts/talleres/taller': ok(workshop), '/supporters': ok(supporters) });
    await renderRoute('/talleres/taller');
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

describe('Panel: postulaciones', () => {
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

describe('Pie y orden del artículo', () => {
  test('el pie dice "Borde | Relatos al margen" (la barra no se lee) y tiene Instagram y YouTube', async () => {
    mockApi({ '/posts/poesia/orilla': ok(poem) });
    await renderRoute('/poesia/orilla');
    const footer = screen.getByRole('contentinfo');
    const name = footer.querySelector('.site-footer__name');
    expect(name).toHaveTextContent('Borde | Relatos al margen');
    expect(within(name).getByText('|')).toHaveAttribute('aria-hidden', 'true');
    const social = within(footer).getByRole('list', { name: 'Redes sociales' });
    expect(within(social).getByRole('link', { name: 'Borde en Instagram' })).toBeInTheDocument();
    expect(within(social).getByRole('link', { name: 'Borde en YouTube' })).toBeInTheDocument();
    expect(within(footer).queryByRole('link', { name: /Acerca|Guardados|Ingreso/ })).toBeNull();
    expect(document.body.textContent).not.toMatch(/Borde\./);
    expect(await axeViolations()).toEqual([]);
  });

  test('imagen → título → audio → lengua de señas → texto', async () => {
    const full = {
      ...poem,
      image: { url: 'https://example.com/orilla.jpg', alt: 'Una orilla al atardecer' },
      audio: { url: 'https://example.com/orilla.mp3', label: 'Lectura de la autora' },
      signVideoId: 'abcdefghijk',
      signVideoUrl: 'https://www.youtube.com/watch?v=abcdefghijk',
    };
    mockApi({ '/posts/poesia/orilla': ok(full) });
    await renderRoute('/poesia/orilla');
    const article = screen.getByRole('article');
    const order = [
      within(article).getByRole('img', { name: 'Una orilla al atardecer' }),
      within(article).getByRole('heading', { level: 1 }),
      within(article).getByRole('heading', { name: /Escuchar/ }),
      within(article).getByRole('heading', { name: /Lengua de Señas Uruguaya/ }),
      article.querySelector('.prose'),
    ];
    for (let i = 1; i < order.length; i++) {
      expect(order[i - 1].compareDocumentPosition(order[i]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });
});

describe('Capítulos, apertura y talleres', () => {
  test('un cuento con capítulos muestra un índice y cada capítulo como sección', async () => {
    const story = {
      ...poem,
      category: 'cuentos',
      slug: 'novela',
      title: 'Novela',
      bodyHtml: '',
      chapters: [
        { title: 'La partida', bodyHtml: '<p>Uno</p>' },
        { title: 'El regreso', bodyHtml: '<p>Dos</p>' },
      ],
    };
    mockApi({ '/posts/cuentos/novela': ok(story) });
    await renderRoute('/cuentos/novela');
    const index = screen.getByRole('navigation', { name: 'Capítulos' });
    expect(within(index).getByRole('link', { name: 'El regreso' })).toHaveAttribute('href', '#capitulo-2');
    expect(screen.getByRole('heading', { level: 2, name: 'Capítulo 2 El regreso' })).toHaveAttribute('id', 'capitulo-2');
    expect(screen.getByRole('region', { name: 'Capítulo 1 La partida' })).toHaveTextContent('Uno');
    expect(await axeViolations()).toEqual([]);
  });

  test('una convocatoria que todavía no abrió dice "Próximamente", muestra la apertura y no el formulario', async () => {
    const soon = { ...openCall, callStatus: 'proxima', opensAt: '2026-11-01T03:00:00.000Z', acceptsApplications: true };
    mockApi({ '/posts/convocatorias/convocatoria-antologia': ok(soon) });
    await renderRoute('/convocatorias/convocatoria-antologia');
    expect(screen.getAllByText('Próximamente').length).toBeGreaterThan(0);
    expect(screen.getByText('Apertura')).toBeInTheDocument();
    expect(screen.getByText(/todavía no abrió/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enviar postulación' })).toBeNull();
  });

  test('en la portada, talleres y convocatorias van a todo el ancho; poesía en tarjetas', async () => {
    const workshop = { ...poem, id: 't1', category: 'talleres', slug: 'taller', title: 'Taller de escritura' };
    mockApi({ '/posts/latest?perCategory=3': ok({ poesia: [poem], cuentos: [], talleres: [workshop], convocatorias: [openCall] }) });
    await renderRoute('/');
    const talleres = screen.getByRole('region', { name: 'Talleres' });
    expect(talleres.querySelector('.call-banner')).not.toBeNull();
    expect(within(talleres).getByText(/Por Lucía Ferreyra/)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Poesía' }).querySelector('.post-card')).not.toBeNull();
    expect(await axeViolations()).toEqual([]);
  });
});

describe('Panel: capítulos', () => {
  test('agregar, reordenar y quitar capítulos; se envían en orden', async () => {
    const calls = mockApi({ ...ME, 'POST /admin/posts': { status: 201, body: { ok: true, data: { title: 'Novela', status: 'draft' } } }, '/admin/posts?page=1&limit=10': ok([], { page: 1, limit: 10, total: 0, totalPages: 0 }) });
    await renderRoute('/panel/publicaciones/nueva');
    const user = userEvent.setup();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Categoría' }), 'cuentos');
    await user.type(screen.getByRole('textbox', { name: 'Título' }), 'Novela');
    await user.type(screen.getByRole('textbox', { name: 'Autor o autora' }), 'Ana');

    await user.click(screen.getByRole('button', { name: 'Agregar capítulo' }));
    expect(screen.getByRole('textbox', { name: 'Título del capítulo 1' })).toHaveFocus();
    await user.keyboard('Primero');
    await user.type(screen.getByRole('textbox', { name: 'Texto del capítulo 1' }), 'Texto uno');
    await user.click(screen.getByRole('button', { name: 'Agregar capítulo' }));
    await user.keyboard('Segundo');
    await user.type(screen.getByRole('textbox', { name: 'Texto del capítulo 2' }), 'Texto dos');

    await user.click(screen.getByRole('button', { name: 'Subir el capítulo 2' }));
    expect(screen.getByRole('textbox', { name: 'Título del capítulo 1' })).toHaveValue('Segundo');
    await waitFor(() => expect(screen.getByTestId('announcer-polite')).toHaveTextContent('El capítulo pasó al lugar 1.'));
    expect(await axeViolations()).toEqual([]);

    await user.click(screen.getByRole('button', { name: 'Guardar borrador' }));
    await waitFor(() => expect(calls.some((c) => c.method === 'POST')).toBe(true));
    expect(calls.find((c) => c.method === 'POST').body.chapters).toEqual([
      { title: 'Segundo', body: 'Texto dos' },
      { title: 'Primero', body: 'Texto uno' },
    ]);
  });
});

describe('Final de poemas y cuentos', () => {
  const supporters = [{ id: 's1', name: 'Municipio', role: 'impulsan', logoUrl: '/api/images/aaaaaaaaaaaaaaaaaaaaaaaa', link: null }];

  test('en un poema no van los logos y hay "Volver a Inicio" y "Volver a Poesía"', async () => {
    const calls = mockApi({ '/posts/poesia/orilla': ok(poem), '/supporters': ok(supporters) });
    await renderRoute('/poesia/orilla');
    const back = screen.getByRole('navigation', { name: 'Volver' });
    expect(within(back).getByRole('link', { name: 'Volver a Inicio' })).toHaveAttribute('href', '/');
    expect(within(back).getByRole('link', { name: 'Volver a Poesía' })).toHaveAttribute('href', '/poesia');
    expect(screen.queryByRole('region', { name: 'Acompañan a Borde' })).toBeNull();
    expect(calls.some((c) => c.path === '/supporters')).toBe(false);
    expect(await axeViolations()).toEqual([]);
  });

  test('la tarjeta dice "Lengua de Señas Uruguaya"; la portada no tiene la frase de presentación', async () => {
    mockApi({ '/posts/latest?perCategory=3': ok({ poesia: [{ ...poem, signVideoId: 'abcdefghijk' }], cuentos: [], talleres: [], convocatorias: [] }) });
    await renderRoute('/');
    expect(screen.getByRole('link', { name: 'Lengua de Señas Uruguaya «Orilla»' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Borde Relatos al margen');
    expect(screen.queryByText(/Un espacio de lectura/)).toBeNull();
  });
});

describe('Portada y centrado', () => {
  test('"Ver toda la poesía" va después de las tarjetas', async () => {
    mockApi({ '/posts/latest?perCategory=3': ok({ poesia: [poem], cuentos: [], talleres: [], convocatorias: [] }) });
    await renderRoute('/');
    const region = screen.getByRole('region', { name: 'Poesía' });
    const card = within(region).getByRole('link', { name: 'Orilla' });
    const more = within(region).getByRole('link', { name: 'Ver toda la poesía' });
    expect(card.compareDocumentPosition(more) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  test('un taller también se lee en una columna centrada', async () => {
    mockApi({ '/posts/talleres/taller': ok({ ...poem, category: 'talleres', slug: 'taller', title: 'Taller' }) });
    await renderRoute('/talleres/taller');
    expect(screen.getByRole('article').closest('.column-centered')).not.toBeNull();
  });
});

describe('Panel: editor del formulario de postulación', () => {
  test('aparece al activar las postulaciones, con el modelo de Borde; se agregan preguntas con opciones', async () => {
    const calls = mockApi({
      ...ME,
      'POST /admin/posts': { status: 201, body: { ok: true, data: { title: 'C', status: 'draft' } } },
      '/admin/posts?page=1&limit=10': ok([], { page: 1, limit: 10, total: 0, totalPages: 0 }),
    });
    await renderRoute('/panel/publicaciones/nueva');
    const user = userEvent.setup();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Categoría' }), 'convocatorias');
    expect(screen.queryByRole('group', { name: /Formulario de postulación/ })).toBeNull();
    await user.click(screen.getByLabelText('Recibir postulaciones con el formulario del sitio'));
    const editor = screen.getByRole('group', { name: /Formulario de postulación/ });

    // Arranca con el modelo de Borde.
    expect(within(editor).getByRole('textbox', { name: 'Título de la sección 1' })).toHaveValue('Datos personales');
    expect(within(editor).queryByRole('button', { name: /Quitar el elemento 2$/ })).toBeNull(); // "Nombre y apellido" no se quita

    await user.click(within(editor).getByRole('button', { name: 'Agregar una pregunta' }));
    const count = within(editor).getAllByRole('group', { name: /^\d+\. / }).length;
    const label = within(editor).getByRole('textbox', { name: `Texto de la pregunta ${count}` });
    expect(label).toHaveFocus();
    await user.keyboard('¿Participaste antes?');
    await user.selectOptions(within(editor).getByRole('combobox', { name: `Tipo de respuesta de la pregunta ${count}` }), 'choice');
    await user.type(within(editor).getByRole('textbox', { name: `Opciones de la pregunta ${count}` }), 'Sí{Enter}No');
    expect(await axeViolations()).toEqual([]);

    await user.type(screen.getByRole('textbox', { name: 'Título' }), 'C');
    await user.click(screen.getByRole('button', { name: 'Guardar borrador' }));
    await waitFor(() => expect(calls.some((c) => c.method === 'POST')).toBe(true));
    const sent = calls.find((c) => c.method === 'POST').body.applicationForm;
    expect(sent.items.map((i) => i.key)).toContain('departamento');
    expect(sent.items.at(-1)).toEqual({
      key: expect.stringMatching(/^p[a-z0-9]+$/),
      type: 'choice',
      label: '¿Participaste antes?',
      hint: '',
      required: false,
      options: ['Sí', 'No'],
    });
  });
});
