import { Link } from 'react-router';

/**
 * Ruta de navegación: Inicio / Poesía / Título.
 * El último elemento es la página actual (aria-current) y no es enlace.
 * Los separadores "/" se agregan por CSS, así el lector no los lee.
 */
export default function Breadcrumbs({ items }) {
  return (
    <nav className="breadcrumbs" aria-label="Ruta de navegación">
      <ol>
        {items.map((item, i) =>
          i === items.length - 1 ? (
            <li key={item.label} aria-current="page">
              {item.label}
            </li>
          ) : (
            <li key={item.to}>
              <Link to={item.to}>{item.label}</Link>
            </li>
          ),
        )}
      </ol>
    </nav>
  );
}
