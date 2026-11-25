import { useState } from 'react';
import { Link, useLoaderData, useRevalidator } from 'react-router';
import { api } from '../../api/client.js';
import { useAnnounce } from '../../a11y/Announcer.jsx';
import { useDocumentTitle } from '../../a11y/hooks.js';
import ErrorSummary from '../../components/forms/ErrorSummary.jsx';
import { TextArea } from '../../components/forms/fields.jsx';
import { errorsByField, errorsFromApi } from '../../components/forms/errors.js';

/**
 * Textos del sitio que no pertenecen a una publicación (por ahora, el mensaje
 * de Convocatorias cuando no hay ninguna). Al guardar se queda en la vista y
 * confirma, como la página Acerca.
 */
export default function SiteTextsPage() {
  const { settings } = useLoaderData();
  const announce = useAnnounce();
  const revalidator = useRevalidator();
  const [errors, setErrors] = useState([]);
  const [saved, setSaved] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const fieldErrors = errorsByField(errors);
  useDocumentTitle(`${errors.length ? 'Error: ' : ''}Textos del sitio · Panel`);

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setSaved(null);
    const form = new FormData(event.currentTarget);
    try {
      await api('/admin/settings', { method: 'PUT', body: { convocatoriasEmpty: String(form.get('convocatoriasEmpty') ?? '').trim() } });
      setErrors([]);
      const message = 'Se guardaron los textos del sitio.';
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
      <h1 tabIndex={-1}>Textos del sitio</h1>
      <p className="lead">Mensajes que aparecen en el sitio y no forman parte de una publicación.</p>

      {saved && <p className="notice notice--success">{saved}</p>}
      <ErrorSummary errors={errors} />

      <form onSubmit={handleSubmit} noValidate className="form">
        <TextArea
          name="convocatoriasEmpty"
          label="Convocatorias: mensaje cuando no hay ninguna"
          optional
          rows={3}
          maxLength={1000}
          hint={
            <>
              Se muestra en la página <Link to="/convocatorias">Convocatorias</Link> cuando no hay convocatorias publicadas. Si
              lo dejás vacío, dice: «{settings.defaults.convocatoriasEmpty}»
            </>
          }
          defaultValue={settings.convocatoriasEmpty}
          error={fieldErrors.convocatoriasEmpty}
        />
        <button type="submit" className="button">
          {submitting ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </form>
    </div>
  );
}
