import { formatDate } from '../lib/format.js';

/** "Por Lucía Ferreyra · 7 de octubre de 2026". La fecha va en <time> con el valor ISO. */
export function PostMeta({ post }) {
  return (
    <p className="post-meta">
      Por {post.author}
      {post.publishedAt && (
        <>
          {' · '}
          <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
        </>
      )}
    </p>
  );
}

/**
 * Estado de una convocatoria. Se comunica con texto ("Abierta"/"Cerrada"),
 * no solo con color: el borde además cambia de continuo a punteado.
 */
export function CallStatus({ post }) {
  if (!post.callStatus) return null;
  return (
    <p className={`call-status call-status--${post.callStatus}`}>
      <span className="visually-hidden">Estado de la convocatoria:</span> {post.callStatus === 'abierta' ? 'Abierta' : 'Cerrada'}
    </p>
  );
}

export function Deadline({ post }) {
  if (!post.deadline) return null;
  return (
    <p className="post-meta">
      Fecha límite: <time dateTime={post.deadline}>{formatDate(post.deadline)}</time>
    </p>
  );
}
