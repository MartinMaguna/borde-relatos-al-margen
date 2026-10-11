import { useId, useRef, useState } from 'react';
import { api } from '../../api/client.js';
import { useAnnounce } from '../../a11y/Announcer.jsx';
import { insertLink, insertSeparator, toggleInline, toggleLinePrefix } from '../../lib/markdownEdit.js';
import { TextArea, fieldId } from './fields.jsx';

/**
 * Campo de texto con barra de formato (Markdown).
 *
 * Por qué no un editor "visual" (WYSIWYG): los editores enriquecidos con
 * contenteditable son muy difíciles de usar con lector de pantalla. Acá el
 * texto sigue en un <textarea> nativo (lo lee bien cualquier lector, funciona
 * el corrector y el dictado) y la barra solo inserta el formato.
 *
 * Accesibilidad:
 * - role="toolbar" con nombre y aria-controls al campo; un solo punto de
 *   tabulación y flechas para moverse entre botones (patrón ARIA toolbar).
 * - Botones con texto visible (no solo íconos) y aria-keyshortcuts.
 * - Después de cada acción el foco vuelve al texto con la selección lista, y
 *   se anuncia lo que pasó ("Negrita aplicada" / "quitada").
 * - Deshacer (Ctrl+Z) funciona: el texto se inserta como si se tipeara.
 * - Vista previa generada por el servidor, igual a como se publica.
 */
const ACTIONS = [
  { id: 'h2', label: 'Título de sección', short: 'Título', kind: 'line', lineKind: 'heading', prefix: '# ', said: ['Título de sección aplicado', 'Título de sección quitado'] },
  { id: 'h3', label: 'Subtítulo', short: 'Subtítulo', kind: 'line', lineKind: 'heading', prefix: '## ', said: ['Subtítulo aplicado', 'Subtítulo quitado'] },
  { id: 'h4', label: 'Encabezado menor', short: 'Encabezado', kind: 'line', lineKind: 'heading', prefix: '### ', said: ['Encabezado aplicado', 'Encabezado quitado'] },
  { id: 'bold', label: 'Negrita', short: 'Negrita', kind: 'inline', marker: '**', placeholder: 'texto en negrita', keys: 'Control+B', said: ['Negrita aplicada', 'Negrita quitada'] },
  { id: 'italic', label: 'Cursiva', short: 'Cursiva', kind: 'inline', marker: '*', placeholder: 'texto en cursiva', keys: 'Control+I', said: ['Cursiva aplicada', 'Cursiva quitada'] },
  { id: 'strike', label: 'Tachado', short: 'Tachado', kind: 'inline', marker: '~~', placeholder: 'texto tachado', said: ['Tachado aplicado', 'Tachado quitado'] },
  { id: 'quote', label: 'Cita', short: 'Cita', kind: 'line', lineKind: 'quote', prefix: '> ', said: ['Cita aplicada', 'Cita quitada'] },
  { id: 'bullet', label: 'Lista con viñetas', short: 'Viñetas', kind: 'line', lineKind: 'bullet', prefix: '- ', said: ['Lista con viñetas aplicada', 'Lista con viñetas quitada'] },
  { id: 'ordered', label: 'Lista numerada', short: 'Numerada', kind: 'line', lineKind: 'ordered', prefix: '1. ', said: ['Lista numerada aplicada', 'Lista numerada quitada'] },
  { id: 'link', label: 'Enlace', short: 'Enlace', kind: 'link', keys: 'Control+K', said: ['Enlace insertado: completá la dirección', ''] },
  { id: 'hr', label: 'Separador', short: 'Separador', kind: 'hr', said: ['Separador insertado', ''] },
];

const SHORTCUTS = { b: 'bold', i: 'italic', k: 'link' };

function compute(action, value, start, end) {
  switch (action.kind) {
    case 'inline':
      return toggleInline(value, start, end, action.marker, action.placeholder);
    case 'line':
      return toggleLinePrefix(value, start, end, action.lineKind, action.prefix);
    case 'link':
      return insertLink(value, start, end);
    default:
      return insertSeparator(value, start, end);
  }
}

/** Reemplaza un tramo como si se tipeara (queda en el historial de deshacer); si no se puede, setRangeText. */
function replaceRange(textarea, { from, to, insert }) {
  textarea.focus();
  textarea.setSelectionRange(from, to);
  let done = false;
  try {
    done = typeof document.execCommand === 'function' && document.execCommand('insertText', false, insert);
  } catch {
    done = false;
  }
  if (!done || textarea.value.slice(from, from + insert.length) !== insert) {
    textarea.setRangeText(insert, from, to, 'end');
  }
}

export default function MarkdownEditor({ name, label, hint, error, defaultValue, rows = 16, optional = false, previewClassName = 'prose' }) {
  const textareaRef = useRef(null);
  const buttonsRef = useRef([]);
  const [active, setActive] = useState(0);
  const [preview, setPreview] = useState({ open: false, html: '', loading: false, error: null });
  const announce = useAnnounce();
  const toolbarLabelId = useId();
  const previewId = useId();
  const textareaId = fieldId(name);

  function apply(action) {
    const textarea = textareaRef.current;
    const { value, selectionStart, selectionEnd } = textarea;
    const change = compute(action, value, selectionStart, selectionEnd);
    replaceRange(textarea, change);
    textarea.setSelectionRange(change.selStart, change.selEnd);
    announce(change.removed ? action.said[1] : action.said[0]);
  }

  /** Flechas, Inicio y Fin dentro de la barra (un solo punto de tabulación). */
  function onToolbarKeyDown(event) {
    const last = ACTIONS.length - 1;
    const moves = { ArrowRight: active + 1, ArrowLeft: active - 1, Home: 0, End: last };
    if (!(event.key in moves)) return;
    event.preventDefault();
    let next = moves[event.key];
    if (next > last) next = 0;
    if (next < 0) next = last;
    setActive(next);
    buttonsRef.current[next]?.focus();
  }

  function onTextareaKeyDown(event) {
    if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) return;
    const id = SHORTCUTS[event.key.toLowerCase()];
    if (!id) return;
    event.preventDefault();
    apply(ACTIONS.find((a) => a.id === id));
  }

  async function loadPreview() {
    setPreview((p) => ({ ...p, open: true, loading: true, error: null }));
    try {
      const { data } = await api('/admin/preview', { method: 'POST', body: { markdown: textareaRef.current.value } });
      setPreview({ open: true, html: data.html, loading: false, error: null });
      announce('Vista previa actualizada.');
    } catch (err) {
      setPreview({ open: true, html: '', loading: false, error: err.message });
      announce(`No se pudo generar la vista previa. ${err.message}`, { assertive: true });
    }
  }

  return (
    <div className="md-editor">
      <p id={toolbarLabelId} className="visually-hidden">
        Formato del texto
      </p>
      {/* El foco lo tienen los botones (un solo punto de tabulación, flechas para moverse). */}
      <div
        role="toolbar"
        aria-labelledby={toolbarLabelId}
        aria-controls={textareaId}
        className="md-toolbar"
        onKeyDown={onToolbarKeyDown}
      >
        {ACTIONS.map((action, i) => (
          <button
            key={action.id}
            ref={(el) => (buttonsRef.current[i] = el)}
            type="button"
            className={`md-toolbar__button md-toolbar__button--${action.id}`}
            tabIndex={i === active ? 0 : -1}
            aria-keyshortcuts={action.keys}
            onFocus={() => setActive(i)}
            onClick={() => apply(action)}
          >
            {action.short !== action.label ? (
              <>
                <span aria-hidden="true">{action.short}</span>
                <span className="visually-hidden">{action.label}</span>
              </>
            ) : (
              action.label
            )}
          </button>
        ))}
      </div>

      <TextArea
        ref={textareaRef}
        name={name}
        label={label}
        optional={optional}
        rows={rows}
        hint={hint}
        defaultValue={defaultValue}
        error={error}
        onKeyDown={onTextareaKeyDown}
      />

      <div className="md-preview">
        <button
          type="button"
          className="button button--secondary button--small"
          aria-expanded={preview.open}
          aria-controls={previewId}
          onClick={() => (preview.open ? setPreview((p) => ({ ...p, open: false })) : loadPreview())}
        >
          {preview.open ? 'Ocultar vista previa' : 'Ver vista previa'}
        </button>
        {preview.open && (
          <button type="button" className="button button--secondary button--small" onClick={loadPreview}>
            Actualizar vista previa
          </button>
        )}
        <section id={previewId} hidden={!preview.open} aria-labelledby={`${previewId}-titulo`} className="md-preview__panel">
          <h2 id={`${previewId}-titulo`} className="md-preview__title">
            Vista previa
          </h2>
          {preview.loading && <p className="field__hint">Generando la vista previa…</p>}
          {preview.error && <p className="field__error">No se pudo generar la vista previa. {preview.error}</p>}
          {!preview.loading && !preview.error && (
            // HTML sanitizado por el servidor (mismas reglas que al publicar).
            <div className={previewClassName} dangerouslySetInnerHTML={{ __html: preview.html || '<p>(El texto está vacío.)</p>' }} />
          )}
        </section>
      </div>
    </div>
  );
}
