import { Link, useLoaderData } from 'react-router';
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import { CallStatus, PostMeta } from '../components/PostMeta.jsx';
import { SIGN_SECTION_ID } from '../components/PostCard.jsx';
import { SignLanguageIcon } from '../components/icons.jsx';
import ArticleActions from '../components/ArticleActions.jsx';
import CommentsSection from '../components/CommentsSection.jsx';
import ApplicationForm from '../components/ApplicationForm.jsx';
import { useDocumentTitle } from '../a11y/hooks.js';
import { formatDate } from '../lib/format.js';
import { CATEGORY_BY_SLUG } from '../lib/site.js';

/**
 * Audio y versión en lengua de señas, antes del texto: quien prefiere escuchar
 * o ver la versión en señas lo encuentra sin recorrer todo el contenido.
 * Cada uno es una sección con su h2, así aparecen en la lista de encabezados.
 */
function PostMedia({ post }) {
  if (!post.audio?.url && !post.signVideoId) return null;

  return (
    <div className="post-media">
      {post.audio?.url && (
        <section className="post-media__block" aria-labelledby="audio-titulo">
          <h2 id="audio-titulo" className="post-media__title">
            Escuchar: {post.audio.label}
          </h2>
          {/* Controles nativos: accesibles con teclado y lector en todos los navegadores. */}
          {/* eslint-disable-next-line jsx-a11y/media-has-caption -- la transcripción es el texto de la publicación, en esta misma página */}
          <audio controls preload="none" src={post.audio.url} aria-labelledby="audio-titulo" className="post-media__audio">
            <a href={post.audio.url}>Descargar el audio</a>
          </audio>
          <p className="post-media__note">
            <a href={post.audio.url}>Abrir o descargar el audio</a>
            {' · '}El texto completo está debajo.
          </p>
        </section>
      )}

      {post.signVideoId && (
        <section className="post-media__block" aria-labelledby={SIGN_SECTION_ID}>
          {/* tabIndex -1: destino del enlace "Lengua de señas" de las tarjetas (recibe el foco al llegar). */}
          <h2 id={SIGN_SECTION_ID} className="post-media__title" tabIndex={-1}>
            <SignLanguageIcon /> Versión en lengua de señas
          </h2>
          <div className="video-frame">
            {/* youtube-nocookie: YouTube no guarda cookies de seguimiento hasta que se reproduce el video. */}
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${post.signVideoId}`}
              title={`Versión en lengua de señas de «${post.title}» (video de YouTube)`}
              loading="lazy"
              allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
          <p className="post-media__note">
            <a href={post.signVideoUrl}>
              Ver en YouTube <span className="visually-hidden">la versión en lengua de señas</span>
            </a>
          </p>
        </section>
      )}
    </div>
  );
}

/** Detalle de una publicación, pensado para lectura prolongada. */
export default function PostPage() {
  const { post, comments } = useLoaderData();
  const category = CATEGORY_BY_SLUG[post.category];
  useDocumentTitle(`${post.title} · ${category.label}`);

  return (
    // Poesía y cuentos: todo en una columna centrada, cómoda para leer.
    <div className={category.centered ? 'column-centered' : undefined}>
      <Breadcrumbs
        items={[
          { to: '/', label: 'Inicio' },
          { to: `/${category.slug}`, label: category.label },
          { label: post.title },
        ]}
      />

      <article className="article">
        <header className="article__header">
          <h1 tabIndex={-1}>{post.title}</h1>
          <PostMeta post={post} withReadingTime />
          <ArticleActions post={post} />
        </header>

        <PostMedia post={post} />

        {post.category === 'convocatorias' && (
          <section className="call-details" aria-labelledby="datos-convocatoria">
            <h2 id="datos-convocatoria" className="visually-hidden">
              Datos de la convocatoria
            </h2>
            <dl>
              <dt>Estado</dt>
              <dd>
                <CallStatus post={post} />
              </dd>
              <dt>Fecha límite</dt>
              <dd>
                <time dateTime={post.deadline}>{formatDate(post.deadline)}</time>
              </dd>
              {post.basesUrl && (
                <>
                  <dt>Bases</dt>
                  <dd>
                    <a href={post.basesUrl}>
                      Leer las bases de la convocatoria <span className="visually-hidden">(sitio externo)</span>
                    </a>
                  </dd>
                </>
              )}
            </dl>
          </section>
        )}

        {post.image && (
          <figure className="article__figure">
            <img src={post.image.url} alt={post.image.alt} loading="lazy" decoding="async" />
          </figure>
        )}

        {/* HTML generado y sanitizado en el servidor a partir del Markdown (sin scripts ni atributos peligrosos). */}
        <div className={`prose prose--${post.category}`} dangerouslySetInnerHTML={{ __html: post.bodyHtml }} />

        {post.category === 'convocatorias' && post.acceptsApplications && <ApplicationForm post={post} />}
      </article>

      <CommentsSection post={post} comments={comments} />

      <p className="back-link">
        <Link to={`/${category.slug}`}>Volver a {category.label}</Link>
      </p>
    </div>
  );
}
