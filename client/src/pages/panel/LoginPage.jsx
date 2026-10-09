import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { api } from '../../api/client.js';
import { useDocumentTitle } from '../../a11y/hooks.js';
import { useFlash } from '../../a11y/useFlash.js';
import ErrorSummary from '../../components/forms/ErrorSummary.jsx';
import { TextField } from '../../components/forms/fields.jsx';
import { errorsByField, errorsFromApi } from '../../components/forms/errors.js';

/** Solo se aceptan destinos internos del panel (evita redirecciones abiertas). */
function safeReturnPath(value) {
  return value && value.startsWith('/panel') && !value.startsWith('//') ? value : '/panel';
}

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [flash] = useFlash();
  const [errors, setErrors] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const fieldErrors = errorsByField(errors);

  // Con errores, el título empieza con "Error:": es lo primero que anuncia el lector.
  useDocumentTitle(`${errors.length ? 'Error: ' : ''}Ingresar al panel`);

  async function handleSubmit(event) {
    event.preventDefault();
    // Sin deshabilitar el botón (perdería el foco): evitamos el doble envío así.
    if (submitting) return;
    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    try {
      await api('/auth/login', {
        method: 'POST',
        body: { email: form.get('email'), password: form.get('password') },
      });
      navigate(safeReturnPath(searchParams.get('volver')), { replace: true });
    } catch (err) {
      const list = errorsFromApi(err);
      // Las credenciales incorrectas no son de un campo: enlazamos al email para corregir.
      setErrors(list.map((e) => (e.field ? e : { ...e, field: 'email' })));
      setSubmitting(false);
    }
  }

  return (
    <div className="form-page">
      <h1 tabIndex={-1}>Ingresar al panel</h1>
      <p className="lead">Este espacio es solo para el equipo editorial de Borde.</p>

      {flash && !errors.length && <p className="notice notice--success">{flash}</p>}

      <ErrorSummary errors={errors} />

      <form onSubmit={handleSubmit} noValidate className="form">
        <TextField
          name="email"
          label="Correo electrónico"
          type="email"
          autoComplete="username"
          spellCheck={false}
          error={fieldErrors.email}
        />
        <TextField
          name="password"
          label="Contraseña"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          error={fieldErrors.password}
        />
        <div className="checkbox">
          <input
            id="mostrar-contrasena"
            type="checkbox"
            checked={showPassword}
            onChange={(e) => setShowPassword(e.target.checked)}
          />
          <label htmlFor="mostrar-contrasena">Mostrar la contraseña</label>
        </div>

        <button type="submit" className="button">
          {submitting ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </div>
  );
}
