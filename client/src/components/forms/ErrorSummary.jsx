import { useEffect, useRef } from 'react';
import { fieldId } from './fields.jsx';

/**
 * Resumen de errores (patrón GOV.UK): aparece arriba del formulario y recibe
 * el foco. Su contenido va en un role="alert", así se lee completo también en
 * lectores que, al enfocar un contenedor genérico, no leen lo que tiene adentro.
 * Cada error es un enlace que lleva el foco directamente al campo con problemas.
 *
 * `errors`: [{ field, message }]. Un error sin campo (p. ej. "credenciales
 * incorrectas" o "sin conexión") se muestra como texto, sin enlace.
 */
export default function ErrorSummary({ errors, title }) {
  const ref = useRef(null);

  useEffect(() => {
    if (errors.length) ref.current?.focus();
  }, [errors]);

  if (!errors.length) return null;

  const heading = title ?? (errors.length === 1 ? 'Hay un problema' : `Hay ${errors.length} problemas`);

  function goToField(event, field) {
    const target = document.getElementById(fieldId(field));
    if (!target) return;
    event.preventDefault();
    target.focus();
  }

  return (
    <div className="error-summary" tabIndex={-1} ref={ref}>
      <div role="alert">
        <h2 className="error-summary__title">{heading}</h2>
        <ul className="error-summary__list">
          {errors.map((error, i) => (
            <li key={`${error.field}-${i}`}>
              {error.field ? (
                <a href={`#${fieldId(error.field)}`} onClick={(e) => goToField(e, error.field)}>
                  {error.message}
                </a>
              ) : (
                error.message
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
