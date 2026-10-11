import { describe, expect, test } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { insertLink, insertSeparator, toggleInline, toggleLinePrefix } from '../lib/markdownEdit.js';
import { axeViolations, mockApi, ok, renderRoute } from './utils.jsx';
import { poem } from './fixtures.js';

/** Aplica un cambio puro y devuelve el texto resultante y la selección. */
const run = (value, change) => ({
  text: value.slice(0, change.from) + change.insert + value.slice(change.to),
  sel: (value.slice(0, change.from) + change.insert + value.slice(change.to)).slice(change.selStart, change.selEnd),
  removed: change.removed,
});

describe('Funciones de formato', () => {
  test('negrita envuelve la selección y deja el texto seleccionado', () => {
    const r = run('hola mundo', toggleInline('hola mundo', 5, 10, '**', 'x'));
    expect(r.text).toBe('hola **mundo**');
    expect(r.sel).toBe('mundo');
  });

  test('aplicar dos veces quita el formato', () => {
    const first = 'hola **mundo**';
    const r = run(first, toggleInline(first, 7, 12, '**', 'x'));
    expect(r.text).toBe('hola mundo');
    expect(r.removed).toBe(true);
  });

  test('sin selección inserta un texto de ejemplo seleccionado', () => {
    const r = run('', toggleInline('', 0, 0, '*', 'texto en cursiva'));
    expect(r.text).toBe('*texto en cursiva*');
    expect(r.sel).toBe('texto en cursiva');
  });

  test('cursiva sobre un texto en negrita la agrega (no confunde los asteriscos) y se puede quitar', () => {
    const v = '**verso**';
    const added = run(v, toggleInline(v, 2, 7, '*', 'x'));
    expect(added.text).toBe('***verso***');
    expect(added.removed).toBe(false);
    const removed = run(added.text, toggleInline(added.text, 3, 8, '*', 'x'));
    expect(removed.text).toBe('**verso**');
    expect(removed.removed).toBe(true);
  });

  test('los espacios de los bordes quedan afuera del formato', () => {
    const r = run('a b c', toggleInline('a b c', 1, 4, '**', 'x'));
    expect(r.text).toBe('a **b** c');
  });

  test('título: se aplica a la línea, reemplaza otro nivel y alterna', () => {
    let v = 'Primera\nSegunda';
    let r = run(v, toggleLinePrefix(v, 9, 9, 'heading', '# '));
    expect(r.text).toBe('Primera\n# Segunda');
    v = r.text;
    r = run(v, toggleLinePrefix(v, 10, 10, 'heading', '## '));
    expect(r.text).toBe('Primera\n## Segunda');
    v = r.text;
    r = run(v, toggleLinePrefix(v, 10, 10, 'heading', '## '));
    expect(r.text).toBe('Primera\nSegunda');
    expect(r.removed).toBe(true);
  });

  test('lista numerada numera todas las líneas seleccionadas', () => {
    const v = 'uno\ndos\ntres';
    expect(run(v, toggleLinePrefix(v, 0, v.length, 'ordered', '1. ')).text).toBe('1. uno\n2. dos\n3. tres');
  });

  test('viñetas reemplazan una cita', () => {
    const v = '> cita';
    expect(run(v, toggleLinePrefix(v, 0, 0, 'bullet', '- ')).text).toBe('- cita');
  });

  test('enlace con texto seleccionado deja seleccionada la dirección', () => {
    const r = run('ver bases', insertLink('ver bases', 4, 9));
    expect(r.text).toBe('ver [bases](https://)');
    expect(r.sel).toBe('https://');
  });

  test('separador queda entre líneas en blanco', () => {
    expect(run('arriba', insertSeparator('arriba', 6, 6)).text).toBe('arriba\n\n---\n\n');
  });
});

describe('Barra de formato en el formulario', () => {
  const ME = { '/auth/me': ok({ user: { id: 'u1', name: 'Ed', email: 'e@x.test', role: 'editor' } }) };

  async function openForm(extra = {}) {
    const calls = mockApi({ ...ME, ...extra });
    await renderRoute('/panel/publicaciones/nueva');
    return { calls, user: userEvent.setup(), textarea: screen.getByLabelText('Texto') };
  }

  test('es un toolbar con nombre, controla el texto y tiene un solo punto de tabulación', async () => {
    await openForm();
    const toolbar = screen.getByRole('toolbar', { name: 'Formato del texto' });
    expect(toolbar).toHaveAttribute('aria-controls', screen.getByLabelText('Texto').id);
    const buttons = within(toolbar).getAllByRole('button');
    expect(buttons.map((b) => b.textContent)).toEqual([
      'TítuloTítulo de sección', 'Subtítulo', 'EncabezadoEncabezado menor', 'Negrita', 'Cursiva', 'Tachado', 'Cita',
      'ViñetasLista con viñetas', 'NumeradaLista numerada', 'Enlace', 'Separador',
    ]);
    expect(buttons.filter((b) => b.tabIndex === 0)).toHaveLength(1);
    expect(within(toolbar).getByRole('button', { name: 'Título de sección' })).toBeInTheDocument();
    expect(within(toolbar).getByRole('button', { name: 'Negrita' })).toHaveAttribute('aria-keyshortcuts', 'Control+B');
    expect(await axeViolations()).toEqual([]);
  });

  test('las flechas recorren los botones', async () => {
    const { user } = await openForm();
    const toolbar = screen.getByRole('toolbar', { name: 'Formato del texto' });
    const first = within(toolbar).getByRole('button', { name: 'Título de sección' });
    first.focus();
    await user.keyboard('{ArrowRight}');
    expect(within(toolbar).getByRole('button', { name: 'Subtítulo' })).toHaveFocus();
    await user.keyboard('{End}');
    expect(within(toolbar).getByRole('button', { name: 'Separador' })).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(first).toHaveFocus();
  });

  test('Negrita aplica el formato a la selección, devuelve el foco al texto y lo anuncia', async () => {
    const { user, textarea } = await openForm();
    await user.type(textarea, 'hola mundo');
    textarea.setSelectionRange(5, 10);
    await user.click(screen.getByRole('button', { name: 'Negrita' }));

    expect(textarea).toHaveValue('hola **mundo**');
    expect(textarea).toHaveFocus();
    await waitFor(() => expect(screen.getByTestId('announcer-polite')).toHaveTextContent('Negrita aplicada'));
  });

  test('Control+B y Control+I funcionan dentro del texto', async () => {
    const { user, textarea } = await openForm();
    await user.type(textarea, 'verso');
    textarea.setSelectionRange(0, 5);
    await user.keyboard('{Control>}b{/Control}');
    expect(textarea).toHaveValue('**verso**');
    textarea.setSelectionRange(2, 7);
    await user.keyboard('{Control>}i{/Control}');
    expect(textarea).toHaveValue('***verso***');
  });

  test('Título de sección convierte la línea actual', async () => {
    const { user, textarea } = await openForm();
    await user.type(textarea, 'Primera parte');
    await user.click(screen.getByRole('button', { name: 'Título de sección' }));
    expect(textarea).toHaveValue('# Primera parte');
  });

  test('la vista previa muestra el HTML del servidor y se anuncia', async () => {
    const { user, textarea, calls } = await openForm({
      'POST /admin/preview': (body) => ok({ html: `<p><strong>${body.markdown.replace(/\*/g, '')}</strong></p>` }),
    });
    await user.type(textarea, '**hola**');
    const toggle = screen.getByRole('button', { name: 'Ver vista previa' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await user.click(toggle);

    const region = await screen.findByRole('region', { name: 'Vista previa' });
    await waitFor(() => expect(within(region).getByText('hola').tagName).toBe('STRONG'));
    expect(screen.getByRole('button', { name: 'Ocultar vista previa' })).toHaveAttribute('aria-expanded', 'true');
    expect(calls.find((c) => c.path === '/admin/preview').body).toEqual({ markdown: '**hola**' });
    await waitFor(() => expect(screen.getByTestId('announcer-polite')).toHaveTextContent('Vista previa actualizada.'));
  });
});

describe('Imagen en las tarjetas', () => {
  test('la tarjeta muestra la imagen como decorativa (alt="") y sin imagen no hay', async () => {
    const withImage = { ...poem, image: { url: 'https://example.com/foto.jpg', alt: 'Una orilla al atardecer' } };
    mockApi({
      '/posts/latest?perCategory=3': ok({ poesia: [withImage], cuentos: [], talleres: [], convocatorias: [] }),
    });
    const { container } = await renderRoute('/');
    const img = container.querySelector('.post-card__image');
    expect(img).toHaveAttribute('src', 'https://example.com/foto.jpg');
    expect(img).toHaveAttribute('alt', '');
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(screen.queryByRole('img', { name: 'Una orilla al atardecer' })).toBeNull();
    expect(await axeViolations()).toEqual([]);
  });
});
