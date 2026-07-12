// Iconos de los packs de payroll. Banderas SVG propias (simplificadas, no emoji)
// para los países, y un icono de línea en el lenguaje del DS (viewBox 0 0 24 24,
// stroke currentColor 2px, linecap round) para el pack Genérico.
// Regla del DS: cero emojis genéricos en el chrome de producto — ver CLAUDE.md.

const FLAG_W = 21;
const FLAG_H = 15;

function FlagFrame({ code, children }: { code: string; children: React.ReactNode }) {
  const clip = `pack-flag-${code}`;
  return (
    <svg width={FLAG_W} height={FLAG_H} viewBox="0 0 21 15" fill="none" style={{ flexShrink: 0, borderRadius: 3 }} aria-hidden>
      <defs>
        <clipPath id={clip}>
          <rect x="0.5" y="0.5" width="20" height="14" rx="2.5" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>{children}</g>
      <rect x="0.5" y="0.5" width="20" height="14" rx="2.5" stroke="rgba(26,26,23,0.14)" strokeWidth="1" fill="none" />
    </svg>
  );
}

function FlagVE() {
  // 3 bandas horizontales: amarillo · azul · rojo
  return (
    <FlagFrame code="ve">
      <rect x="0" y="0" width="21" height="5" fill="#FFCC00" />
      <rect x="0" y="5" width="21" height="5" fill="#00247D" />
      <rect x="0" y="10" width="21" height="5" fill="#CF142B" />
    </FlagFrame>
  );
}

function FlagBR() {
  // Verde · rombo amarillo · círculo azul
  return (
    <FlagFrame code="br">
      <rect x="0" y="0" width="21" height="15" fill="#009C3B" />
      <polygon points="10.5,2 19,7.5 10.5,13 2,7.5" fill="#FFDF00" />
      <circle cx="10.5" cy="7.5" r="2.7" fill="#002776" />
    </FlagFrame>
  );
}

function FlagES() {
  // Rojo · amarillo (banda ancha) · rojo — proporción 1:2:1
  return (
    <FlagFrame code="es">
      <rect x="0" y="0" width="21" height="15" fill="#AA151B" />
      <rect x="0" y="3.75" width="21" height="7.5" fill="#F1BF00" />
    </FlagFrame>
  );
}

function FlagCO() {
  // Amarillo (mitad) · azul · rojo
  return (
    <FlagFrame code="co">
      <rect x="0" y="0" width="21" height="7.5" fill="#FCD116" />
      <rect x="0" y="7.5" width="21" height="3.75" fill="#003893" />
      <rect x="0" y="11.25" width="21" height="3.75" fill="#CE1126" />
    </FlagFrame>
  );
}

function FlagMX() {
  // Verde · blanco · rojo (bandas verticales)
  return (
    <FlagFrame code="mx">
      <rect x="0" y="0" width="7" height="15" fill="#006847" />
      <rect x="7" y="0" width="7" height="15" fill="#FFFFFF" />
      <rect x="14" y="0" width="7" height="15" fill="#CE1126" />
    </FlagFrame>
  );
}

function IconGeneric() {
  // Globo de línea en el lenguaje del DS (como los iconos del nav / cards de métricas).
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, color: "#0E5C4A" }} aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M3 12h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 3c2.6 2.7 3.9 5.9 3.9 9s-1.3 6.3-3.9 9c-2.6-2.7-3.9-5.9-3.9-9s1.3-6.3 3.9-9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const PACK_ICONS: Record<string, () => React.ReactNode> = {
  generic: IconGeneric,
  ve: FlagVE,
  br: FlagBR,
  es: FlagES,
  co: FlagCO,
  mx: FlagMX,
};

export function PackIcon({ code }: { code: string }) {
  const Icon = PACK_ICONS[code];
  return Icon ? <Icon /> : null;
}
