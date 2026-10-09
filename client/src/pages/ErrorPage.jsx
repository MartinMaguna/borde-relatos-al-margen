import { useEffect } from 'react';
import { Link, isRouteErrorResponse, useRouteError } from 'react-router';
import { useDocumentTitle } from '../a11y/hooks.js';

/** Asegura el punto final, para que dos frases seguidas se lean como dos frases. */
const sentence = (text) => (/[.!?…]$/.test(text.trim()) ? text.trim() : `${text.trim()}.`);

/**
 * Error dentro del layout (header y menú siguen disponibles).
 * 404 → "no encontrada"; cualquier otro → mensaje genérico con salida clara.
 */
export default function ErrorPage() {
  const error = useRouteError();
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  const title = notFound ? 'Página no encontrada' : 'Algo salió mal';
  useDocumentTitle(title);

  useEffect(() => {
    if (!notFound) console.error(error);
  }, [error, notFound]);

  return (
    <div className="article">
      <h1 tabIndex={-1}>{title}</h1>
      {notFound ? (
        <p className="lead">
          {sentence(error.data?.message ?? 'No encontramos la página que buscás')} Puede que la dirección esté mal
          escrita o que el contenido ya no esté publicado.
        </p>
      ) : (
        <p className="lead">{sentence(error?.message ?? 'Ocurrió un error inesperado')} Probá de nuevo en unos minutos.</p>
      )}
      <p>
        <Link to="/">Ir al inicio</Link>
      </p>
    </div>
  );
}
