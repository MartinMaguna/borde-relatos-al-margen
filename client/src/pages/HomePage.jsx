import { Link, useLoaderData } from 'react-router';
import PostCard from '../components/PostCard.jsx';
import { useDocumentTitle } from '../a11y/hooks.js';
import { CATEGORIES } from '../lib/site.js';

/**
 * Composición geométrica de la portada (design system: Hero). Decorativa:
 * oculta al lector, sin texto, colores tomados de los tokens.
 */
function HeroArt() {
  return (
    <svg className="hero__art" viewBox="0 0 320 300" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="hero-degradado" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--indigo)' }} />
          <stop offset="0.4" style={{ stopColor: 'var(--violet)' }} />
          <stop offset="0.7" style={{ stopColor: 'var(--magenta)' }} />
          <stop offset="1" style={{ stopColor: 'var(--orange)' }} />
        </linearGradient>
      </defs>
      <circle cx="100" cy="190" r="70" fill="none" style={{ stroke: 'var(--line-soft)' }} strokeWidth="1" />
      <circle cx="100" cy="190" r="100" fill="none" style={{ stroke: 'var(--line-soft)' }} strokeWidth="1" />
      <circle cx="210" cy="110" r="90" fill="url(#hero-degradado)" />
      <path d="M150 300 a90 90 0 0 1 180 0 z" style={{ fill: 'var(--coral)' }} />
      <circle cx="70" cy="70" r="18" style={{ fill: 'var(--indigo)' }} />
      <circle cx="120" cy="240" r="22" fill="none" style={{ stroke: 'var(--coral)' }} strokeWidth="2" />
    </svg>
  );
}

/**
 * Portada: presentación y últimas publicaciones de cada categoría.
 * Jerarquía: h1 (sitio) → h2 (categoría) → h3 (cada publicación).
 * Cada <section> se etiqueta con su h2, así aparece como región con nombre.
 */
export default function HomePage() {
  const { latest } = useLoaderData();
  useDocumentTitle(null);

  return (
    <>
      <div className="hero">
        <div className="hero__text">
          {/* El espacio entre las dos partes mantiene el nombre accesible "Borde. Relatos al Margen". */}
          <h1 tabIndex={-1} className="hero__title">
            Borde.{' '}
            <span className="hero__title-sub">Relatos al Margen</span>
          </h1>
          <p className="lead hero__lead">
            Un espacio de lectura para voces que escriben desde los márgenes: poesía, cuentos, talleres y
            convocatorias abiertas.
          </p>
        </div>
        <HeroArt />
      </div>

      {CATEGORIES.map((category) => {
        const posts = latest[category.slug] ?? [];
        const headingId = `seccion-${category.slug}`;
        // Convocatorias: cada tarjeta ocupa todo el ancho (las tres columnas).
        const layout = category.slug === 'convocatorias' ? 'post-list--wide' : 'post-list--grid';
        return (
          <section key={category.slug} className="section" aria-labelledby={headingId}>
            <div className="section__header">
              <h2 id={headingId}>{category.label}</h2>
              <Link to={`/${category.slug}`}>{category.seeAll}</Link>
            </div>
            {posts.length ? (
              <ul className={`post-list ${layout}`}>
                {posts.map((post) => (
                  <li key={post.id}>
                    <PostCard post={post} headingLevel={3} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">{category.empty}</p>
            )}
          </section>
        );
      })}
    </>
  );
}
