import { useId, useRef, useState } from 'react';
import { NavLink } from 'react-router';
import { NAV_ITEMS } from '../lib/site.js';

/**
 * Menú principal.
 * - Móvil: botón nativo con aria-expanded y aria-controls. Cerrado, la lista usa
 *   `hidden`, que la saca de la vista, del lector y del orden de tabulación.
 * - Escape cierra el menú y devuelve el foco al botón (sin trampas de foco).
 * - Escritorio: el CSS muestra siempre la lista y oculta el botón.
 * - NavLink agrega aria-current="page" al enlace de la página actual.
 */
export default function MainNav() {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);
  const listId = useId();

  function handleKeyDown(event) {
    if (event.key === 'Escape' && open) {
      setOpen(false);
      buttonRef.current?.focus();
    }
  }

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Escape para cerrar el menú es un atajo estándar; el control real es el botón
    <nav className="main-nav" aria-label="Principal" onKeyDown={handleKeyDown}>
      <button
        ref={buttonRef}
        type="button"
        className="menu-toggle"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
      >
        <svg className="menu-toggle__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          {open ? (
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          ) : (
            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          )}
        </svg>
        Menú
      </button>

      <ul id={listId} className="main-nav__list" hidden={!open}>
        {NAV_ITEMS.map((item) => (
          <li key={item.to}>
            <NavLink to={item.to} end={item.to === '/'} onClick={() => setOpen(false)}>
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
