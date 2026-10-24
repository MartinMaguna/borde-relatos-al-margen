import { useRef, useState } from 'react';
import { Link, useLoaderData, useRevalidator } from 'react-router';
import { api } from '../../api/client.js';
import { useAnnounce } from '../../a11y/Announcer.jsx';
import { useDocumentTitle } from '../../a11y/hooks.js';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import { formatDate } from '../../lib/format.js';

const API_URL = import.meta.env.VITE_API_URL ?? '/api';

/**
 * Postulaciones recibidas para una convocatoria. Cada una muestra sus datos y
 * el texto en un <details> (desplegable nativo, accesible con teclado y lector).
 * Se pueden descargar todas en CSV para abrirlas en una planilla.
 */
export default function ApplicationsAdminPage() {
  const { post, applications } = useLoaderData();
  const revalidator = useRevalidator();
  const announce = useAnnounce();
  const headingRef = useRef(null);
  const focusAfterClose = useRef(null);
  const [toDelete, setToDelete] = useState(null);
  const [busy, setBusy] = useState(false);
  useDocumentTitle(`Postulaciones: «${post.title}» · Panel`);

  async function confirmDelete() {
    if (busy) return;
    setBusy(true);
    try {
      await api(`/admin/applications/${toDelete.id}`, { method: 'DELETE' });
      focusAfterClose.current = headingRef.current;
      announce(`Se eliminó la postulación de ${toDelete.name}.`);
      setToDelete(null);
      revalidator.revalidate();
    } catch (err) {
      setToDelete(null);
      announce(`No se pudo eliminar la postulación. ${err.message}`, { assertive: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <p className="back-nav">
        <Link to="/panel">Volver a publicaciones</Link>
      </p>
      <h1 tabIndex={-1} ref={headingRef}>
        Postulaciones: «{post.title}»
      </h1>
      <p className="results-count">
        {applications.length === 0
          ? 'Todavía no hay postulaciones.'
          : applications.length === 1
            ? '1 postulación.'
            : `${applications.length} postulaciones.`}
      </p>
      {applications.length > 0 && (
        <p>
          <a className="button button--secondary" href={`${API_URL}/admin/posts/${post.id}/applications.csv`} download>
            Descargar todas en CSV <span className="visually-hidden">(para abrir en una planilla)</span>
          </a>
        </p>
      )}

      {applications.length > 0 && (
        <ul className="admin-list">
          {applications.map((a) => (
            <li key={a.id} className="admin-item">
              <h2 className="admin-item__title">
                {a.name}
                {a.workTitle && `: «${a.workTitle}»`}
              </h2>
              <dl className="admin-item__meta">
                <div>
                  <dt>Correo</dt>
                  <dd>
                    <a href={`mailto:${a.email}`}>{a.email}</a>
                  </dd>
                </div>
                <div>
                  <dt>Recibida</dt>
                  <dd>
                    <time dateTime={a.createdAt}>{formatDate(a.createdAt)}</time>
                  </dd>
                </div>
                {a.link && (
                  <div>
                    <dt>Enlace</dt>
                    <dd>
                      <a href={a.link}>
                        Abrir el texto <span className="visually-hidden">de {a.name} (sitio externo)</span>
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
              {a.answers?.length > 0 && (
                <dl className="application__answers">
                  {a.answers.map((ans) => (
                    <div key={ans.key}>
                      <dt>{ans.label}</dt>
                      <dd className="comment__text">{ans.answer || <span className="muted">Sin respuesta</span>}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {a.message && <p className="comment__text">{a.message}</p>}
              {a.text && (
                <details className="application__text">
                  <summary>
                    Ver el texto <span className="visually-hidden">de {a.name}</span>
                  </summary>
                  <div className="comment__text">{a.text}</div>
                </details>
              )}
              <div className="button-group">
                <button type="button" className="button button--danger button--small" onClick={() => setToDelete(a)}>
                  Eliminar <span className="visually-hidden">la postulación de {a.name}</span>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="¿Eliminar esta postulación?"
        confirmLabel="Sí, eliminar"
        busy={busy}
        returnFocusRef={focusAfterClose}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      >
        <p>
          Vas a eliminar la postulación de <strong>{toDelete?.name}</strong>. Esta acción no se puede deshacer.
        </p>
      </ConfirmDialog>
    </>
  );
}
