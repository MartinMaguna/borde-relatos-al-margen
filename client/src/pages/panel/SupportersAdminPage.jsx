import { useEffect, useRef, useState } from 'react';
import { useLoaderData, useRevalidator } from 'react-router';
import { api } from '../../api/client.js';
import { useAnnounce } from '../../a11y/Announcer.jsx';
import { useDocumentTitle } from '../../a11y/hooks.js';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import ErrorSummary from '../../components/forms/ErrorSummary.jsx';
import ImageField from '../../components/forms/ImageField.jsx';
import { SelectField, TextField } from '../../components/forms/fields.jsx';
import { errorsByField, errorsFromApi } from '../../components/forms/errors.js';
import { SUPPORTER_GROUPS } from '../../lib/site.js';

const ROLE_OPTIONS = SUPPORTER_GROUPS.map((g) => ({ value: g.role, label: g.label }));

/**
 * Logos del pie del sitio (Impulsan, Apoyan, Organizan, Colaboran).
 * Una sola vista: el listado y, debajo, el formulario para agregar o editar.
 * Foco: "Editar" lleva al título del formulario; al guardar o cancelar, vuelve
 * al título del listado (el formulario se vacía).
 */
export default function SupportersAdminPage() {
  const { supporters } = useLoaderData();
  const revalidator = useRevalidator();
  const announce = useAnnounce();
  const listHeadingRef = useRef(null);
  const formHeadingRef = useRef(null);
  const focusAfterClose = useRef(null);
  const [editing, setEditing] = useState(null);
  const [errors, setErrors] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [busy, setBusy] = useState(false);
  // Cambia en cada guardado: vuelve a montar el formulario vacío.
  const [formKey, setFormKey] = useState(0);
  // A dónde va el foco cuando el formulario se vuelve a dibujar ('form' | 'list').
  const pendingFocus = useRef(null);
  const fieldErrors = errorsByField(errors);
  useDocumentTitle(`${errors.length ? 'Error: ' : ''}Logos · Panel`);

  // El foco se mueve cuando el formulario ya se volvió a dibujar.
  useEffect(() => {
    const target = pendingFocus.current;
    pendingFocus.current = null;
    if (target === 'form') formHeadingRef.current?.focus();
    if (target === 'list') listHeadingRef.current?.focus();
  }, [formKey]);

  function startEdit(supporter) {
    setEditing(supporter);
    setErrors([]);
    setFormKey((k) => k + 1);
    pendingFocus.current = 'form';
  }

  function resetForm(message) {
    setEditing(null);
    setErrors([]);
    setFormKey((k) => k + 1);
    if (message) announce(message);
    pendingFocus.current = 'list';
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    const f = new FormData(event.currentTarget);
    const body = {
      name: String(f.get('name') ?? '').trim(),
      role: f.get('role'),
      logoUrl: String(f.get('logoUrl') ?? '').trim(),
      link: String(f.get('link') ?? '').trim(),
    };
    try {
      if (editing) {
        await api(`/admin/supporters/${editing.id}`, { method: 'PUT', body });
        resetForm(`Se guardaron los cambios de ${body.name}.`);
      } else {
        await api('/admin/supporters', { method: 'POST', body });
        resetForm(`Se agregó ${body.name}. Ya se ve al pie del sitio.`);
      }
      revalidator.revalidate();
    } catch (err) {
      setErrors(errorsFromApi(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (busy) return;
    setBusy(true);
    try {
      await api(`/admin/supporters/${toDelete.id}`, { method: 'DELETE' });
      focusAfterClose.current = listHeadingRef.current;
      announce(`Se quitó ${toDelete.name}.`);
      if (editing?.id === toDelete.id) resetForm();
      setToDelete(null);
      revalidator.revalidate();
    } catch (err) {
      setToDelete(null);
      announce(`No se pudo quitar el logo. ${err.message}`, { assertive: true });
    } finally {
      setBusy(false);
    }
  }

  const groups = SUPPORTER_GROUPS.map((g) => ({ ...g, items: supporters.filter((s) => s.role === g.role) }));

  return (
    <>
      <h1 tabIndex={-1}>Logos al pie del sitio</h1>
      <p className="lead">
        Quienes impulsan, apoyan, organizan y colaboran con Borde. Se muestran al pie de todas las páginas, agrupados.
      </p>

      <h2 tabIndex={-1} ref={listHeadingRef}>
        Cargados
      </h2>
      {supporters.length === 0 ? (
        <p className="muted">Todavía no hay logos. Mientras no haya ninguno, la sección no aparece en el sitio.</p>
      ) : (
        groups
          .filter((g) => g.items.length)
          .map((g) => (
            <section key={g.role} aria-labelledby={`grupo-${g.role}`} className="section">
              <h3 id={`grupo-${g.role}`}>{g.label}</h3>
              <ul className="admin-list">
                {g.items.map((s) => (
                  <li key={s.id} className="admin-item supporter-admin">
                    <img className="supporters__logo" src={s.logoUrl} alt="" />
                    <div>
                      <p className="admin-item__title">{s.name}</p>
                      {s.link && <p className="post-meta">{s.link}</p>}
                      <div className="button-group">
                        <button type="button" className="button button--secondary button--small" onClick={() => startEdit(s)}>
                          Editar <span className="visually-hidden">{s.name}</span>
                        </button>
                        <button type="button" className="button button--danger button--small" onClick={() => setToDelete(s)}>
                          Quitar <span className="visually-hidden">{s.name}</span>
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))
      )}

      <section className="form-page" aria-labelledby="logo-formulario">
        <h2 id="logo-formulario" tabIndex={-1} ref={formHeadingRef}>
          {editing ? `Editar ${editing.name}` : 'Agregar un logo'}
        </h2>
        <ErrorSummary errors={errors} />
        <form key={formKey} className="form" onSubmit={handleSubmit} noValidate>
          <TextField
            name="name"
            label="Nombre"
            maxLength={120}
            hint="De la institución, organización o persona. Es también la descripción del logo para quien no lo ve."
            defaultValue={editing?.name ?? ''}
            error={fieldErrors.name}
          />
          <SelectField
            name="role"
            label="¿Qué hace?"
            options={ROLE_OPTIONS}
            defaultValue={editing?.role ?? 'impulsan'}
            error={fieldErrors.role}
          />
          <ImageField
            urlName="logoUrl"
            altName={null}
            legend="Logo"
            hint="Subí el archivo (mejor PNG con fondo transparente) o pegá la dirección de una imagen. Se muestra sobre fondo blanco."
            initialUrl={editing?.logoUrl ?? ''}
            errors={fieldErrors}
          />
          <TextField
            name="link"
            label="Enlace a su sitio"
            type="url"
            optional
            hint="Dirección completa, por ejemplo https://ejemplo.org. Si la ponés, el logo es un enlace."
            defaultValue={editing?.link ?? ''}
            error={fieldErrors.link}
          />
          <div className="button-group">
            <button type="submit" className="button">
              {submitting ? 'Guardando…' : editing ? 'Guardar cambios' : 'Agregar logo'}
            </button>
            {editing && (
              <button type="button" className="button button--secondary" onClick={() => resetForm('Edición cancelada.')}>
                Cancelar
              </button>
            )}
          </div>
        </form>
      </section>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="¿Quitar este logo?"
        confirmLabel="Sí, quitar"
        busy={busy}
        returnFocusRef={focusAfterClose}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      >
        <p>
          Vas a quitar a <strong>{toDelete?.name}</strong> del pie del sitio.
        </p>
      </ConfirmDialog>
    </>
  );
}
