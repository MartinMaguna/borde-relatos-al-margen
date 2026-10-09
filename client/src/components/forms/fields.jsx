/**
 * Campos de formulario accesibles con una estructura común:
 *
 *   <label for>Etiqueta (opcional)</label>
 *   <p id="…-pista">Pista</p>
 *   <p id="…-error">Error: mensaje</p>
 *   <input id aria-describedby="…-pista …-error" aria-invalid>
 *
 * - La etiqueta siempre visible y asociada (nada de placeholder como etiqueta).
 * - Marcamos los campos opcionales, no los obligatorios (que llevan `required`,
 *   y el lector anuncia "obligatorio").
 * - El error se lee al enfocar el campo y dice "Error:" en texto, no solo en color.
 */

/** id del campo a partir del nombre que usa la API ("image.alt" → "campo-image-alt"). */
export const fieldId = (name) => `campo-${name.replace(/\./g, '-')}`;

function describedBy(id, hint, error) {
  return [hint && `${id}-pista`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
}

function Label({ id, label, optional }) {
  return (
    <label className="field__label" htmlFor={id}>
      {label}
      {optional && <span className="field__optional"> (opcional)</span>}
    </label>
  );
}

function HintAndError({ id, hint, error }) {
  return (
    <>
      {hint && (
        <p id={`${id}-pista`} className="field__hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="field__error">
          <span className="field__error-prefix">Error:</span> {error}
        </p>
      )}
    </>
  );
}

export function TextField({ name, label, hint, error, optional = false, type = 'text', ...inputProps }) {
  const id = fieldId(name);
  return (
    <div className={`field${error ? ' field--error' : ''}`}>
      <Label id={id} label={label} optional={optional} />
      <HintAndError id={id} hint={hint} error={error} />
      <input
        id={id}
        name={name}
        type={type}
        className="field__input"
        required={!optional}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        {...inputProps}
      />
    </div>
  );
}

export function TextArea({ name, label, hint, error, optional = false, rows = 4, ...props }) {
  const id = fieldId(name);
  return (
    <div className={`field${error ? ' field--error' : ''}`}>
      <Label id={id} label={label} optional={optional} />
      <HintAndError id={id} hint={hint} error={error} />
      <textarea
        id={id}
        name={name}
        rows={rows}
        className="field__input field__textarea"
        required={!optional}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        {...props}
      />
    </div>
  );
}

export function SelectField({ name, label, hint, error, optional = false, options, ...props }) {
  const id = fieldId(name);
  return (
    <div className={`field${error ? ' field--error' : ''}`}>
      <Label id={id} label={label} optional={optional} />
      <HintAndError id={id} hint={hint} error={error} />
      <select
        id={id}
        name={name}
        className="field__input field__select"
        required={!optional}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Grupo de radios dentro de <fieldset>/<legend>: el lector anuncia la pregunta
 * ("Estado") al entrar al grupo. El id apunta al primer radio, para que el
 * enlace del resumen de errores pueda enfocarlo.
 */
export function RadioGroup({ name, legend, hint, error, options, defaultValue }) {
  const id = fieldId(name);
  return (
    <fieldset className={`field fieldset${error ? ' field--error' : ''}`} aria-describedby={describedBy(id, hint, error)}>
      <legend className="field__label">{legend}</legend>
      <HintAndError id={id} hint={hint} error={error} />
      <div className="radios">
        {options.map((o, i) => (
          <div className="radio" key={o.value}>
            <input
              id={i === 0 ? id : `${id}-${o.value}`}
              type="radio"
              name={name}
              value={o.value}
              defaultChecked={defaultValue === o.value}
            />
            <label htmlFor={i === 0 ? id : `${id}-${o.value}`}>{o.label}</label>
          </div>
        ))}
      </div>
    </fieldset>
  );
}

/** Agrupa campos relacionados (p. ej. imagen: URL + texto alternativo). */
export function Fieldset({ legend, hint, children }) {
  return (
    <fieldset className="fieldset fieldset--group">
      <legend className="fieldset__legend">{legend}</legend>
      {hint && <p className="field__hint">{hint}</p>}
      {children}
    </fieldset>
  );
}
