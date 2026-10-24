import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { useAnnounce } from '../a11y/Announcer.jsx';
import ErrorSummary from './forms/ErrorSummary.jsx';
import Honeypot from './forms/Honeypot.jsx';
import { TextArea, TextField, fieldId } from './forms/fields.jsx';
import { errorsByField, errorsFromApi } from './forms/errors.js';
import { formatDate } from '../lib/format.js';
import { resolveApplicationForm } from '../lib/applicationForm.js';

const prefixed = (errors) => errors.map((e) => (e.field ? { ...e, field: `application.${e.field}` } : e));

/**
 * Formulario de postulación de una convocatoria (si el equipo lo activó).
 * - Solo mientras la convocatoria está abierta; cerrada, se dice claramente.
 * - Sin adjuntos: el texto se pega o se comparte por enlace.
 * - Consentimiento explícito para guardar los datos.
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
  // Cómo lo armó el equipo en el panel (o el formulario original).
  const form = resolveApplicationForm(post.applicationForm);
  const { fields } = form;
  const show = (key) => fields[key] !== 'off';
  const optional = (key) => fields[key] === 'optional';

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
    const get = (k) => String(f.get(`application.${k}`) ?? '').trim();
    try {
      await api(`/posts/convocatorias/${post.slug}/applications`, {
        method: 'POST',
        body: {
          name: get('name'),
          email: get('email'),
          workTitle: get('workTitle'),
          text: get('text'),
          link: get('link'),
          message: get('message'),
          answers: Object.fromEntries(form.questions.map((q) => [q.key, get(`answers.${q.key}`)])),
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
            Si queda seleccionada, te escribimos al correo que dejaste.
          </p>
        </div>
      ) : (
        <>
          {form.intro ? (
            // Texto que escribió el equipo para esta convocatoria; respeta los saltos de línea.
            <p className="application__intro">{form.intro}</p>
          ) : (
            <p className="field__hint">
              Completá el formulario para postularte. No hace falta adjuntar archivos: pegá tu texto o compartí un enlace
              (por ejemplo, a un documento de Google Drive con acceso de lectura).
            </p>
          )}
          <ErrorSummary errors={errors} />
          <form className="form" onSubmit={handleSubmit} noValidate>
            <TextField name="application.name" label="Nombre y apellido" autoComplete="name" maxLength={120} error={fieldErrors['application.name']} />
            <TextField
              name="application.email"
              label="Correo electrónico"
              type="email"
              autoComplete="email"
              spellCheck={false}
              hint="Te vamos a escribir a este correo."
              error={fieldErrors['application.email']}
            />
            {show('workTitle') && (
              <TextField
                name="application.workTitle"
                label="Título de la obra"
                optional={optional('workTitle')}
                maxLength={200}
                error={fieldErrors['application.workTitle']}
              />
            )}
            {show('text') && (
              <TextArea
                name="application.text"
                label="Texto"
                optional={fields.text === 'optional'}
                rows={12}
                maxLength={30000}
                hint={
                  form.needsTextOrLink
                    ? 'Pegá acá tu texto (hasta 30.000 caracteres), o dejalo vacío si compartís un enlace.'
                    : 'Pegá acá tu texto (hasta 30.000 caracteres).'
                }
                error={fieldErrors['application.text']}
              />
            )}
            {show('link') && (
              <TextField
                name="application.link"
                label="Enlace al texto"
                type="url"
                optional={fields.link === 'optional'}
                hint="Dirección completa, por ejemplo https://docs.google.com/…"
                error={fieldErrors['application.link']}
              />
            )}
            {show('message') && (
              <TextArea
                name="application.message"
                label="Mensaje para el equipo"
                optional={optional('message')}
                rows={3}
                maxLength={2000}
                error={fieldErrors['application.message']}
              />
            )}
            {form.questions.map((q) => {
              const Field = q.type === 'long' ? TextArea : TextField;
              return (
                <Field
                  key={q.key}
                  name={`application.answers.${q.key}`}
                  label={q.label}
                  optional={!q.required}
                  hint={q.hint || undefined}
                  maxLength={q.type === 'long' ? 5000 : 300}
                  {...(q.type === 'long' ? { rows: 5 } : {})}
                  error={fieldErrors[`application.answers.${q.key}`]}
                />
              );
            })}

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
                <label htmlFor={consentId}>
                  Leí las bases y acepto que Borde guarde estos datos para evaluar mi postulación.
                </label>
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
