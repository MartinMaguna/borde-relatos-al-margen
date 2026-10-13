import { useId } from 'react';

/**
 * Composición geométrica del design system (Hero). Decorativa: oculta al
 * lector, sin texto, colores tomados de los tokens. useId: cada copia tiene
 * su propio degradado (puede haber varias en la misma página).
 */
export default function GeometricArt({ className }) {
  const gradientId = useId();
  return (
    // Disposición de la referencia del equipo: punto índigo arriba a la izquierda,
    // círculo con degradado arriba a la derecha, dos anillos concéntricos con un
    // anillo coral adentro abajo a la izquierda y un cuarto de disco coral en la esquina.
    <svg className={className} viewBox="0 0 340 290" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--indigo)' }} />
          <stop offset="0.38" style={{ stopColor: 'var(--violet)' }} />
          <stop offset="0.72" style={{ stopColor: 'var(--magenta)' }} />
          <stop offset="1" style={{ stopColor: 'var(--orange)' }} />
        </linearGradient>
      </defs>
      <circle cx="63" cy="68" r="16.5" style={{ fill: 'var(--indigo)' }} />
      <circle cx="239" cy="90" r="81" fill={`url(#${gradientId})`} />
      <circle cx="97" cy="199" r="78" fill="none" style={{ stroke: 'var(--line-soft)' }} strokeWidth="1.5" />
      <circle cx="97" cy="199" r="55" fill="none" style={{ stroke: 'var(--line-soft)' }} strokeWidth="1.5" />
      <circle cx="86" cy="214" r="19" fill="none" style={{ stroke: 'var(--coral)' }} strokeWidth="2.5" />
      <path d="M340 290 H240 A100 100 0 0 1 340 190 Z" style={{ fill: 'var(--coral)' }} />
    </svg>
  );
}
