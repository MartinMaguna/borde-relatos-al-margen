import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { useAnnounce } from '../a11y/Announcer.jsx';
import ErrorSummary from './forms/ErrorSummary.jsx';
import Honeypot from './forms/Honeypot.jsx';
import { RadioGroup, SelectField, TextArea, TextField, fieldId } from './forms/fields.jsx';
import { errorsByField, errorsFromApi } from './forms/errors.js';
import { formatDate } from '../lib/format.js';
import { questionsOf, resolveApplicationForm } from '../lib/applicationForm.js';

const prefixed = (errors) => errors.map((e) => (e.field ? { ...e, field: `application.${e.field}` } : e));
const fieldName = (key) => `application.answers.${key}`;

/** Atributos propios de cada tipo de respuesta. */
const INPUT_PROPS = {
  short: { maxLength: 300 },
  number: { inputMode: 'numeric', maxLength: 3, autoComplete: 'off' },
  email: { type: 'email', autoComplete: 'email', spellCheck: false, maxLength: 254 },
  link: { type: 'url', inputMode: 'url', spellCheck: false },
};
const AUTOCOMPLETE = { name: 'name' };

/** Una pregunta del formulario, según su tipo. Las obligatorias llevan aria-required; las opcionales dicen "(opcional)". */
function Question({ item, error }) {
  const common = { name: fieldName(item.key), hint: item.hint || undefined, error, optional: !item.required };
  if (item.type === 'long') return <TextArea {...common} label={item.label} rows={item.key === 'presentacion' ? 6 : 5} maxLength={30000} />;
  if (item.type === 'select') {
    return (
      <SelectField
        {...common}
        label={item.label}
        defaultValue=""
        options={[{ value: '', label: 'Seleccioná' }, ...item.options.map((o) => ({ value: o, label: o }))]}
      />
    );
  }
  if (item.type === 'choice') {
    return <RadioGroup {...common} legend={item.label} required={item.required} options={item.options.map((o) => ({ value: o, label: o }))} />;
  }
  return <TextField {...common} label={item.label} autoComplete={AUTOCOMPLETE[item.key]} {...INPUT_PROPS[item.type]} />;
}

/**
 * Formulario de postulación de una convocatoria (si el equipo lo activó),
 * tal como lo armó en el panel: secciones (título y descripción) y preguntas.
 * - Solo mientras la convocatoria está abierta; si no, se dice claramente.
 * - Sin adjuntos: la obra se comparte por enlace (Drive, YouTube, Dropbox…).
 * - Confirmación explícita al final.
 * - Al enviar, el formulario se reemplaza por la confirmación, que recibe el foco.
 */
export default function ApplicationForm({ post }) {
  const announce = useAnnounce();
  const [errors, setErrors] = useState([]);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const doneRef = useRef(null);
  const fieldErrors = errorsByField(errors);
  const consentId = fieldId('application.consent');
  const consentError = fieldErrors['application.consent'];
  const form = resolveApplicationForm(post.applicationForm);

  // La confirmación reemplaza al formulario: recibe el foco cuando ya está en pantalla.
  useEffect(() => {
    if (done) doneRef.current?.focus();
  }, [done]);

  if (post.callStatus !== 'abierta') {
    return (
      <section className="application" aria-labelledby="postular">
        <h2 id="postular">Postulación</h2>
        <p className="notice">
          {post.callStatus === 'proxima' ? (
            <>
              Esta convocatoria todavía no abrió. El formulario aparece acá desde el{' '}
              <time dateTime={post.opensAt}>{formatDate(post.opensAt)}</time>.
            </>
          ) : (
            'Esta convocatoria ya cerró: no se reciben más postulaciones.'
          )}
        </p>
      </section>
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    const f = new FormData(event.currentTarget);
    try {
      await api(`/posts/convocatorias/${post.slug}/applications`, {
        method: 'POST',
        body: {
          answers: Object.fromEntries(questionsOf(form).map((q) => [q.key, String(f.get(fieldName(q.key)) ?? '').trim()])),
          consent: f.get('application.consent') === 'on',
          website: f.get('website'),
        },
      });
      setErrors([]);
      setDone(true);
      announce('Recibimos tu postulación.');
    } catch (err) {
      setErrors(prefixed(errorsFromApi(err)));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="application" aria-labelledby="postular">
      <h2 id="postular">Postulate</h2>

      {done ? (
        <div className="notice notice--success" tabIndex={-1} ref={doneRef}>
          <p>
            <strong>Recibimos tu postulación.</strong> El equipo de Borde la va a leer después del cierre de la convocatoria.
            Te vamos a escribir al medio de contacto que dejaste.
          </p>
        </div>
      ) : (
        <>
          {form.intro && <p className="application__intro">{form.intro}</p>}
          <ErrorSummary errors={errors} />
          <form className="form" onSubmit={handleSubmit} noValidate>
            {form.items.map((item) =>
              item.type === 'section' ? (
                // Las secciones ordenan el formulario: h3 (dentro de "Postulate") y su descripción.
                <div key={item.key} className="application__section">
                  <h3 className="application__section-title">{item.label}</h3>
                  {item.hint && <p className="application__section-text">{item.hint}</p>}
                </div>
              ) : (
                <Question key={item.key} item={item} error={fieldErrors[fieldName(item.key)]} />
              ),
            )}

            {form.privacyText && <p className="application__privacy">{form.privacyText}</p>}
            <div className={`field${consentError ? ' field--error' : ''}`}>
              {consentError && (
                <p id={`${consentId}-error`} className="field__error">
                  <span className="field__error-prefix">Error:</span> {consentError}
                </p>
              )}
              <div className="checkbox">
                <input
                  id={consentId}
                  name="application.consent"
                  type="checkbox"
                  aria-required="true"
                  aria-invalid={consentError ? true : undefined}
                  aria-describedby={consentError ? `${consentId}-error` : undefined}
                />
                <label htmlFor={consentId}>{form.consentText}</label>
              </div>
              {post.basesUrl && (
                <p className="field__hint">
                  <a href={post.basesUrl}>Leer las bases de la convocatoria</a>
                </p>
              )}
            </div>

            <Honeypot id="postulacion-website" />
            <button type="submit" className="button">
              {submitting ? 'Enviando…' : 'Enviar postulación'}
            </button>
          </form>
        </>
      )}
    </section>
  );
}
