import { useRef, useState } from 'react';
import { useLoaderData, useRevalidator } from 'react-router';
import { api } from '../../api/client.js';
import { useAnnounce } from '../../a11y/Announcer.jsx';
import { useDocumentTitle } from '../../a11y/hooks.js';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import Pagination from '../../components/Pagination.jsx';
import { formatDate } from '../../lib/format.js';

/**
 * Mensajes del formulario de contacto. Llegan por correo al equipo; acá
 * quedan guardados por si el correo falló o todavía no está configurado.
 */
export default function MessagesAdminPage() {
  const { messages, meta } = useLoaderData();
  const revalidator = useRevalidator();
  const announce = useAnnounce();
  const headingRef = useRef(null);
  const focusAfterClose = useRef(null);
  const [toDelete, setToDelete] = useState(null);
  const [busy, setBusy] = useState(false);
  useDocumentTitle('Mensajes de contacto · Panel');

  async function confirmDelete() {
    if (busy) return;
    setBusy(true);
    try {
      await api(`/admin/messages/${toDelete.id}`, { method: 'DELETE' });
      focusAfterClose.current = headingRef.current;
      announce(`Se eliminó el mensaje de ${toDelete.name}.`);
      setToDelete(null);
      revalidator.revalidate();
    } catch (err) {
      setToDelete(null);
      announce(`No se pudo eliminar el mensaje. ${err.message}`, { assertive: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1 tabIndex={-1} ref={headingRef}>
        Mensajes de contacto
      </h1>
      <p className="lead">
        Lo que escriben desde la página Contacto. Cada mensaje también llega por correo; si el envío falló, se indica.
      </p>

      <p className="results-count">
        {meta.total === 0 ? 'Todavía no hay mensajes.' : meta.total === 1 ? '1 mensaje.' : `${meta.total} mensajes.`}
      </p>

      {messages.length > 0 && (
        <ul className="admin-list">
          {messages.map((m) => (
            <li key={m.id} className="admin-item">
              <h2 className="admin-item__title">{m.name}</h2>
              <p className="post-meta">
                {m.email} · <time dateTime={m.createdAt}>{formatDate(m.createdAt)}</time>
                {m.emailStatus !== 'sent' && (
                  <>
                    {' · '}
                    <strong>{m.emailStatus === 'failed' ? 'No llegó por correo (el envío falló)' : 'No se envió por correo'}</strong>
                  </>
                )}
              </p>
              <p className="comment__text">{m.message}</p>
              <div className="button-group">
                <a className="button button--small" href={`mailto:${m.email}?subject=${encodeURIComponent('Re: tu mensaje a Borde')}`}>
                  Responder <span className="visually-hidden">a {m.name}</span>
                </a>
                <button type="button" className="button button--danger button--small" onClick={() => setToDelete(m)}>
                  Eliminar <span className="visually-hidden">el mensaje de {m.name}</span>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Pagination
        page={meta.page}
        totalPages={meta.totalPages}
        hrefFor={(p) => (p === 1 ? '/panel/mensajes' : `/panel/mensajes?pagina=${p}`)}
      />

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="¿Eliminar este mensaje?"
        confirmLabel="Sí, eliminar"
        busy={busy}
        returnFocusRef={focusAfterClose}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      >
        <p>
          Vas a eliminar el mensaje de <strong>{toDelete?.name}</strong>. Esta acción no se puede deshacer.
        </p>
      </ConfirmDialog>
    </>
  );
}
