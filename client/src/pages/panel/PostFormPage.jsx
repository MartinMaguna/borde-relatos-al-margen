import { useRef, useState } from 'react';
import { Link, useLoaderData, useNavigate } from 'react-router';
import { api } from '../../api/client.js';
import { useDocumentTitle } from '../../a11y/hooks.js';
import ErrorSummary from '../../components/forms/ErrorSummary.jsx';
import ImageField from '../../components/forms/ImageField.jsx';
import MediaFields from '../../components/forms/MediaFields.jsx';
import MarkdownEditor from '../../components/forms/MarkdownEditor.jsx';
import ChaptersField, { chaptersFrom } from '../../components/forms/ChaptersField.jsx';
import ApplicationFormEditor, { applicationFormFrom } from '../../components/forms/ApplicationFormEditor.jsx';
import { Fieldset, SelectField, TextArea, TextField } from '../../components/forms/fields.jsx';
import { errorsByField, errorsFromApi } from '../../components/forms/errors.js';
import { CATEGORY_OPTIONS, STATUS_LABELS, toDateInput } from '../../lib/admin.js';

const EMPTY_POST = {
  title: '',
  slug: '',
  category: 'poesia',
  author: '',
  summary: '',
  body: '',
  chapters: [],
  status: 'draft',
  image: null,
  opensAt: null,
  deadline: null,
  basesUrl: '',
};

/** Arma el cuerpo que espera la API a partir del formulario. */
function payloadFrom(form, status, previousApplicationForm) {
  const get = (name) => String(form.get(name) ?? '').trim();
  const imageUrl = get('image.url');
  return {
    title: get('title'),
    slug: get('slug'),
    category: get('category'),
    author: get('author'),
    summary: get('summary'),
    body: get('body'),
    chapters: get('category') === 'cuentos' ? chaptersFrom(form) : [],
    status,
    // Sin URL no hay imagen; si hay URL, el texto alternativo es obligatorio (lo valida la API).
    image: imageUrl ? { url: imageUrl, alt: get('image.alt') } : null,
    // Sin enlace no hay audio. La API valida y normaliza el enlace.
    audio: get('audio.url') ? { url: get('audio.url'), label: get('audio.label') } : null,
    signVideoUrl: get('signVideoUrl'),
    acceptsApplications: form.get('acceptsApplications') === 'on',
    // Con el formulario desactivado, su configuración se conserva para cuando se vuelva a activar.
    applicationForm: form.has('applicationForm.intro') ? applicationFormFrom(form) : (previousApplicationForm ?? null),
    opensAt: get('opensAt'),
    deadline: get('deadline'),
    basesUrl: get('basesUrl'),
  };
}

/** Mensaje de confirmación según lo que pasó con el estado. */
function savedMessage(saved, previousStatus) {
  const title = `«${saved.title}»`;
  if (saved.status === 'published') {
    return previousStatus === 'published'
      ? `Se guardaron los cambios de ${title}. Sigue publicada en el sitio.`
      : `Se publicó ${title}. Ya está visible en el sitio.`;
  }
  return previousStatus === 'published'
    ? `${title} pasó a borrador: ya no se ve en el sitio.`
    : `Se guardó el borrador ${title}. No se ve en el sitio hasta que lo publiques.`;
}

/**
 * Alta y edición de publicaciones (misma vista).
 * Formulario sin estado controlado: los valores viven en el DOM y sobreviven a
 * los errores de validación, así no se pierde nada de lo escrito.
 */
export default function PostFormPage() {
  const loaderData = useLoaderData();
  const post = loaderData?.post ?? EMPTY_POST;
  const isEdit = Boolean(loaderData?.post);
  const navigate = useNavigate();
  const [errors, setErrors] = useState([]);
  // Estado elegido con el botón usado ("draft" / "published"); null mientras no se envía.
  const [submitting, setSubmitting] = useState(null);
  const intent = useRef(null);
  const isPublished = isEdit && post.status === 'published';
  // Solo la categoría necesita estado: decide si se muestran los campos de convocatoria.
  const [category, setCategory] = useState(post.category);
  // Decide si se muestra el editor del formulario de postulación.
  const [acceptsApplications, setAcceptsApplications] = useState(Boolean(post.acceptsApplications));
  const fieldErrors = errorsByField(errors);

  const pageTitle = isEdit ? `Editar «${post.title}»` : 'Nueva publicación';
  useDocumentTitle(`${errors.length ? 'Error: ' : ''}${pageTitle} · Panel`);

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;
    // El botón usado define el estado. Con Enter en un campo, el navegador usa el
    // primer botón del formulario, que siempre es el más prudente.
    const status = event.nativeEvent.submitter?.value || intent.current || (isPublished ? 'published' : 'draft');
    intent.current = null; // un Enter posterior no debe repetir un «Publicar» anterior
    setSubmitting(status);
    const body = payloadFrom(new FormData(event.currentTarget), status, post.applicationForm);
    try {
      const { data: saved } = await api(isEdit ? `/admin/posts/${post.id}` : '/admin/posts', {
        method: isEdit ? 'PUT' : 'POST',
        body,
      });
      navigate('/panel', { state: { flash: savedMessage(saved, isEdit ? post.status : null) } });
    } catch (err) {
      setErrors(errorsFromApi(err));
      setSubmitting(null);
    }
  }

  return (
    <div className="form-page">
      <p className="back-nav">
        <Link to="/panel">Volver a publicaciones</Link>
      </p>
      <h1 tabIndex={-1}>{pageTitle}</h1>
      {isEdit && (
        <p className="lead">
          Estado actual:{' '}
          <span className={`status-tag status-tag--${post.status}`}>{STATUS_LABELS[post.status]}</span>
          {post.status === 'published' ? ' (visible en el sitio)' : ' (no se ve en el sitio)'}
        </p>
      )}

      <ErrorSummary errors={errors} />

      {/* key: al pasar de una publicación a otra, el formulario se vuelve a montar con los valores nuevos. */}
      <form key={post.id ?? 'nueva'} onSubmit={handleSubmit} noValidate className="form">
        <TextField name="title" label="Título" defaultValue={post.title} error={fieldErrors.title} />

        <SelectField
          name="category"
          label="Categoría"
          hint="Si elegís Cuentos, podés dividirlo en capítulos; si elegís Convocatorias, aparecen los campos de fechas y bases."
          options={CATEGORY_OPTIONS}
          defaultValue={post.category}
          onChange={(e) => setCategory(e.target.value)}
          error={fieldErrors.category}
        />

        <TextField
          name="author"
          label="Autor o autora"
          hint="Quien escribió el texto."
          autoComplete="off"
          defaultValue={post.author}
          error={fieldErrors.author}
        />

        <TextArea
          name="summary"
          label="Resumen"
          optional
          rows={3}
          maxLength={500}
          hint="Hasta 500 caracteres. Se muestra en los listados y en la portada."
          defaultValue={post.summary}
          error={fieldErrors.summary}
        />

        <MarkdownEditor
          name="body"
          label="Texto"
          rows={16}
          hint={`${category === 'cuentos' ? 'Si el cuento tiene capítulos (más abajo), este texto es la introducción y puede quedar vacío. ' : ''}Cada salto de línea se respeta, ideal para versos; para separar párrafos o estrofas, dejá una línea en blanco. Usá la barra de formato (antes del campo) o los atajos Control+B negrita, Control+I cursiva y Control+K enlace.`}
          defaultValue={post.body}
          error={fieldErrors.body}
          previewClassName={`prose prose--${category}`}
        />

        {category === 'cuentos' && <ChaptersField initial={post.chapters ?? []} errors={fieldErrors} />}

        {category === 'convocatorias' && (
          <Fieldset legend="Datos de la convocatoria">
            <TextField
              name="opensAt"
              label="Fecha de apertura"
              type="date"
              optional
              hint="Desde ese día se reciben postulaciones. Antes, la convocatoria figura como «Próximamente». Si la dejás vacía, está abierta desde que se publica."
              defaultValue={toDateInput(post.opensAt)}
              error={fieldErrors.opensAt}
            />
            <TextField
              name="deadline"
              label="Fecha límite"
              type="date"
              hint="La convocatoria figura como abierta hasta el final de ese día."
              defaultValue={toDateInput(post.deadline)}
              error={fieldErrors.deadline}
            />
            <TextField
              name="basesUrl"
              label="Enlace a las bases"
              type="url"
              optional
              hint="Dirección completa, por ejemplo https://ejemplo.com/bases"
              defaultValue={post.basesUrl ?? ''}
              error={fieldErrors.basesUrl}
            />
            <div className="field">
              <div className="checkbox">
                <input
                  id="campo-acceptsApplications"
                  name="acceptsApplications"
                  type="checkbox"
                  defaultChecked={post.acceptsApplications}
                  onChange={(e) => setAcceptsApplications(e.target.checked)}
                  aria-describedby="campo-acceptsApplications-pista"
                />
                <label htmlFor="campo-acceptsApplications">Recibir postulaciones con el formulario del sitio</label>
              </div>
              <p id="campo-acceptsApplications-pista" className="field__hint">
                Agrega un formulario de postulación al final de la convocatoria mientras esté abierta. Las postulaciones
                llegan al panel y se pueden descargar en CSV. Al marcarla aparece, debajo, el editor del formulario.
              </p>
            </div>
          </Fieldset>
        )}

        {category === 'convocatorias' && acceptsApplications && (
          <ApplicationFormEditor initial={post.applicationForm} errors={fieldErrors} />
        )}

        <ImageField initialUrl={post.image?.url ?? ''} initialAlt={post.image?.alt ?? ''} errors={fieldErrors} />

        <MediaFields post={post} errors={fieldErrors} />

        <TextField
          name="slug"
          label="Dirección web (slug)"
          optional
          spellCheck={false}
          autoComplete="off"
          hint={
            isEdit
              ? `Actual: /${post.category}/${post.slug}. Cambiala solo si es necesario: los enlaces compartidos dejarían de funcionar.`
              : 'Si la dejás vacía, se genera a partir del título. Solo minúsculas sin tildes, números y guiones.'
          }
          defaultValue={isEdit ? post.slug : ''}
          error={fieldErrors.slug}
        />

        {/*
          Acciones. El primer botón es el que usa el navegador al pulsar Enter en
          un campo, así que siempre es el que NO cambia la visibilidad en el sitio.
          No se deshabilitan mientras se guarda (perderían el foco).
        */}
        <div className="form-actions">
          {isPublished ? (
            <>
              <button type="submit" name="status" value="published" className="button" onClick={() => (intent.current = 'published')}>
                {submitting === 'published' ? 'Guardando…' : 'Guardar cambios'}
              </button>
              <button type="submit" name="status" value="draft" className="button button--secondary" onClick={() => (intent.current = 'draft')}>
                {submitting === 'draft' ? 'Guardando…' : 'Pasar a borrador'}
              </button>
            </>
          ) : (
            <>
              <button type="submit" name="status" value="draft" className="button button--secondary" onClick={() => (intent.current = 'draft')}>
                {submitting === 'draft' ? 'Guardando…' : 'Guardar borrador'}
              </button>
              <button type="submit" name="status" value="published" className="button" onClick={() => (intent.current = 'published')}>
                {submitting === 'published' ? 'Publicando…' : 'Publicar'}
              </button>
            </>
          )}
          <Link to="/panel">Cancelar</Link>
        </div>
        <p className="field__hint">
          {isPublished
            ? '«Pasar a borrador» la saca del sitio sin borrarla.'
            : 'Un borrador se guarda pero no se ve en el sitio. Podés publicarlo cuando quieras.'}
        </p>
      </form>
    </div>
  );
}
