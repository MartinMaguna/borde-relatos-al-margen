import { useRef, useState } from 'react';
import { Form, Link, useLoaderData, useRevalidator } from 'react-router';
import { api } from '../../api/client.js';
import { useAnnounce } from '../../a11y/Announcer.jsx';
import { useDocumentTitle } from '../../a11y/hooks.js';
import { useFlash } from '../../a11y/useFlash.js';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import Pagination from '../../components/Pagination.jsx';
import { CATEGORY_OPTIONS, STATUS_LABELS } from '../../lib/admin.js';
import { formatDate } from '../../lib/format.js';
import { CATEGORY_BY_SLUG } from '../../lib/site.js';

/**
 * Listado del panel: filtros + publicaciones + acciones.
 *
 * - Los filtros son un formulario GET (<Form method="get">): cada búsqueda tiene
 *   su URL, funciona con Enter y con el botón, y el resultado se anuncia porque
 *   el foco pasa al h1 y debajo se lee la cantidad encontrada.
 * - Se usa una lista de tarjetas en vez de una tabla: en móvil y con zoom alto
 *   no obliga a desplazarse en horizontal.
 * - Los botones de acción incluyen el título en su nombre accesible
 *   ("Editar «Orilla»"), así se distinguen en la lista de controles del lector.
 */
export default function PostsAdminPage() {
  const { posts, meta, filters } = useLoaderData();
  const revalidator = useRevalidator();
  const announce = useAnnounce();
  const [flash, setFlash] = useFlash();
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const headingRef = useRef(null);
  const focusAfterClose = useRef(null);

  const hasFilters = Boolean(filters.categoria || filters.estado || filters.q);
  useDocumentTitle(meta.totalPages > 1 ? `Publicaciones (página ${meta.page} de ${meta.totalPages}) · Panel` : 'Publicaciones · Panel');

  function hrefFor(page) {
    const params = new URLSearchParams();
    if (filters.categoria) params.set('categoria', filters.categoria);
    if (filters.estado) params.set('estado', filters.estado);
    if (filters.q) params.set('q', filters.q);
    if (page > 1) params.set('pagina', String(page));
    const qs = params.toString();
    return qs ? `/panel?${qs}` : '/panel';
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      await api(`/admin/posts/${toDelete.id}`, { method: 'DELETE' });
      // El botón que abrió el diálogo va a desaparecer: al cerrar, el foco va al título de la página.
      focusAfterClose.current = headingRef.current;
      setToDelete(null);
      setFlash(`Se eliminó «${toDelete.title}».`);
      revalidator.revalidate();
    } catch (err) {
      setToDelete(null);
      announce(`No se pudo eliminar «${toDelete.title}». ${err.message}`, { assertive: true });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="page-intro panel-intro">
        <h1 tabIndex={-1} ref={headingRef}>
          Publicaciones
        </h1>
        <Link to="/panel/publicaciones/nueva" className="button">
          Nueva publicación
        </Link>
      </div>

      {flash && <p className="notice notice--success">{flash}</p>}

      <Form method="get" role="search" className="filters" aria-labelledby="titulo-filtros">
          <h2 id="titulo-filtros" className="filters__title">
            Filtrar publicaciones
          </h2>
          <div className="filters__fields">
            <div className="field">
              <label className="field__label" htmlFor="filtro-q">
                Buscar por título
              </label>
              <input id="filtro-q" name="q" type="search" className="field__input" defaultValue={filters.q} />
            </div>
            <div className="field">
              <label className="field__label" htmlFor="filtro-categoria">
                Categoría
              </label>
              <select id="filtro-categoria" name="categoria" className="field__input field__select" defaultValue={filters.categoria}>
                <option value="">Todas</option>
                {CATEGORY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="field__label" htmlFor="filtro-estado">
                Estado
              </label>
              <select id="filtro-estado" name="estado" className="field__input field__select" defaultValue={filters.estado}>
                <option value="">Todos</option>
                <option value="published">Publicados</option>
                <option value="draft">Borradores</option>
              </select>
            </div>
          </div>
          <div className="button-group">
            <button type="submit" className="button button--secondary">
              Aplicar filtros
            </button>
            {hasFilters && <Link to="/panel">Quitar filtros</Link>}
          </div>
      </Form>

      <p className="results-count">
        {meta.total === 0
          ? hasFilters
            ? 'No hay publicaciones que coincidan con los filtros.'
            : 'Todavía no hay publicaciones.'
          : `${meta.total === 1 ? '1 publicación' : `${meta.total} publicaciones`}${hasFilters ? ' con estos filtros' : ''}${
              meta.totalPages > 1 ? ` · página ${meta.page} de ${meta.totalPages}` : ''
            }.`}
      </p>

      {posts.length > 0 && (
        <ul className="admin-list">
          {posts.map((post) => (
            <li key={post.id} className="admin-item">
              <h2 className="admin-item__title">{post.title}</h2>
              <dl className="admin-item__meta">
                <div>
                  <dt>Categoría</dt>
                  <dd>{CATEGORY_BY_SLUG[post.category]?.label}</dd>
                </div>
                <div>
                  <dt>Estado</dt>
                  <dd>
                    <span className={`status-tag status-tag--${post.status}`}>{STATUS_LABELS[post.status]}</span>
                  </dd>
                </div>
                <div>
                  <dt>Última modificación</dt>
                  <dd>
                    <time dateTime={post.updatedAt}>{formatDate(post.updatedAt)}</time>
                  </dd>
                </div>
              </dl>
              <div className="button-group">
                <Link to={`/panel/publicaciones/${post.id}`} className="button button--secondary button--small">
                  Editar <span className="visually-hidden">«{post.title}»</span>
                </Link>
                {post.status === 'published' && (
                  <Link to={`/${post.category}/${post.slug}`} className="button button--secondary button--small">
                    Ver en el sitio <span className="visually-hidden">«{post.title}»</span>
                  </Link>
                )}
                <button type="button" className="button button--danger button--small" onClick={() => setToDelete(post)}>
                  Eliminar <span className="visually-hidden">«{post.title}»</span>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Pagination page={meta.page} totalPages={meta.totalPages} hrefFor={hrefFor} />

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="¿Eliminar esta publicación?"
        confirmLabel="Sí, eliminar"
        busy={deleting}
        returnFocusRef={focusAfterClose}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      >
        <p>
          Vas a eliminar <strong>«{toDelete?.title}»</strong>. Esta acción no se puede deshacer. Si solo querés
          ocultarla del sitio, editala y pasala a borrador.
        </p>
      </ConfirmDialog>
    </>
  );
}
