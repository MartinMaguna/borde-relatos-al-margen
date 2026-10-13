import { Link } from 'react-router';
import GeometricArt from './GeometricArt.jsx';
import { CardMedia } from './PostCard.jsx';
import { CallStatus, Deadline, OpensAt, PostMeta } from './PostMeta.jsx';

/**
 * Convocatoria o taller en formato "hero" (como la portada): título grande,
 * datos (estado y fechas en convocatorias; autor y fecha en talleres) y
 * resumen a la izquierda; a la derecha, la imagen en un círculo o, si no
 * tiene, la composición geométrica.
 * Sin tarjeta: se separan con una línea fina.
 *
 * Mismo contenido y orden de lectura que una tarjeta: el título es el
 * enlace; la imagen es decorativa en el listado (alt="", su descripción
 * está en la página de la convocatoria).
 */
export default function CallBanner({ post, headingLevel = 2 }) {
  const Heading = `h${headingLevel}`;
  const href = `/${post.category}/${post.slug}`;
  const isCall = post.category === 'convocatorias';

  return (
    <article className="call-banner">
      <div className="call-banner__text">
        <Heading className="call-banner__title">
          <Link to={href}>{post.title}</Link>
        </Heading>
        <div className="call-banner__meta">
          {isCall ? (
            <>
              <CallStatus post={post} />
              <OpensAt post={post} />
              <Deadline post={post} />
            </>
          ) : (
            <PostMeta post={post} />
          )}
        </div>
        {post.summary && <p className="lead call-banner__lead">{post.summary}</p>}
        <CardMedia post={post} href={href} />
      </div>

      {post.image?.url ? (
        <div className="call-banner__visual" aria-hidden="true">
          <img className="call-banner__image" src={post.image.url} alt="" loading="lazy" decoding="async" />
        </div>
      ) : (
        <GeometricArt className="call-banner__art" />
      )}
    </article>
  );
}
