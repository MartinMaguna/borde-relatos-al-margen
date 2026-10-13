import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useAnnounce } from '../a11y/Announcer.jsx';
import { useSaved } from '../lib/saved.js';
import {
  BookmarkIcon,
  CopyIcon,
  FacebookIcon,
  LinkedinIcon,
  ListIcon,
  MailIcon,
  ShareIcon,
  WhatsappIcon,
} from './icons.jsx';

/**
 * Guardar · Compartir · Mis guardados, arriba del texto de una publicación.
 *
 * - Guardar: botón cuyo texto dice lo que hace ("Guardar" / "Quitar de guardados").
 * - Compartir: botón que despliega opciones (patrón "disclosure": aria-expanded
 *   y aria-controls), no un menú ARIA: son enlaces y botones comunes, que se
 *   recorren con Tab como cualquier otro. Escape cierra y devuelve el foco.
 * - Mis guardados: enlace a la página Guardados (es su único acceso).
 */
export default function ArticleActions({ post }) {
  const { isSaved, save, remove } = useSaved();
  const saved = isSaved(post);
  const announce = useAnnounce();

  function toggleSaved() {
    if (saved) {
      remove(post);
      announce('Se quitó de Guardados.');
    } else {
      save(post);
      announce('Guardado en este navegador. Lo encontrás en la página Guardados.');
    }
  }

  return (
    <div className="article-actions">
      <button type="button" className="action-button" onClick={toggleSaved}>
        <BookmarkIcon filled={saved} />
        {saved ? 'Quitar de guardados' : 'Guardar'}
      </button>
      <ShareMenu post={post} />
      <Link className="action-button" to="/guardados">
        <ListIcon />
        Mis guardados
      </Link>
    </div>
  );
}

function ShareMenu({ post }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);
  const wrapperRef = useRef(null);
  const panelId = useId();
  const announce = useAnnounce();

  // Dirección canónica de la publicación (sin #ancla ni parámetros).
  const url = `${window.location.origin}/${post.category}/${post.slug}`;
  const text = `${post.title}, de ${post.author}. En Borde Relatos al margen.`;
  const enc = encodeURIComponent;
  const canShareNatively = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  // Cerrar al hacer clic o mover el foco fuera del panel.
  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (e) => {
      if (!wrapperRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [open]);

  function close({ returnFocus = true } = {}) {
    setOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      announce('Enlace copiado.');
    } catch {
      announce(`No se pudo copiar automáticamente. El enlace es ${url}`, { assertive: true });
    }
    close();
  }

  async function shareNatively() {
    try {
      await navigator.share({ title: post.title, text, url });
      close();
    } catch {
      // La persona canceló: no es un error.
    }
  }

  const external = (label) => (
    <>
      {label} <span className="visually-hidden">(se abre en otra pestaña)</span>
    </>
  );

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- Escape para cerrar el panel; los controles reales son botones y enlaces
    <div
      className="share"
      ref={wrapperRef}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) {
          e.stopPropagation();
          close();
        }
      }}
      onBlur={(e) => {
        if (open && !wrapperRef.current?.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        className="action-button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
      >
        <ShareIcon />
        Compartir
      </button>
      <ul id={panelId} className="share__panel" hidden={!open}>
        <li>
          <button type="button" className="share__item" onClick={copyLink}>
            <CopyIcon /> Copiar enlace
          </button>
        </li>
        <li>
          <a className="share__item" href={`https://wa.me/?text=${enc(`${text} ${url}`)}`} target="_blank" rel="noopener noreferrer">
            <WhatsappIcon /> {external('WhatsApp')}
          </a>
        </li>
        <li>
          <a className="share__item" href={`mailto:?subject=${enc(post.title)}&body=${enc(`${text}\n\n${url}`)}`}>
            <MailIcon /> Correo electrónico
          </a>
        </li>
        <li>
          <a className="share__item" href={`https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`} target="_blank" rel="noopener noreferrer">
            <FacebookIcon /> {external('Facebook')}
          </a>
        </li>
        <li>
          <a className="share__item" href={`https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`} target="_blank" rel="noopener noreferrer">
            <LinkedinIcon /> {external('LinkedIn')}
          </a>
        </li>
        {canShareNatively && (
          <li>
            <button type="button" className="share__item" onClick={shareNatively}>
              <ShareIcon /> Más opciones…
            </button>
          </li>
        )}
      </ul>
    </div>
  );
}
