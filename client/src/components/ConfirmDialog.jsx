import { useEffect, useId, useRef } from 'react';

/**
 * Diálogo de confirmación con <dialog> nativo y showModal():
 * - El navegador mantiene el foco dentro del diálogo y deja inerte el resto de la página.
 * - Escape lo cierra (evento "cancel").
 * - El foco inicial va a "Cancelar": la opción segura en una acción destructiva.
 * - Mientras se procesa, los botones no se deshabilitan (perderían el foco):
 *   se ignoran los clics repetidos.
 * - Al cerrarse, el foco vuelve al elemento que lo abrió, o a `returnFocusRef.current`
 *   si se indicó (p. ej. cuando el botón que lo abrió desaparece tras eliminar).
 */
export default function ConfirmDialog({ open, title, children, confirmLabel, onConfirm, onCancel, busy = false, returnFocusRef }) {
  const ref = useRef(null);
  const cancelRef = useRef(null);
  const opener = useRef(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      opener.current = document.activeElement;
      dialog.showModal();
      cancelRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
      const target = returnFocusRef?.current ?? opener.current;
      if (returnFocusRef) returnFocusRef.current = null;
      if (target?.isConnected) target.focus();
    }
  }, [open, returnFocusRef]);

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby={titleId}
      aria-describedby={descId}
      onCancel={(e) => {
        e.preventDefault(); // lo cerramos nosotros, para mantener el estado sincronizado
        if (!busy) onCancel();
      }}
    >
      <h2 id={titleId} className="dialog__title">
        {title}
      </h2>
      <div id={descId}>{children}</div>
      <div className="button-group">
        <button ref={cancelRef} type="button" className="button button--secondary" onClick={() => !busy && onCancel()}>
          Cancelar
        </button>
        <button type="button" className="button button--danger" onClick={() => !busy && onConfirm()}>
          {busy ? 'Eliminando…' : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
