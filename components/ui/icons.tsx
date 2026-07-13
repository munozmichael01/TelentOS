/**
 * Iconos canónicos de superficie de IA (design-system.md §1.8, Anexo B).
 * El sparkle de 4 puntas es el ÚNICO icono de IA del producto (D1: retirada la varita).
 * Lenguaje: viewBox 24, stroke currentColor 2px, linejoin/linecap round.
 */

export function IconSparkle({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconSpinner({ className = "size-4 animate-spin" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="28 14"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconClose({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
