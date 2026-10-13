import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { SUPPORTER_GROUPS } from '../lib/site.js';

/**
 * Logos de quienes impulsan, apoyan, organizan y colaboran, al pie de todas
 * las páginas. Se cargan una sola vez (el layout no se vuelve a montar al navegar).
 *
 * - Si no hay logos, o la API no responde, no se muestra nada: el sitio no depende de esto.
 * - El texto alternativo de cada logo es el nombre de la institución. Con enlace,
 *   ese nombre es también el nombre del enlace (una imagen sola dentro de un <a>).
 * - Los logos se muestran tal como se cargan, sobre una franja oscura fija
 *   (como los créditos de un afiche): conviene cargar versiones claras.
 */
export default function SupportersSection() {
  const [supporters, setSupporters] = useState([]);

  useEffect(() => {
    const controller = new AbortController();
    api('/supporters', { signal: controller.signal })
      .then(({ data }) => setSupporters(Array.isArray(data) ? data : []))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const groups = SUPPORTER_GROUPS.map((g) => ({ ...g, items: supporters.filter((s) => s.role === g.role) })).filter(
    (g) => g.items.length,
  );
  if (!groups.length) return null;

  return (
    <section className="supporters" aria-labelledby="acompanan">
      <div className="container">
        {/* Título solo para lectores de pantalla: nombra la región sin mostrarse. */}
        <h2 id="acompanan" className="visually-hidden">
          Acompañan a Borde
        </h2>
        <div className="supporters__groups">
          {groups.map((group) => (
            <div key={group.role} className={`supporters__group supporters__group--${group.role}`}>
              <h3 id={`acompanan-${group.role}`} className="supporters__label">
                {group.label}
              </h3>
              <ul className="supporters__list" aria-labelledby={`acompanan-${group.role}`}>
                {group.items.map((s) => {
                  const logo = <img className="supporters__logo" src={s.logoUrl} alt={s.name} loading="lazy" decoding="async" />;
                  return (
                    <li key={s.id} className="supporters__item">
                      {s.link ? <a href={s.link}>{logo}</a> : logo}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
