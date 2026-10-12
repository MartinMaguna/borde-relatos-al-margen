import { describe, expect, test, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axeViolations, mockApi, ok, renderRoute } from './utils.jsx';
import { latest, openCall, poem } from './fixtures.js';

const listMeta = (page, totalPages, total) => ({ page, limit: 10, total, totalPages });

describe('Layout accesible', () => {
  test('"Saltar al contenido" es el primer elemento enfocable y apunta al main', async () => {
    mockApi({ '/posts/latest?perCategory=3': ok(latest) });
    await renderRoute('/');

    await userEvent.tab();
    const skip = screen.getByRole('link', { name: 'Saltar al contenido' });
    expect(skip).toHaveFocus();
    expect(skip).toHaveAttribute('href', '#contenido');
    expect(screen.getByRole('main')).toHaveAttribute('id', 'contenido');
  });

  test('tiene landmarks únicos y etiquetados, y un solo h1', async () => {
    mockApi({ '/posts/latest?perCategory=3': ok(latest) });
    await renderRoute('/');

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Principal' })).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  test('el menú tiene los elementos en orden y marca la página actual', async () => {
    mockApi({ '/posts/latest?perCategory=3': ok(latest) });
    await renderRoute('/');

    const nav = screen.getByRole('navigation', { name: 'Principal' });
    const links = within(nav).getAllByRole('link', { hidden: true });
    expect(links.map((l) => l.textContent)).toEqual(['Inicio', 'Poesía', 'Cuentos', 'Talleres', 'Convocatorias', 'Acerca', 'Contacto']);
    expect(within(nav).getByRole('link', { name: 'Inicio', hidden: true })).toHaveAttribute('aria-current', 'page');
  });

  test('botón de menú móvil: aria-expanded, aria-controls y Escape devuelve el foco', async () => {
    mockApi({ '/posts/latest?perCategory=3': ok(latest) });
    await renderRoute('/');
    const user = userEvent.setup();

    const button = screen.getByRole('button', { name: 'Menú' });
    const list = document.getElementById(button.getAttribute('aria-controls'));
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(list).not.toBeVisible();

    await user.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(list).toBeVisible();

    await user.tab(); // entra al menú
    await user.keyboard('{Escape}');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveFocus();
  });

  test('al navegar, el foco va al h1 y se actualiza document.title', async () => {
    mockApi({
      '/posts/latest?perCategory=3': ok(latest),
      '/posts?category=poesia&page=1&limit=10': ok([poem], listMeta(1, 1, 1)),
    });
    await renderRoute('/');
    const user = userEvent.setup();

    await user.click(screen.getByRole('link', { name: 'Ver toda la poesía' }));

    const h1 = await screen.findByRole('heading', { level: 1, name: 'Poesía' });
    await waitFor(() => expect(h1).toHaveFocus());
    expect(document.title).toBe('Poesía · Borde Relatos al Margen');
  });
});

describe('Vistas públicas', () => {
  test('Inicio: jerarquía h1 → h2 por categoría → h3 por publicación, sin violaciones de axe', async () => {
    mockApi({ '/posts/latest?perCategory=3': ok(latest) });
    await renderRoute('/');

    const h2 = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(h2).toEqual(['Poesía', 'Cuentos', 'Talleres', 'Convocatorias']);
    expect(screen.getByRole('heading', { level: 3, name: 'Orilla' })).toBeInTheDocument();
    expect(screen.getByText('Por ahora no hay talleres anunciados.')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Poesía' })).toBeInTheDocument();
    expect(await axeViolations()).toEqual([]);
  });

  test('Listado: paginación accesible y página actual en el título', async () => {
    mockApi({ '/posts?category=poesia&page=2&limit=10': ok([poem], listMeta(2, 3, 21)) });
    await renderRoute('/poesia?pagina=2');

    const pagination = screen.getByRole('navigation', { name: 'Paginación' });
    expect(within(pagination).getByRole('link', { name: 'Página 2' })).toHaveAttribute('aria-current', 'page');
    expect(within(pagination).getByRole('link', { name: 'Anterior: página 1' })).toHaveAttribute('href', '/poesia');
    expect(within(pagination).getByRole('link', { name: 'Siguiente: página 3' })).toHaveAttribute('href', '/poesia?pagina=3');
    expect(document.title).toBe('Poesía (página 2 de 3) · Borde Relatos al Margen');
    expect(await axeViolations()).toEqual([]);
  });

  test('Detalle de convocatoria: estado en texto, fecha límite, bases e imagen con alt', async () => {
    mockApi({ '/posts/convocatorias/convocatoria-antologia': ok(openCall) });
    await renderRoute('/convocatorias/convocatoria-antologia');

    expect(screen.getByRole('heading', { level: 1, name: openCall.title })).toBeInTheDocument();
    expect(screen.getByText('Abierta')).toBeInTheDocument();
    expect(screen.getByText('29 de noviembre de 2026')).toHaveAttribute('datetime', openCall.deadline);
    expect(screen.getByRole('link', { name: /Leer las bases/ })).toHaveAttribute('href', openCall.basesUrl);
    expect(screen.getByRole('img', { name: openCall.image.alt })).toBeInTheDocument();

    const breadcrumbs = screen.getByRole('navigation', { name: 'Ruta de navegación' });
    expect(within(breadcrumbs).getByText(openCall.title)).toHaveAttribute('aria-current', 'page');
    expect(await axeViolations()).toEqual([]);
  });

  test('Detalle de poema: respeta los versos', async () => {
    mockApi({ '/posts/poesia/orilla': ok(poem) });
    const { container } = await renderRoute('/poesia/orilla');
    expect(container.querySelector('.prose--poesia br')).not.toBeNull();
  });

  test('Acerca sin contenido muestra un texto por defecto', async () => {
    mockApi({});
    await renderRoute('/acerca');
    expect(screen.getByRole('heading', { level: 1, name: 'Acerca de Borde' })).toBeInTheDocument();
  });

  test('Una ruta inexistente muestra el 404 dentro del layout', async () => {
    mockApi({});
    await renderRoute('/no-existe');
    expect(screen.getByRole('heading', { level: 1, name: 'Página no encontrada' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Principal' })).toBeInTheDocument();
    expect(await axeViolations()).toEqual([]);
  });

  test('Una publicación no publicada (404 de la API) muestra "no encontrada"', async () => {
    mockApi({});
    await renderRoute('/cuentos/borrador');
    expect(screen.getByRole('heading', { level: 1, name: 'Página no encontrada' })).toBeInTheDocument();
  });

  test('Si /api devuelve algo que no es la API (p. ej. 404 de Vercel), es un error del servidor, no "no encontrada"', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('The page could not be found', { status: 404 }));
    await renderRoute('/');
    expect(screen.getByRole('heading', { level: 1, name: 'Algo salió mal' })).toBeInTheDocument();
    expect(screen.getByText(/El servidor respondió de forma inesperada\. Probá de nuevo en unos minutos\./)).toBeInTheDocument();
  });

  test('Si la API no responde, se muestra un error claro', async () => {
    mockApi({ '/posts/latest?perCategory=3': { status: 500, body: { ok: false, error: { message: 'Error interno del servidor' } } } });
    await renderRoute('/');
    expect(screen.getByRole('heading', { level: 1, name: 'Algo salió mal' })).toBeInTheDocument();
  });
});
