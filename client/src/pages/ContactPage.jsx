import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { useAnnounce } from '../a11y/Announcer.jsx';
import { useDocumentTitle } from '../a11y/hooks.js';
import ErrorSummary from '../components/forms/ErrorSummary.jsx';
import Honeypot from '../components/forms/Honeypot.jsx';
import { TextArea, TextField } from '../components/forms/fields.jsx';
import { errorsByField, errorsFromApi } from '../components/forms/errors.js';

/** Los errores de la API vienen como "name"/"email"/"message": acá los campos llevan el prefijo "contact.". */
const prefixed = (errors) => errors.map((e) => (e.field ? { ...e, field: `contact.${e.field}` } : e));

/**
 * Contacto: formulario que llega por correo al equipo. El correo del equipo
 * no aparece en el sitio (lo tiene solo el servidor).
 * Al enviar, el formulario se reemplaza por la confirmación, que recibe el foco.
 */
export default function ContactPage() {
  const announce = useAnnounce();
  const [errors, setErrors] = useState([]);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const doneRef = useRef(null);
  const fieldErrors = errorsByField(errors);
  useDocumentTitle(`${errors.length ? 'Error: ' : ''}Contacto`);

  useEffect(() => {
    if (done) doneRef.current?.focus();
  }, [done]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    const f = new FormData(event.currentTarget);
    const get = (k) => String(f.get(`contact.${k}`) ?? '').trim();
    try {
      await api('/contact', {
        method: 'POST',
        body: { name: get('name'), email: get('email'), message: get('message'), website: f.get('website') },
      });
      setErrors([]);
      setDone(true);
      announce('Mensaje enviado.');
    } catch (err) {
      setErrors(prefixed(errorsFromApi(err)));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="article">
      <h1 tabIndex={-1}>Contacto</h1>
      <p className="lead">
        ¿Querés proponer un texto, sumarte a un taller o contarnos algo? Escribinos y te respondemos a la brevedad.
      </p>

      {done ? (
        <div className="notice notice--success" tabIndex={-1} ref={doneRef}>
          <p>
            <strong>Mensaje enviado.</strong> Gracias por escribirnos: te vamos a responder al correo que dejaste.
          </p>
        </div>
      ) : (
        <section className="contact-card" aria-labelledby="contacto-formulario">
          <h2 id="contacto-formulario">Escribinos</h2>
          <p className="field__hint">Todos los campos son obligatorios.</p>
          <ErrorSummary errors={errors} />
          <form className="form" onSubmit={handleSubmit} noValidate>
            <TextField name="contact.name" label="Nombre" autoComplete="name" maxLength={120} error={fieldErrors['contact.name']} />
            <TextField
              name="contact.email"
              label="Correo electrónico"
              type="email"
              autoComplete="email"
              spellCheck={false}
              hint="Te respondemos a este correo."
              error={fieldErrors['contact.email']}
            />
            <TextArea
              name="contact.message"
              label="Mensaje"
              rows={7}
              maxLength={5000}
              hint="Hasta 5000 caracteres."
              error={fieldErrors['contact.message']}
            />
            <Honeypot id="contacto-website" />
            <button type="submit" className="button">
              {submitting ? 'Enviando…' : 'Enviar mensaje'}
            </button>
          </form>
        </section>
      )}

      <p>
        Para postularte a una convocatoria, usá el formulario de esa convocatoria (si lo tiene) o seguí lo que indican
        sus bases.
      </p>
    </div>
  );
}
