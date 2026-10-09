import { Link } from 'react-router';

/** Números a mostrar: todos si son pocos; si no, primera, última y vecinas de la actual con "…". */
function pageItems(page, totalPages) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages = new Set([1, totalPages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= totalPages));
  const sorted = [...pages].sort((a, b) => a - b);
  return sorted.flatMap((p, i) => (i > 0 && p - sorted[i - 1] > 1 ? ['…', p] : [p]));
}

/**
 * Paginación con enlaces reales (cada página tiene su URL: ?pagina=2).
 * - <nav aria-label="Paginación"> la hace localizable como punto de referencia.
 * - Cada número se anuncia "Página 2"; la actual lleva aria-current="page".
 * - "Anterior"/"Siguiente" no se muestran cuando no aplican (en vez de quedar deshabilitados).
 */
export default function Pagination({ page, totalPages, basePath, hrefFor }) {
  if (totalPages <= 1) return null;
  // hrefFor permite conservar otros parámetros de la URL (p. ej. filtros del panel).
  const href = hrefFor ?? ((p) => (p === 1 ? basePath : `${basePath}?pagina=${p}`));

  return (
    <nav className="pagination" aria-label="Paginación">
      <ul className="pagination__list">
        {page > 1 && (
          <li>
            <Link to={href(page - 1)}>
              Anterior<span className="visually-hidden">: página {page - 1}</span>
            </Link>
          </li>
        )}
        {pageItems(page, totalPages).map((item, i) =>
          item === '…' ? (
            <li key={`gap-${i}`}>
              <span aria-hidden="true">…</span>
            </li>
          ) : (
            <li key={item}>
              <Link to={href(item)} aria-current={item === page ? 'page' : undefined}>
                {/* El espacio va fuera del span oculto: algunos navegadores lo descartan y leerían "Página2". */}
                <span className="visually-hidden">Página</span> {item}
              </Link>
            </li>
          ),
        )}
        {page < totalPages && (
          <li>
            <Link to={href(page + 1)}>
              Siguiente<span className="visually-hidden">: página {page + 1}</span>
            </Link>
          </li>
        )}
      </ul>
    </nav>
  );
}
