import { Link } from 'react-router';
import AudioButton from './AudioButton.jsx';
import { SignLanguageIcon } from './icons.jsx';
import { CallStatus, Deadline, PostMeta } from './PostMeta.jsx';

export const SIGN_SECTION_ID = 'lengua-de-senas';

/**
 * Tarjeta de una publicación en un listado.
 * El título es el enlace principal (nada de "Leer más" repetidos, que fuera de
 * contexto no dicen a dónde llevan). `headingLevel` mantiene la jerarquía:
 * h2 en un listado de categoría, h3 dentro de una sección de la portada.
 *
 * Si la publicación tiene audio o versión en lengua de señas, aparecen debajo:
 * - "Escuchar «título»": reproduce el audio sin salir del listado.
 * - "Lengua de señas «título»": lleva directo al video en la página de la
 *   publicación. Ícono + texto visible (un ícono solo no se entiende igual).
 */
export default function PostCard({ post, headingLevel = 2 }) {
  const Heading = `h${headingLevel}`;
  const isCall = post.category === 'convocatorias';
  const href = `/${post.category}/${post.slug}`;

  return (
    <article className={`post-card${post.image?.url ? ' post-card--with-image' : ''}`}>
      {/*
        Imagen de la publicación como miniatura, arriba de la tarjeta.
        alt="" (decorativa): en un listado, describir cada foto antes de cada
        título vuelve la navegación muy lenta; el lector la saltea y la
        descripción completa está en la página de la publicación.
      */}
      {post.image?.url && (
        <img className="post-card__image" src={post.image.url} alt="" loading="lazy" decoding="async" />
      )}
      <Heading className="post-card__title">
        <Link to={href}>{post.title}</Link>
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

      <CardMedia post={post} href={href} />
    </article>
  );
}

/** Audio y enlace a la versión en lengua de señas, al pie de una tarjeta (si los hay). */
export function CardMedia({ post, href }) {
  if (!post.audio?.url && !post.signVideoId) return null;
  return (
    <div className="post-card__media">
      {post.audio?.url && <AudioButton src={post.audio.url} title={post.title} />}
      {post.signVideoId && (
        <Link to={`${href}#${SIGN_SECTION_ID}`} className="sign-link">
          <SignLanguageIcon />
          Lengua de Señas Uruguaya <span className="visually-hidden">«{post.title}»</span>
        </Link>
      )}
    </div>
  );
}
