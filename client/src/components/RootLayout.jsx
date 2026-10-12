import { Link, Outlet, ScrollRestoration } from 'react-router';
import MainNav from './MainNav.jsx';
import SupportersSection from './SupportersSection.jsx';
import { useLoadingAnnouncement, useRouteFocus } from '../a11y/hooks.js';

/**
 * Estructura común a todas las vistas públicas:
 * enlace "Saltar al contenido" (primer elemento enfocable) → header (banner)
 * con navegación → main → footer (contentinfo).
 * Un único <main>, un único <nav aria-label="Principal">.
 */
export default function RootLayout() {
  useRouteFocus();
  const isLoading = useLoadingAnnouncement();

  return (
    <>
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>

      {isLoading && <div className="loading-bar" aria-hidden="true" />}

      <header className="site-header">
        <div className="container site-header__bar">
          <Link to="/" className="site-title">
            <span className="site-title__name">Borde.</span>{' '}
            <span className="site-title__sub">Relatos al Margen</span>
          </Link>
          <MainNav />
        </div>
      </header>

      {/* tabIndex -1: destino del enlace "Saltar al contenido" (recibe foco sin entrar en el orden de tabulación). */}
      <main id="contenido" tabIndex={-1} className="container" aria-busy={isLoading}>
        <Outlet />
      </main>

      {/* Los logos van dentro del footer (contentinfo): todo el contenido queda en un landmark. */}
      <footer className="site-footer">
        <SupportersSection />
        <div className="container site-footer__bar">
          <p>
            Borde. Relatos al Margen · {new Date().getFullYear()} · <Link to="/acerca">Acerca del proyecto</Link> ·{' '}
            <Link to="/guardados">Guardados</Link>
          </p>
        </div>
      </footer>

      <ScrollRestoration />
    </>
  );
}
