import { Link } from 'react-router';
import { useAnnounce } from '../a11y/Announcer.jsx';
import { useDocumentTitle } from '../a11y/hooks.js';
import { useSaved } from '../lib/saved.js';
import { CATEGORY_BY_SLUG } from '../lib/site.js';

/** Publicaciones guardadas en este navegador con el botón "Guardar". */
export default function SavedPage() {
  const { list, remove } = useSaved();
  const announce = useAnnounce();
  useDocumentTitle('Guardados');

  function removeItem(item) {
    remove(item);
    announce(`Se quitó «${item.title}» de Guardados.`);
    // El botón desaparece con su elemento: el foco vuelve al título de la página.
    document.querySelector('main h1')?.focus();
  }

  return (
    <div className="article">
      <h1 tabIndex={-1}>Guardados</h1>
      <p className="lead">
        Los textos que guardaste con el botón «Guardar». Quedan en este navegador: si entrás desde otro dispositivo, no
        aparecen.
      </p>

      {list.length === 0 ? (
        <p className="notice">Todavía no guardaste ningún texto.</p>
      ) : (
        <ul className="saved-list">
          {list.map((item) => (
            <li key={`${item.category}/${item.slug}`} className="saved-item">
              <p className="post-card__category">{CATEGORY_BY_SLUG[item.category]?.label}</p>
              <h2 className="saved-item__title">
                <Link to={`/${item.category}/${item.slug}`}>{item.title}</Link>
              </h2>
              <p className="post-meta">Por {item.author}</p>
              <button type="button" className="button button--secondary button--small" onClick={() => removeItem(item)}>
                Quitar <span className="visually-hidden">«{item.title}» de Guardados</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
