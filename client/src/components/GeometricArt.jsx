import { useId } from 'react';

/**
 * Composición geométrica del design system (Hero). Decorativa: oculta al
 * lector, sin texto, colores tomados de los tokens. useId: cada copia tiene
 * su propio degradado (puede haber varias en la misma página).
 */
export default function GeometricArt({ className }) {
  const gradientId = useId();
  return (
    <svg className={className} viewBox="0 0 320 300" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--indigo)' }} />
          <stop offset="0.4" style={{ stopColor: 'var(--violet)' }} />
          <stop offset="0.7" style={{ stopColor: 'var(--magenta)' }} />
          <stop offset="1" style={{ stopColor: 'var(--orange)' }} />
        </linearGradient>
      </defs>
      <circle cx="100" cy="190" r="70" fill="none" style={{ stroke: 'var(--line-soft)' }} strokeWidth="1" />
      <circle cx="100" cy="190" r="100" fill="none" style={{ stroke: 'var(--line-soft)' }} strokeWidth="1" />
      <circle cx="210" cy="110" r="90" fill={`url(#${gradientId})`} />
      <path d="M150 300 a90 90 0 0 1 180 0 z" style={{ fill: 'var(--coral)' }} />
      <circle cx="70" cy="70" r="18" style={{ fill: 'var(--indigo)' }} />
      <circle cx="120" cy="240" r="22" fill="none" style={{ stroke: 'var(--coral)' }} strokeWidth="2" />
    </svg>
  );
}
