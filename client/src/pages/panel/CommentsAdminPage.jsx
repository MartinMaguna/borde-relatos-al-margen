import { useRef, useState } from 'react';
import { Link, useLoaderData, useRevalidator } from 'react-router';
import { api } from '../../api/client.js';
import { useAnnounce } from '../../a11y/Announcer.jsx';
import { useDocumentTitle } from '../../a11y/hooks.js';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import Pagination from '../../components/Pagination.jsx';
import { formatDate } from '../../lib/format.js';

const TABS = [
  { value: 'pending', label: 'Pendientes' },
  { value: 'approved', label: 'Aprobados' },
  { value: 'rejected', label: 'Rechazados' },
];

/**
 * Moderación de comentarios. Pestañas como enlaces (cada estado tiene su URL)
 * con aria-current; cada acción incluye el nombre de quien comentó en su
 * nombre accesible y se anuncia; eliminar pide confirmación.
 */
export default function CommentsAdminPage() {
  const { comments, meta, status } = useLoaderData();
  const revalidator = useRevalidator();
  const announce = useAnnounce();
  const headingRef = useRef(null);
  const focusAfterClose = useRef(null);
  const [toDelete, setToDelete] = useState(null);
  const [busy, setBusy] = useState(false);
  const current = TABS.find((t) => t.value === status) ?? TABS[0];
  useDocumentTitle(`Comentarios ${current.label.toLowerCase()} · Panel`);

  async function setStatus(comment, next, message) {
    try {
      await api(`/admin/comments/${comment.id}`, { method: 'PATCH', body: { status: next } });
      announce(message);
      revalidator.revalidate();
      headingRef.current?.focus(); // el comentario sale de esta lista
    } catch (err) {
      announce(`No se pudo actualizar el comentario. ${err.message}`, { assertive: true });
    }
  }

  async function confirmDelete() {
    if (busy) return;
    setBusy(true);
    try {
      await api(`/admin/comments/${toDelete.id}`, { method: 'DELETE' });
      focusAfterClose.current = headingRef.current;
      announce(`Se eliminó el comentario de ${toDelete.name}.`);
      setToDelete(null);
      revalidator.revalidate();
    } catch (err) {
      setToDelete(null);
      announce(`No se pudo eliminar el comentario. ${err.message}`, { assertive: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1 tabIndex={-1} ref={headingRef}>
        Comentarios
      </h1>
      <p className="lead">Los comentarios se publican en el sitio solo después de aprobarlos.</p>

      <nav aria-label="Estado de los comentarios">
        <ul className="tabs">
          {TABS.map((t) => (
            <li key={t.value}>
              <Link to={`/panel/comentarios?estado=${t.value}`} aria-current={t.value === current.value ? 'page' : undefined}>
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <p className="results-count">
        {meta.total === 0
          ? `No hay comentarios ${current.label.toLowerCase()}.`
          : `${meta.total === 1 ? '1 comentario' : `${meta.total} comentarios`} ${current.label.toLowerCase()}.`}
      </p>

      {comments.length > 0 && (
        <ul className="admin-list">
          {comments.map((c) => (
            <li key={c.id} className="admin-item">
              <h2 className="admin-item__title">{c.name}</h2>
              <p className="post-meta">
                En{' '}
                {c.post ? <Link to={`/${c.post.category}/${c.post.slug}`}>«{c.post.title}»</Link> : 'una publicación eliminada'} ·{' '}
                <time dateTime={c.createdAt}>{formatDate(c.createdAt)}</time>
              </p>
              <p className="comment__text">{c.text}</p>
              <div className="button-group">
                {c.status !== 'approved' && (
                  <button type="button" className="button button--small" onClick={() => setStatus(c, 'approved', `Se aprobó el comentario de ${c.name}. Ya se ve en el sitio.`)}>
                    Aprobar <span className="visually-hidden">el comentario de {c.name}</span>
                  </button>
                )}
                {c.status !== 'rejected' && (
                  <button type="button" className="button button--secondary button--small" onClick={() => setStatus(c, 'rejected', `Se rechazó el comentario de ${c.name}.`)}>
                    Rechazar <span className="visually-hidden">el comentario de {c.name}</span>
                  </button>
                )}
                <button type="button" className="button button--danger button--small" onClick={() => setToDelete(c)}>
                  Eliminar <span className="visually-hidden">el comentario de {c.name}</span>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Pagination
        page={meta.page}
        totalPages={meta.totalPages}
        hrefFor={(p) => `/panel/comentarios?estado=${current.value}${p > 1 ? `&pagina=${p}` : ''}`}
      />

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="¿Eliminar este comentario?"
        confirmLabel="Sí, eliminar"
        busy={busy}
        returnFocusRef={focusAfterClose}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      >
        <p>
          Vas a eliminar el comentario de <strong>{toDelete?.name}</strong>. Esta acción no se puede deshacer. Si solo
          querés que no se vea, rechazalo.
        </p>
      </ConfirmDialog>
    </>
  );
}
