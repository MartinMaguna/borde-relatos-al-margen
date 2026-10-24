import { useLoaderData } from 'react-router';
import PostCard from '../components/PostCard.jsx';
import CallBanner from '../components/CallBanner.jsx';
import Pagination from '../components/Pagination.jsx';
import { useDocumentTitle } from '../a11y/hooks.js';

/** Listado paginado de una categoría (Poesía, Cuentos, Talleres, Convocatorias). */
export default function CategoryPage({ category }) {
  const { posts, meta } = useLoaderData();
  const { page, totalPages, total } = meta;
  const pageLabel = totalPages > 1 ? `página ${page} de ${totalPages}` : null;
  const isCalls = Boolean(category.banner);

  // En páginas 2+ el título lo dice: así el lector confirma en qué página quedó.
  useDocumentTitle(pageLabel ? `${category.label} (${pageLabel})` : category.label);

  return (
    // Poesía y cuentos: listado en una columna centrada.
    <div className={category.centered ? 'column-centered' : undefined}>
      <div className="page-intro">
        <h1 tabIndex={-1}>{category.label}</h1>
        {category.intro && <p className="lead">{category.intro}</p>}
        {total > 0 && (
          <p className="muted">
            {total === 1 ? '1 publicación' : `${total} publicaciones`}
            {pageLabel && ` · Estás en la ${pageLabel}`}
          </p>
        )}
      </div>

      {posts.length ? (
        // Talleres y convocatorias: con el formato de la portada (igual que en Inicio).
        <ul className={isCalls ? 'call-list' : 'post-list'}>
          {posts.map((post) => (
            <li key={post.id}>
              {isCalls ? <CallBanner post={post} headingLevel={2} /> : <PostCard post={post} headingLevel={2} />}
            </li>
          ))}
        </ul>
      ) : (
        <p className="notice">{total > 0 ? 'No hay publicaciones en esta página.' : category.empty}</p>
      )}

      <Pagination page={page} totalPages={totalPages} basePath={`/${category.slug}`} />
    </div>
  );
}
