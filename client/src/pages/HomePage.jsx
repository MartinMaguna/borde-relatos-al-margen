import { Link, useLoaderData } from 'react-router';
import PostCard from '../components/PostCard.jsx';
import CallBanner from '../components/CallBanner.jsx';
import GeometricArt from '../components/GeometricArt.jsx';
import { useDocumentTitle } from '../a11y/hooks.js';
import { CATEGORIES } from '../lib/site.js';

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
          {/* El espacio entre las dos partes mantiene el nombre accesible "Borde Relatos al margen". */}
          <h1 tabIndex={-1} className="hero__title">
            Borde{' '}
            <span className="hero__title-sub">Relatos al margen</span>
          </h1>
        </div>
        <GeometricArt className="hero__art" />
      </div>

      {CATEGORIES.map((category) => {
        const posts = latest[category.slug] ?? [];
        const headingId = `seccion-${category.slug}`;
        // Talleres y convocatorias: cada uno a todo el ancho, con el formato de la portada.
        const isCalls = Boolean(category.banner);
        return (
          <section key={category.slug} className="section" aria-labelledby={headingId}>
            <div className="section__header">
              <h2 id={headingId}>{category.label}</h2>
            </div>
            {posts.length ? (
              <ul className={isCalls ? 'call-list' : 'post-list post-list--grid'}>
                {posts.map((post) => (
                  <li key={post.id}>
                    {isCalls ? <CallBanner post={post} headingLevel={3} /> : <PostCard post={post} headingLevel={3} />}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">{category.empty}</p>
            )}
            {/* Después de las publicaciones: primero se ve qué hay, después cómo seguir. */}
            <p className="section__more">
              <Link to={`/${category.slug}`}>{category.seeAll}</Link>
            </p>
          </section>
        );
      })}
    </>
  );
}
