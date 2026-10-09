import { Link, useLoaderData } from 'react-router';
import PostCard from '../components/PostCard.jsx';
import { useDocumentTitle } from '../a11y/hooks.js';
import { CATEGORIES, SITE_NAME } from '../lib/site.js';

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
      <div className="page-intro">
        <h1 tabIndex={-1}>{SITE_NAME}</h1>
        <p className="lead">
          Un espacio de lectura para voces que escriben desde los márgenes: poesía, cuentos, talleres y convocatorias
          abiertas.
        </p>
      </div>

      {CATEGORIES.map((category) => {
        const posts = latest[category.slug] ?? [];
        const headingId = `seccion-${category.slug}`;
        return (
          <section key={category.slug} className="section" aria-labelledby={headingId}>
            <div className="section__header">
              <h2 id={headingId}>{category.label}</h2>
              <Link to={`/${category.slug}`}>{category.seeAll}</Link>
            </div>
            {posts.length ? (
              <ul className="post-list post-list--grid">
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
