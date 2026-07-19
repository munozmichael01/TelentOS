// Primitivas reutilizables del job board — el diseño de cada pieza vive AQUÍ; las
// pantallas las componen (no se duplica markup). Identidad visual del board:
// hard-shadow lúdico, accent/lime, tokens propios.
import type { CSSProperties, ReactNode } from "react";

export const ARCHIVO = "'Archivo',sans-serif";
export const MONO = "'Space Mono',monospace";

// Tokens del board (CSS custom props) aplicados en el contenedor raíz de cada pantalla.
export const BOARD_TOKENS: CSSProperties = {
  "--brand": "#0E5C4A", "--accent": "#F1543F", "--lime": "#C6F24E", "--ink": "#1A1A17",
  "--soft": "#79746B", "--line": "#E7E1D4", "--surface": "#FCFAF6", "--bg": "#F4F0E8",
  "--brandSoft": "#DCEFE4", "--limeSoft": "#EAF7C4",
} as CSSProperties;

/** Contenedor raíz de una pantalla del board (tokens + fondo + centrado opcional). */
export function BoardRoot({ children, center, style }: { children: ReactNode; center?: boolean; style?: CSSProperties }) {
  return (
    <div style={{ ...BOARD_TOKENS, fontFamily: "'Hanken Grotesk',system-ui,sans-serif", color: "#1A1A17", background: "#F4F0E8", minHeight: "100vh", WebkitFontSmoothing: "antialiased", ...(center ? { display: "flex", justifyContent: "center", padding: "20px 16px" } : {}), ...style } as CSSProperties}>
      {children}
    </div>
  );
}

/** Contenedor centrado con ancho máximo (columna del board). */
export function BoardContainer({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ maxWidth: 720, margin: "0 auto", padding: "16px 16px 60px", ...style }}>{children}</div>;
}

type HardVariant = "accent" | "brand" | "surface" | "lime" | "disabled";
const HARD_BG: Record<HardVariant, string> = { accent: "var(--accent)", brand: "var(--brand)", surface: "var(--surface)", lime: "var(--lime)", disabled: "#C9C2B4" };
const HARD_FG: Record<HardVariant, string> = { accent: "#fff", brand: "#fff", surface: "var(--ink)", lime: "var(--ink)", disabled: "#fff" };

/** Botón hard-shadow del board (variantes de color). Renderiza <button> o <a>. */
export function HardButton({ children, variant = "accent", onClick, type = "button", disabled, full, style, href, target }: {
  children: ReactNode; variant?: HardVariant; onClick?: () => void; type?: "button" | "submit"; disabled?: boolean; full?: boolean; style?: CSSProperties; href?: string; target?: string;
}) {
  const v = disabled ? "disabled" : variant;
  const s: CSSProperties = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
    fontFamily: ARCHIVO, fontWeight: 800, fontSize: 15, color: HARD_FG[v], background: HARD_BG[v],
    border: "2px solid var(--ink)", borderRadius: 12, padding: full ? 14 : "12px 18px",
    boxShadow: "3px 3px 0 var(--ink)", cursor: disabled ? "not-allowed" : "pointer",
    width: full ? "100%" : undefined, textDecoration: "none", ...style,
  };
  if (href) return <a href={href} target={target} className="jb-hard" style={s}>{children}</a>;
  return <button type={type} onClick={onClick} disabled={disabled} className="jb-hard" style={s}>{children}</button>;
}

/** Chip pill (filtro / interpretación / sugerencia). */
export function Chip({ children, tone = "neutral", onClick, dashed }: { children: ReactNode; tone?: "neutral" | "brand" | "lime"; onClick?: () => void; dashed?: boolean }) {
  const map = {
    neutral: { c: "#54504A", bg: "var(--surface)", b: "var(--line)" },
    brand: { c: "#0E5C4A", bg: "var(--brandSoft)", b: "#BEE0CE" },
    lime: { c: "#46540F", bg: "var(--limeSoft)", b: "#D6E89A" },
  }[tone];
  return (
    <span onClick={onClick} className={onClick ? "jb-tap" : undefined} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: map.c, background: map.bg, border: `1px ${dashed ? "dashed" : "solid"} ${map.b}`, borderRadius: 999, padding: "5px 10px", cursor: onClick ? "pointer" : undefined }}>
      {children}
    </span>
  );
}

/** Tag "IA/del CV" (lima, mono, pequeño). */
export function AiTag({ children }: { children: ReactNode }) {
  return <span style={{ fontFamily: MONO, fontSize: 8.5, fontWeight: 700, textTransform: "uppercase", color: "#46540F", background: "var(--limeSoft)", borderRadius: 5, padding: "1px 6px", letterSpacing: ".3px" }}>{children}</span>;
}

/** Etiqueta mono en mayúsculas (labels de sección/campo). */
export function MonoLabel({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ fontFamily: MONO, fontSize: 10, textTransform: "uppercase", letterSpacing: .5, color: "var(--soft)", ...style }}>{children}</div>;
}

/** Tag de modalidad (color por remoto/híbrido/presencial). */
const MOD: Record<string, { c: string; bg: string; b: string }> = {
  remoto: { c: "#0E5C4A", bg: "#DCEFE4", b: "#BEE0CE" },
  hibrido: { c: "#5A4C86", bg: "#E7E0F2", b: "#D3C7EC" },
  presencial: { c: "#946312", bg: "#F8E7C4", b: "#EBD4A0" },
};
export function ModalityTag({ modality, label }: { modality: string; label: string }) {
  const m = MOD[modality] ?? { c: "#54504A", bg: "var(--bg)", b: "var(--line)" };
  return <span style={{ fontSize: 11, fontWeight: 700, color: m.c, background: m.bg, border: `1px solid ${m.b}`, borderRadius: 7, padding: "3px 8px" }}>{label}</span>;
}

/** Logotipo de empresa: usa logo_url si hay, si no iniciales con color determinista. */
const LOGO_PALETTE = [{ bg: "#DCEFE4", color: "#0E5C4A" }, { bg: "#F8E7C4", color: "#946312" }, { bg: "#E7E0F2", color: "#5A4C86" }, { bg: "#F6E0D9", color: "#C7402E" }, { bg: "#EAF7C4", color: "#46540F" }];
export function CompanyLogo({ name, logoUrl, size = 42 }: { name: string | null | undefined; logoUrl?: string | null; size?: number }) {
  const n = (name ?? "?").trim();
  const initials = n.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";
  let h = 0; for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0;
  const pal = LOGO_PALETTE[h % LOGO_PALETTE.length];
  const box: CSSProperties = { width: size, height: size, borderRadius: size * 0.28, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" };
  if (logoUrl) return <span style={box}><img src={logoUrl} alt={n} style={{ width: "100%", height: "100%", objectFit: "cover" }} /></span>;
  return <span style={{ ...box, background: pal.bg, color: pal.color, fontFamily: ARCHIVO, fontWeight: 900, fontSize: size * 0.36 }}>{initials}</span>;
}

/** Barra de progreso por segmentos (wizard). */
export function StepProgress({ total, current }: { total: number; current: number }) {
  return (
    <div style={{ display: "flex", gap: 5 }}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} style={{ flex: 1, height: 5, borderRadius: 999, background: i < current ? "var(--brand)" : "#E0DACC" }} />
      ))}
    </div>
  );
}

/** Campo de texto del board (input/textarea). */
export function BoardField({ label, tag, children }: { label?: ReactNode; tag?: ReactNode; children: ReactNode }) {
  return (
    <div>
      {label && <label style={{ fontFamily: MONO, fontSize: 10, textTransform: "uppercase", letterSpacing: .5, color: "var(--soft)", display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>{label}{tag}</label>}
      {children}
    </div>
  );
}

export const inputStyle: CSSProperties = { width: "100%", fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 15, color: "#1A1A17", background: "#FCFAF6", border: "1.5px solid #E7E1D4", borderRadius: 11, padding: "12px 13px", outline: "none", boxSizing: "border-box" };
