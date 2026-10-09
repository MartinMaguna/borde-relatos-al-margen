import { useState } from 'react';
import { Link, useLoaderData, useRevalidator } from 'react-router';
import { api } from '../../api/client.js';
import { useAnnounce } from '../../a11y/Announcer.jsx';
import { useDocumentTitle } from '../../a11y/hooks.js';
import ErrorSummary from '../../components/forms/ErrorSummary.jsx';
import { TextArea, TextField } from '../../components/forms/fields.jsx';
import { errorsByField, errorsFromApi } from '../../components/forms/errors.js';

/** Edición de la página "Acerca". Al guardar se queda en la misma vista y confirma. */
export default function AboutEditPage() {
  const { page } = useLoaderData();
  const announce = useAnnounce();
  const revalidator = useRevalidator();
  const [errors, setErrors] = useState([]);
  const [saved, setSaved] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const fieldErrors = errorsByField(errors);

  useDocumentTitle(`${errors.length ? 'Error: ' : ''}Editar la página Acerca · Panel`);

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setSaved(null);
    const form = new FormData(event.currentTarget);
    try {
      await api('/admin/pages/acerca', {
        method: 'PUT',
        body: { title: String(form.get('title')).trim(), body: String(form.get('body')) },
      });
      setErrors([]);
      const message = 'Se guardaron los cambios de la página Acerca.';
      setSaved(message);
      // El foco queda en el botón: el aviso se lee por la región viva.
      announce(message);
      revalidator.revalidate();
    } catch (err) {
      setErrors(errorsFromApi(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="form-page">
      <h1 tabIndex={-1}>Editar la página Acerca</h1>
      <p className="lead">
        Este texto se muestra en <Link to="/acerca">la página Acerca del sitio</Link>.
      </p>

      {saved && <p className="notice notice--success">{saved}</p>}
      <ErrorSummary errors={errors} />

      <form onSubmit={handleSubmit} noValidate className="form">
        <TextField name="title" label="Título" defaultValue={page.title || 'Acerca de Borde'} error={fieldErrors.title} />
        <TextArea
          name="body"
          label="Texto"
          optional
          rows={14}
          hint="Para separar párrafos, dejá una línea en blanco. Formato opcional en Markdown: **negrita**, *cursiva*, ## Subtítulo, [texto del enlace](https://…)."
          defaultValue={page.body}
          error={fieldErrors.body}
        />
        <button type="submit" className="button">
          {submitting ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </form>
    </div>
  );
}
