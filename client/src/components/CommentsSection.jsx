import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { useAnnounce } from '../a11y/Announcer.jsx';
import ErrorSummary from './forms/ErrorSummary.jsx';
import Honeypot from './forms/Honeypot.jsx';
import { TextArea, TextField } from './forms/fields.jsx';
import { errorsByField, errorsFromApi } from './forms/errors.js';
import { COMMENTS_SECTION_ID } from './ArticleActions.jsx';
import { formatDate } from '../lib/format.js';

/** Los errores de la API vienen como "name"/"text": acá los campos llevan el prefijo "comment.". */
const prefixed = (errors) => errors.map((e) => (e.field ? { ...e, field: `comment.${e.field}` } : e));

/**
 * Comentarios aprobados y formulario para dejar uno.
 * Los comentarios se publican después de que el equipo los revisa: se avisa
 * antes de enviar y al confirmar.
 */
export default function CommentsSection({ post, comments }) {
  const announce = useAnnounce();
  const [errors, setErrors] = useState([]);
  // Cuenta los envíos exitosos: cada uno vuelve a llevar el foco al aviso.
  const [sent, setSent] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef(null);
  const sentRef = useRef(null);
  const fieldErrors = errorsByField(errors);
  const count = comments.length;

  // El aviso queda a la vista; el foco va ahí (cuando ya está en pantalla) para que se lea en contexto.
  useEffect(() => {
    if (sent) sentRef.current?.focus();
  }, [sent]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    try {
      await api(`/posts/${post.category}/${post.slug}/comments`, {
        method: 'POST',
        body: { name: form.get('comment.name'), text: form.get('comment.text'), website: form.get('website') },
      });
      setErrors([]);
      setSent((n) => n + 1);
      formRef.current?.reset();
      announce('Gracias. Tu comentario se publicará cuando el equipo lo revise.');
    } catch (err) {
      setErrors(prefixed(errorsFromApi(err)));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="comments" aria-labelledby={COMMENTS_SECTION_ID}>
      {/* tabIndex -1: destino del botón "Comentar". */}
      <h2 id={COMMENTS_SECTION_ID} tabIndex={-1}>
        Comentarios {count > 0 && <span className="comments__count">({count})</span>}
      </h2>

      {count === 0 ? (
        <p className="muted">Todavía no hay comentarios. Podés dejar el primero.</p>
      ) : (
        <ol className="comments__list">
          {comments.map((c) => (
            <li key={c.id} className="comment">
              <p className="comment__meta">
                <strong>{c.name}</strong> · <time dateTime={c.createdAt}>{formatDate(c.createdAt)}</time>
              </p>
              <p className="comment__text">{c.text}</p>
            </li>
          ))}
        </ol>
      )}

      <h3 className="comments__form-title">Dejá un comentario</h3>
      <p className="field__hint">Los comentarios se publican después de que el equipo los revisa.</p>

      {sent > 0 && (
        <p className="notice notice--success" tabIndex={-1} ref={sentRef}>
          Gracias. Tu comentario se publicará cuando el equipo lo revise.
        </p>
      )}
      <ErrorSummary errors={errors} />

      <form ref={formRef} className="form" onSubmit={handleSubmit} noValidate>
        <TextField name="comment.name" label="Tu nombre" autoComplete="name" maxLength={80} error={fieldErrors['comment.name']} />
        <TextArea name="comment.text" label="Comentario" rows={5} maxLength={2000} hint="Hasta 2000 caracteres." error={fieldErrors['comment.text']} />
        <Honeypot id="comentario-website" />
        <button type="submit" className="button">
          {submitting ? 'Enviando…' : 'Enviar comentario'}
        </button>
      </form>
    </section>
  );
}
