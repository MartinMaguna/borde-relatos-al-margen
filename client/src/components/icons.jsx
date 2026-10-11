/**
 * Íconos decorativos: siempre acompañan un texto visible, así que se ocultan
 * a los lectores de pantalla (aria-hidden) y no reciben foco.
 */
const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
  className: 'icon',
};

export function PlayIcon() {
  return (
    <svg {...base}>
      <path d="M7 4.5v15l12-7.5z" fill="currentColor" />
    </svg>
  );
}

export function PauseIcon() {
  return (
    <svg {...base}>
      <path d="M8 5v14M16 5v14" strokeWidth={3} />
    </svg>
  );
}

/** Mano que seña, con líneas de movimiento: símbolo habitual de lengua de señas. */
export function SignLanguageIcon() {
  return (
    <svg {...base}>
      <path d="M8 13V6.5a1.5 1.5 0 0 1 3 0V12" />
      <path d="M11 11.5V5a1.5 1.5 0 0 1 3 0v6.5" />
      <path d="M14 11.5V6.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-.6a6 6 0 0 1-4.7-2.3l-2.8-3.6a1.6 1.6 0 0 1 2.5-2l1.6 1.9" />
      <path d="M19.5 3.5a5 5 0 0 1 1.8 3.4" />
      <path d="M4.5 3.6A5 5 0 0 0 2.8 7" />
    </svg>
  );
}
