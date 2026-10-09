import { useState } from 'react';
import { Link, useLoaderData, useNavigate } from 'react-router';
import { api } from '../../api/client.js';
import { useDocumentTitle } from '../../a11y/hooks.js';
import ErrorSummary from '../../components/forms/ErrorSummary.jsx';
import { Fieldset, RadioGroup, SelectField, TextArea, TextField } from '../../components/forms/fields.jsx';
import { errorsByField, errorsFromApi } from '../../components/forms/errors.js';
import { CATEGORY_OPTIONS, STATUS_OPTIONS, toDateInput } from '../../lib/admin.js';

const EMPTY_POST = {
  title: '',
  slug: '',
  category: 'poesia',
  author: '',
  summary: '',
  body: '',
  status: 'draft',
  image: null,
  deadline: null,
  basesUrl: '',
};

/** Arma el cuerpo que espera la API a partir del formulario. */
function payloadFrom(form) {
  const get = (name) => String(form.get(name) ?? '').trim();
  const imageUrl = get('image.url');
  return {
    title: get('title'),
    slug: get('slug'),
    category: get('category'),
    author: get('author'),
    summary: get('summary'),
    body: get('body'),
    status: get('status') || 'draft',
    // Sin URL no hay imagen; si hay URL, el texto alternativo es obligatorio (lo valida la API).
    image: imageUrl ? { url: imageUrl, alt: get('image.alt') } : null,
    deadline: get('deadline'),
    basesUrl: get('basesUrl'),
  };
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
  const [submitting, setSubmitting] = useState(false);
  // Solo la categoría necesita estado: decide si se muestran los campos de convocatoria.
  const [category, setCategory] = useState(post.category);
  const fieldErrors = errorsByField(errors);

  const pageTitle = isEdit ? `Editar «${post.title}»` : 'Nueva publicación';
  useDocumentTitle(`${errors.length ? 'Error: ' : ''}${pageTitle} · Panel`);

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    const body = payloadFrom(new FormData(event.currentTarget));
    try {
      const { data: saved } = await api(isEdit ? `/admin/posts/${post.id}` : '/admin/posts', {
        method: isEdit ? 'PUT' : 'POST',
        body,
      });
      const verb = isEdit ? 'Se guardaron los cambios de' : 'Se creó';
      const where = saved.status === 'published' ? 'Está publicada en el sitio.' : 'Quedó como borrador.';
      navigate('/panel', { state: { flash: `${verb} «${saved.title}». ${where}` } });
    } catch (err) {
      setErrors(errorsFromApi(err));
      setSubmitting(false);
    }
  }

  return (
    <div className="form-page">
      <p className="back-nav">
        <Link to="/panel">Volver a publicaciones</Link>
      </p>
      <h1 tabIndex={-1}>{pageTitle}</h1>

      <ErrorSummary errors={errors} />

      {/* key: al pasar de una publicación a otra, el formulario se vuelve a montar con los valores nuevos. */}
      <form key={post.id ?? 'nueva'} onSubmit={handleSubmit} noValidate className="form">
        <TextField name="title" label="Título" defaultValue={post.title} error={fieldErrors.title} />

        <SelectField
          name="category"
          label="Categoría"
          hint="Si elegís Convocatorias, aparecen debajo los campos de fecha límite y bases."
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

        <TextArea
          name="body"
          label="Texto"
          rows={16}
          hint="Cada salto de línea se respeta, ideal para versos. Para separar párrafos o estrofas, dejá una línea en blanco. Formato opcional en Markdown: **negrita**, *cursiva*, ## Subtítulo, > cita."
          defaultValue={post.body}
          error={fieldErrors.body}
        />

        {category === 'convocatorias' && (
          <Fieldset legend="Datos de la convocatoria">
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
          </Fieldset>
        )}

        <Fieldset legend="Imagen" hint="Opcional. Si agregás una imagen, describila para quienes no pueden verla.">
          <TextField
            name="image.url"
            label="Dirección de la imagen"
            type="url"
            optional
            hint="Dirección completa, por ejemplo https://ejemplo.com/foto.jpg"
            defaultValue={post.image?.url ?? ''}
            error={fieldErrors['image.url']}
          />
          <TextArea
            name="image.alt"
            label="Texto alternativo"
            optional
            rows={2}
            maxLength={300}
            hint="Obligatorio si hay imagen. Contá qué se ve y por qué importa, en una o dos frases. No empieces con «imagen de»."
            defaultValue={post.image?.alt ?? ''}
            error={fieldErrors['image.alt']}
          />
        </Fieldset>

        <RadioGroup
          name="status"
          legend="Estado"
          options={STATUS_OPTIONS}
          defaultValue={post.status}
          error={fieldErrors.status}
        />

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

        <div className="button-group">
          <button type="submit" className="button">
            {submitting ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear publicación'}
          </button>
          <Link to="/panel">Cancelar</Link>
        </div>
      </form>
    </div>
  );
}
