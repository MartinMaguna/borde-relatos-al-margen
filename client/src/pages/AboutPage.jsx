import { useLoaderData } from 'react-router';
import { useDocumentTitle } from '../a11y/hooks.js';

/** "Acerca": contenido editable desde el panel. */
export default function AboutPage() {
  const { page } = useLoaderData();
  const title = page?.title || 'Acerca de Borde';
  useDocumentTitle(title);

  return (
    <article className="article">
      <h1 tabIndex={-1}>{title}</h1>
      {page?.bodyHtml ? (
        <div className="prose" dangerouslySetInnerHTML={{ __html: page.bodyHtml }} />
      ) : (
        <p className="lead">Pronto vas a encontrar acá información sobre el proyecto.</p>
      )}
    </article>
  );
}
