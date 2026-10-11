import { useState } from 'react';
import { Link, NavLink, Outlet, ScrollRestoration, useNavigate, useRouteLoaderData } from 'react-router';
import { api } from '../api/client.js';
import { useLoadingAnnouncement, useRouteFocus } from '../a11y/hooks.js';
import { useAnnounce } from '../a11y/Announcer.jsx';
import { LOGIN_PATH } from '../routes/panelLoaders.js';

const PANEL_NAV = [
  { to: '/panel', label: 'Publicaciones', end: true },
  { to: '/panel/publicaciones/nueva', label: 'Nueva publicación' },
  { to: '/panel/comentarios', label: 'Comentarios' },
  { to: '/panel/acerca', label: 'Página Acerca' },
];

/**
 * Layout del panel del editor. Misma estructura accesible que el sitio público
 * (saltar al contenido, banner, nav etiquetada, main), con su propio menú.
 * En /panel/ingresar no hay usuario: solo se muestra el encabezado.
 */
export default function PanelLayout() {
  useRouteFocus();
  const isLoading = useLoadingAnnouncement();
  const session = useRouteLoaderData('panel');
  const navigate = useNavigate();
  const announce = useAnnounce();
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    if (loggingOut) return; // sin disabled: el botón no pierde el foco
    setLoggingOut(true);
    try {
      await api('/auth/logout', { method: 'POST' });
      navigate(LOGIN_PATH, { state: { flash: 'Cerraste la sesión.' } });
    } catch (err) {
      announce(`No se pudo cerrar la sesión. ${err.message}`, { assertive: true });
      setLoggingOut(false);
    }
  }

  return (
    <>
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>

      {isLoading && <div className="loading-bar" aria-hidden="true" />}

      <header className="site-header panel-header">
        <div className="container site-header__bar">
          <p className="site-title">
            <span className="site-title__name">Borde.</span>{' '}
            <span className="site-title__sub">Panel de edición</span>
          </p>
          <p className="panel-header__site">
            <Link to="/">Ver el sitio público</Link>
          </p>
        </div>

        {session?.user && (
          <div className="container panel-header__bar">
            <nav aria-label="Panel">
              <ul className="panel-nav">
                {PANEL_NAV.map((item) => (
                  <li key={item.to}>
                    <NavLink to={item.to} end={item.end}>
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="panel-header__user">
              <span>
                Sesión de <strong>{session.user.name}</strong>
              </span>
              <button type="button" className="button button--secondary button--small" onClick={logout}>
                {loggingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
              </button>
            </div>
          </div>
        )}
      </header>

      <main id="contenido" tabIndex={-1} className="container" aria-busy={isLoading}>
        <Outlet />
      </main>

      <ScrollRestoration />
    </>
  );
}
