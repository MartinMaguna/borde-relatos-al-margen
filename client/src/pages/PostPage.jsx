import { Link, useLoaderData } from 'react-router';
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import { CallStatus, PostMeta } from '../components/PostMeta.jsx';
import { useDocumentTitle } from '../a11y/hooks.js';
import { formatDate } from '../lib/format.js';
import { CATEGORY_BY_SLUG } from '../lib/site.js';

/** Detalle de una publicación, pensado para lectura prolongada. */
export default function PostPage() {
  const { post } = useLoaderData();
  const category = CATEGORY_BY_SLUG[post.category];
  useDocumentTitle(`${post.title} · ${category.label}`);

  return (
    <>
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
          <PostMeta post={post} />
        </header>

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
      </article>

      <p className="back-link">
        <Link to={`/${category.slug}`}>Volver a {category.label}</Link>
      </p>
    </>
  );
}
