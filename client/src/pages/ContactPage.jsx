import { useAnnounce } from '../a11y/Announcer.jsx';
import { useDocumentTitle } from '../a11y/hooks.js';
import { CopyIcon, MailIcon } from '../components/icons.jsx';
import { CONTACT_EMAIL } from '../lib/site.js';

/** Contacto: el correo visible (se puede leer y copiar), con enlace para escribir. */
export default function ContactPage() {
  const announce = useAnnounce();
  useDocumentTitle('Contacto');

  async function copy() {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      announce('Correo copiado.');
    } catch {
      announce(`No se pudo copiar automáticamente. El correo es ${CONTACT_EMAIL}`, { assertive: true });
    }
  }

  return (
    <div className="article">
      <h1 tabIndex={-1}>Contacto</h1>
      <p className="lead">
        ¿Querés proponer un texto, sumarte a un taller o contarnos algo? Escribinos y te respondemos a la brevedad.
      </p>

      <section className="contact-card" aria-labelledby="contacto-correo">
        <h2 id="contacto-correo">Correo electrónico</h2>
        <p className="contact-card__email">{CONTACT_EMAIL}</p>
        <div className="button-group">
          <a className="button" href={`mailto:${CONTACT_EMAIL}`}>
            <MailIcon /> Escribir un correo
          </a>
          <button type="button" className="button button--secondary" onClick={copy}>
            <CopyIcon /> Copiar el correo
          </button>
        </div>
      </section>

      <p>
        Para postularte a una convocatoria, usá el formulario de esa convocatoria (si lo tiene) o seguí lo que indican
        sus bases.
      </p>
    </div>
  );
}
