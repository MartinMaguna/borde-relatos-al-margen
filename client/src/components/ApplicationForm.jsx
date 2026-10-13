import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { useAnnounce } from '../a11y/Announcer.jsx';
import ErrorSummary from './forms/ErrorSummary.jsx';
import Honeypot from './forms/Honeypot.jsx';
import { TextArea, TextField, fieldId } from './forms/fields.jsx';
import { errorsByField, errorsFromApi } from './forms/errors.js';
import { formatDate } from '../lib/format.js';

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
          <p className="field__hint">
            Completá el formulario para postularte. No hace falta adjuntar archivos: pegá tu texto o compartí un enlace
            (por ejemplo, a un documento de Google Drive con acceso de lectura).
          </p>
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
            <TextField name="application.workTitle" label="Título de la obra" maxLength={200} error={fieldErrors['application.workTitle']} />
            <TextArea
              name="application.text"
              label="Texto"
              optional
              rows={12}
              maxLength={30000}
              hint="Pegá acá tu texto (hasta 30.000 caracteres), o dejalo vacío si compartís un enlace."
              error={fieldErrors['application.text']}
            />
            <TextField
              name="application.link"
              label="Enlace al texto"
              type="url"
              optional
              hint="Dirección completa, por ejemplo https://docs.google.com/…"
              error={fieldErrors['application.link']}
            />
            <TextArea name="application.message" label="Mensaje para el equipo" optional rows={3} maxLength={2000} error={fieldErrors['application.message']} />

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
