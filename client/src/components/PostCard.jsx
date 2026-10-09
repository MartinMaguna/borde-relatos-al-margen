import { Link } from 'react-router';
import { CallStatus, Deadline, PostMeta } from './PostMeta.jsx';

/**
 * Tarjeta de una publicación en un listado.
 * El título es el único enlace (nada de "Leer más" repetidos, que fuera de
 * contexto no dicen a dónde llevan). `headingLevel` mantiene la jerarquía:
 * h2 en un listado de categoría, h3 dentro de una sección de la portada.
 */
export default function PostCard({ post, headingLevel = 2 }) {
  const Heading = `h${headingLevel}`;
  const isCall = post.category === 'convocatorias';

  return (
    <article className="post-card">
      <Heading className="post-card__title">
        <Link to={`/${post.category}/${post.slug}`}>{post.title}</Link>
      </Heading>
      {isCall ? (
        <>
          <CallStatus post={post} />
          <Deadline post={post} />
        </>
      ) : (
        <PostMeta post={post} />
      )}
      {post.summary && <p className="post-card__summary">{post.summary}</p>}
    </article>
  );
}
