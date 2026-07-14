"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { Company } from "@/lib/types";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import type {
  CareerSitePage, CareerSiteContent, CareerSiteBranding, CareerSiteMetrics,
  CSMetric, CSBrand, CSCultureValue, CSBenefit,
  CSTeamProfile, CSTestimonial, CSFAQ, CSSocialLink, CSGalleryItem,
} from "@/lib/career-site-types";
import { HEADING_FONTS, BODY_FONTS } from "@/lib/career-site-types";
import { CareerSitePreview } from "@/components/features/career-site-preview";
import { EmojiPicker } from "@/components/features/emoji-picker";
import { CareerAIPanel } from "@/components/features/career-ai-panel";
import { PageHeader } from "@/components/page-header";

/* ─── Design tokens ─────────────────────────────────────────────────────── */
const T = {
  bg: "#F4F0E8", surface: "#FCFAF6", ink: "#1A1A17", soft: "#79746B",
  line: "#E7E1D4", brand: "#0E5C4A", accent: "#F1543F",
  limeSoft: "#EAF7C4", successBg: "#DCEFE3", successText: "#1B6B4F",
  warnBg: "#F8E7C4", warnText: "#946312",
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "11.5px", fontWeight: 700,
  marginBottom: "5px", color: "#3A3833",
};
const FL: React.CSSProperties = {
  fontFamily: "'Space Mono',monospace", fontSize: "10px",
  textTransform: "uppercase" as const, letterSpacing: ".8px", color: T.soft,
};

/* ─── ImageUploadField ───────────────────────────────────────────────────── */

function ImageUploadField({
  label, value, onChange, accept = "image/*",
}: {
  label: string; value: string; onChange: (url: string) => void; accept?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadErr(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/career-site/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (json.url) onChange(json.url);
      else setUploadErr(json.error ?? "Error al subir");
    } catch {
      setUploadErr("Error de conexión");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div style={{ marginBottom: "12px" }}>
      <label style={labelStyle}>{label}</label>
      <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
        {value && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" style={{ width: "58px", height: "42px", objectFit: "cover", borderRadius: "8px", border: `1.5px solid ${T.line}`, flexShrink: 0, background: T.line }} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
            style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: "12px", fontWeight: 600, padding: "6px 11px", borderRadius: "8px", border: `1.5px solid ${T.line}`, background: T.surface, cursor: uploading ? "default" : "pointer", color: uploading ? T.soft : T.ink, marginBottom: "6px", display: "inline-flex", alignItems: "center", gap: "5px" }}>
            {uploading ? "Subiendo…" : "↑ Subir archivo"}
          </button>
          {uploadErr && <div style={{ fontSize: "11px", color: T.accent, marginBottom: "4px" }}>{uploadErr}</div>}
          <Input className="text-[12.5px]" placeholder="o pega una URL…" value={value} onChange={(e) => onChange(e.target.value)} />
          <input ref={fileRef} type="file" accept={accept} style={{ display: "none" }} onChange={handleFile} />
        </div>
      </div>
    </div>
  );
}

/* ─── EmojiButton ────────────────────────────────────────────────────────── */

function EmojiButton({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button type="button" onClick={() => setOpen((v) => !v)}
        style={{ fontSize: "20px", width: "44px", height: "44px", borderRadius: "9px", border: `1.5px solid ${T.line}`, background: T.bg, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>
        {value || "➕"}
      </button>
      {open && (
        <EmojiPicker onSelect={(e) => { onChange(e); setOpen(false); }} onClose={() => setOpen(false)} />
      )}
    </div>
  );
}

/* ─── ColorField ─────────────────────────────────────────────────────────── */

function ColorField({ label, value, defaultColor, onChange }: { label: string; value?: string; defaultColor: string; onChange: (v: string) => void }) {
  const active = value ?? defaultColor;
  return (
    <div style={{ marginBottom: "14px" }}>
      <label style={labelStyle}>{label}</label>
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <input type="color" value={active} onChange={(e) => onChange(e.target.value)}
          style={{ width: "42px", height: "38px", padding: "2px 3px", borderRadius: "8px", border: `1.5px solid ${T.line}`, cursor: "pointer", background: T.bg, flexShrink: 0 }} />
        <Input className="font-mono text-[12px] tracking-[.5px]"
          value={active} onChange={(e) => onChange(e.target.value)} placeholder={defaultColor} />
        {value && (
          <button type="button" onClick={() => onChange("")}
            style={{ fontSize: "11px", color: T.soft, background: "none", border: "none", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
            ↩ reset
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── SectionPanel ───────────────────────────────────────────────────────── */

// Mapa de generabilidad (§3.1): quién rellena cada bloque.
type Bucket = "green" | "yellow" | "red";
const BUCKET_DOT: Record<Bucket, string> = { green: "#6FBF3F", yellow: "#E0A23C", red: "#C77A6B" };
// Por qué está vacío un bloque (§3.2) — nunca mudo. Métricas es el caso especial (arista):
// es 🟢 pero la IA no inventa cifras, así que su vacío pide datos, no promete generación.
function emptyReason(id: string, bucket: Bucket): string {
  if (id === "metrics") return "Añade tus cifras reales aquí — la IA no las inventa.";
  if (bucket === "green") return "La IA lo rellenará al generar (o edítalo a mano).";
  if (bucket === "yellow") return "No lo encontramos en tu web — pégalo aquí.";
  return "Esto lo aportas tú: la IA no lo fabrica.";
}

function SectionPanel({ id, title, badge, bucket, isEmpty, open, onToggle, children }: {
  id: string; title: string; badge?: string; bucket: Bucket; isEmpty: boolean;
  open: boolean; onToggle: (id: string) => void; children: React.ReactNode;
}) {
  return (
    <div style={{ border: `1.5px solid ${T.line}`, borderRadius: "12px", overflow: "hidden", marginBottom: "8px" }}>
      <button type="button" onClick={() => onToggle(id)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 14px", background: open ? T.surface : T.bg, border: "none", cursor: "pointer", gap: "10px" }}>
        <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span title={`Bloque ${bucket === "green" ? "generable por IA" : bucket === "yellow" ? "extraíble de tu web" : "que aportas tú"}`} style={{ width: "8px", height: "8px", borderRadius: "999px", background: BUCKET_DOT[bucket], flexShrink: 0 }} />
          <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "13px", color: T.ink }}>{title}</span>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {badge && <span style={{ ...FL, background: T.limeSoft, borderRadius: "999px", padding: "2px 8px", fontSize: "9.5px" }}>{badge}</span>}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .18s", flexShrink: 0 }}>
            <path d="M6 9l6 6 6-6" stroke={T.soft} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </button>
      {open && (
        <div style={{ padding: "14px 16px 16px", background: T.surface, borderTop: `1px solid ${T.line}` }}>
          {isEmpty && (
            <div style={{ display: "flex", alignItems: "center", gap: "7px", background: bucket === "green" ? "#F1F7E8" : bucket === "yellow" ? T.warnBg : "#F6EEEC", border: `1px solid ${bucket === "green" ? "#D8E9B0" : bucket === "yellow" ? "#EAD9A6" : "#E5CFC9"}`, borderRadius: "9px", padding: "8px 11px", marginBottom: "12px", fontSize: "12px", color: bucket === "yellow" ? T.warnText : "#5A564E" }}>
              <span style={{ width: "7px", height: "7px", borderRadius: "999px", background: BUCKET_DOT[bucket], flexShrink: 0 }} />
              {emptyReason(id, bucket)}
            </div>
          )}
          {children}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ marginBottom: "12px" }}><label style={labelStyle}>{label}</label>{children}</div>;
}

function AddBtn({ onClick, label = "Añadir" }: { onClick: () => void; label?: string }) {
  return (
    <button type="button" onClick={onClick}
      style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 700, fontSize: "12px", color: T.brand, background: "transparent", border: `1.5px dashed ${T.line}`, borderRadius: "8px", padding: "6px 14px", cursor: "pointer", width: "100%", marginTop: "6px" }}>
      + {label}
    </button>
  );
}

function RemoveBtn({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", color: T.accent, background: "transparent", border: "none", cursor: "pointer", padding: "4px 6px", flexShrink: 0 }}>
      ✕
    </button>
  );
}

function ArrayItemCard({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <div style={{ border: `1px solid ${T.line}`, borderRadius: "10px", padding: "12px", marginBottom: "8px", background: T.bg, position: "relative" }}>
      <div style={{ position: "absolute", top: "8px", right: "8px" }}><RemoveBtn onClick={onRemove} /></div>
      <div style={{ paddingRight: "28px" }}>{children}</div>
    </div>
  );
}

/* ─── Metrics panel ──────────────────────────────────────────────────────── */

const MT = {
  bg: "#F4F0E8", surface: "#FCFAF6", surface2: "#F8F4EB",
  ink: "#1A1A17", soft: "#79746B", line: "#E7E1D4",
  brand: "#0E5C4A", brandSoft: "#DCEFE4", lime: "#C6F24E", limeSoft: "#EAF7C4",
};

function MIcon({ paths, extra }: { paths: Array<{ d: string; extra?: Record<string, string> }>; extra?: Record<string, string> }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
      {paths.map((p, i) => (
        <path key={i} d={p.d} stroke={MT.brand} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...(p.extra ?? {})} />
      ))}
    </svg>
  );
}

function MetricsPanel() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<CareerSiteMetrics | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/career-site/metrics?days=${days}`)
      .then((r) => r.json())
      .then((json) => { setData(json); setLoading(false); })
      .catch(() => setLoading(false));
  }, [days]);

  const fmt = (n: number) => n.toLocaleString("es-ES");
  const pv   = data?.pageViews    ?? 0;
  const jv   = data?.jobViews     ?? 0;
  const apps = data?.applications ?? 0;
  const conv = data?.conversionRate ?? 0;
  const j2p  = pv > 0 ? Math.round((jv / pv) * 1000) / 10 : 0;
  const topJobs = data?.topJobs ?? [];
  const maxViews = topJobs[0]?.views ?? 1;
  const rangeLabel = days === 7 ? "últimos 7 días" : days === 30 ? "últimos 30 días" : "últimos 90 días";
  const isEmpty = !loading && pv === 0 && apps === 0;

  const eyePaths    = [{ d: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" }, { d: "M12 14.6a2.6 2.6 0 100-5.2 2.6 2.6 0 000 5.2Z" }];
  const searchPaths = [{ d: "M11 19a8 8 0 100-16 8 8 0 000 16Z" }, { d: "M21 21l-4.3-4.3" }];
  const mailPaths   = [{ d: "M3 6.5h18v11H3z" }, { d: "M3.5 7l8.5 6 8.5-6" }];
  const boltPaths   = [{ d: "M13 2L4 14h7l-1 8 9-12h-7l1-8Z" }];
  const barPaths    = [{ d: "M4 20V10M9 20V4M14 20v-7M19 20v-11" }];

  const kpis = [
    { icon: eyePaths,    iconBg: MT.brandSoft, value: fmt(pv),    label: "Visitas a la página"      },
    { icon: searchPaths, iconBg: MT.brandSoft, value: fmt(jv),    label: "Visitas a ofertas"        },
    { icon: mailPaths,   iconBg: MT.brandSoft, value: fmt(apps),  label: "Candidaturas recibidas"   },
    { icon: boltPaths,   iconBg: MT.limeSoft,  value: `${conv}%`, label: "Ratio de conversión"      },
  ];

  const funnel = [
    { label: "Visitas a la página", value: fmt(pv),   width: "100%",                     color: MT.brand,    note: "100% · entrada al sitio" },
    { label: "Visitas a ofertas",   value: fmt(jv),   width: `${Math.max(j2p, 2)}%`,     color: "#2E7D63",   note: `${j2p}% de las visitas abren una oferta` },
    { label: "Candidaturas",        value: fmt(apps), width: `${Math.max(conv, 2)}%`,     color: MT.lime,     note: `${conv}% de las visitas a ofertas aplican` },
  ];

  const pillActive: React.CSSProperties = {
    fontFamily: "'Space Mono',monospace", fontSize: "11px", fontWeight: 700, letterSpacing: ".5px",
    padding: "6px 13px", borderRadius: "9px", border: "none", cursor: "pointer",
    background: MT.ink, color: "#fff",
  };
  const pillInactive: React.CSSProperties = {
    ...pillActive, background: "transparent", color: MT.soft,
  };

  if (isEmpty) {
    return (
      <div style={{ border: `1.5px dashed ${MT.line}`, borderRadius: "18px", background: MT.surface, padding: "56px 32px", textAlign: "center", maxWidth: "520px", margin: "8px auto 0" }}>
        <div style={{ width: "60px", height: "60px", borderRadius: "16px", background: MT.brandSoft, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
            <path d="M4 20V10M9 20V4M14 20v-7M19 20v-11" stroke={MT.brand} strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </div>
        <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: "19px", letterSpacing: "-.5px" }}>Aún no hay métricas</div>
        <p style={{ fontSize: "14px", lineHeight: 1.6, color: MT.soft, margin: "10px auto 0", maxWidth: "360px" }}>
          Las métricas aparecerán aquí en cuanto publiques el career site y empiece a recibir visitas.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header row: title + range selector */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "16px", flexWrap: "wrap", marginBottom: "20px" }}>
        <div>
          <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: "23px", letterSpacing: "-.7px" }}>Rendimiento del sitio</div>
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "11.5px", color: MT.soft, marginTop: "4px" }}>Actividad pública · {rangeLabel}</div>
        </div>
        <div style={{ display: "flex", gap: "6px", background: MT.surface, border: `1px solid ${MT.line}`, borderRadius: "12px", padding: "4px" }}>
          {([7, 30, 90] as const).map((d) => (
            <button key={d} style={days === d ? pillActive : pillInactive} onClick={() => setDays(d)}>
              {d === 7 ? "7 días" : d === 30 ? "30 días" : "90 días"}
            </button>
          ))}
        </div>
      </div>

      {/* KPI grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "12px", marginBottom: "16px" }}>
        {kpis.map((k, i) => (
          <div key={i} style={{ background: MT.surface, border: `1px solid ${MT.line}`, borderRadius: "15px", padding: "17px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
              <span style={{ width: "34px", height: "34px", borderRadius: "10px", background: k.iconBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <MIcon paths={k.icon} />
              </span>
            </div>
            <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: "30px", letterSpacing: "-1.2px", lineHeight: 1, color: MT.ink }}>
              {loading ? "—" : k.value}
            </div>
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: ".5px", color: MT.soft, marginTop: "8px", lineHeight: 1.4 }}>
              {k.label}
            </div>
          </div>
        ))}
      </div>

      {/* Funnel + Top Jobs */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", alignItems: "start" }}>
        {/* Funnel */}
        <div style={{ background: MT.surface, border: `1px solid ${MT.line}`, borderRadius: "16px", padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "18px" }}>
            <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "15px" }}>Embudo de conversión</span>
            <span style={{ marginLeft: "auto", fontFamily: "'Space Mono',monospace", fontSize: "10.5px", color: MT.brand, background: MT.brandSoft, borderRadius: "999px", padding: "3px 10px" }}>{conv}% global</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {funnel.map((f, i) => (
              <div key={i}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: MT.ink }}>{f.label}</span>
                  <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "15px" }}>{loading ? "—" : f.value}</span>
                </div>
                <div style={{ height: "12px", borderRadius: "99px", background: MT.bg, overflow: "hidden" }}>
                  <div style={{ width: loading ? "0%" : f.width, height: "100%", background: f.color, borderRadius: "99px", transition: "width .4s ease" }} />
                </div>
                <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", color: MT.soft, marginTop: "5px" }}>{f.note}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Jobs */}
        <div style={{ background: MT.surface, border: `1px solid ${MT.line}`, borderRadius: "16px", padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "15px" }}>Visitas por oferta</span>
            <span style={{ marginLeft: "auto", fontFamily: "'Space Mono',monospace", fontSize: "10.5px", color: MT.soft }}>Top {topJobs.length}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {topJobs.length === 0 ? (
              <div style={{ fontSize: "13px", color: MT.soft, padding: "12px 0" }}>Sin datos en este periodo.</div>
            ) : topJobs.map((j, i) => (
              <div key={j.id} style={{ padding: "11px 10px", margin: "0 -10px", borderRadius: "10px", transition: "background .12s ease" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#F8F4EB")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "7px" }}>
                  <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "11px", color: MT.soft, width: "16px" }}>{i + 1}</span>
                  <span style={{ flex: 1, fontSize: "13px", fontWeight: 600, color: MT.ink }}>{j.title}</span>
                  <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", fontWeight: 700, color: "#46540F", background: MT.limeSoft, border: "1px solid #D6E89A", borderRadius: "999px", padding: "2px 9px" }}>{j.views} views</span>
                </div>
                <div style={{ height: "7px", borderRadius: "99px", background: MT.bg, overflow: "hidden", marginLeft: "26px" }}>
                  <div style={{ width: `${Math.round((j.views / maxViews) * 100)}%`, height: "100%", background: MT.brand, borderRadius: "99px" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Info note */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", background: MT.surface2, border: `1px solid ${MT.line}`, borderRadius: "13px", padding: "13px 16px", marginTop: "16px" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: "1px" }}>
          <circle cx="12" cy="12" r="9" stroke={MT.brand} strokeWidth="2" />
          <path d="M12 8v5M12 16h.01" stroke={MT.brand} strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span style={{ fontSize: "12.5px", lineHeight: 1.5, color: "#54504A" }}>
          Cada candidatura registra su <b>origen (UTM)</b>. El ratio de conversión compara candidaturas contra visitas a ofertas, no contra visitas totales a la página.
        </span>
      </div>
    </div>
  );
}

/* ─── Main component ────────────────────────────────────────────────────── */

export function CareerSiteEditor({
  company, initialPage, activeJobsCount, configContent,
}: {
  company: Company | null;
  initialPage: CareerSitePage | null;
  activeJobsCount: number;
  configContent: React.ReactNode;
}) {
  const [content, setContent] = useState<CareerSiteContent>(initialPage?.draft_content ?? {});
  const [branding, setBranding] = useState<CareerSiteBranding>(initialPage?.branding ?? {});
  const [isPublished, setIsPublished] = useState(initialPage?.is_published ?? false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [translating, setTranslating] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openSection, setOpenSection] = useState<string>("hero");
  const [showTranslateMenu, setShowTranslateMenu] = useState(false);

  function toggleSection(id: string) { setOpenSection((p) => (p === id ? "" : id)); }

  const upd = useCallback(<K extends keyof CareerSiteContent>(key: K, value: CareerSiteContent[K]) => {
    setContent((p) => ({ ...p, [key]: value }));
  }, []);

  const updB = useCallback(<K extends keyof CareerSiteBranding>(key: K, value: CareerSiteBranding[K]) => {
    setBranding((p) => ({ ...p, [key]: value }));
  }, []);

  function updArr<T>(key: keyof CareerSiteContent, idx: number, field: keyof T, value: string) {
    setContent((p) => ({ ...p, [key]: ((p[key] as T[]) ?? []).map((item, i) => i === idx ? { ...item, [field]: value } : item) }));
  }
  function addItem<T>(key: keyof CareerSiteContent, item: T) {
    setContent((p) => ({ ...p, [key]: [...((p[key] as T[]) ?? []), item] }));
  }
  function removeItem(key: keyof CareerSiteContent, idx: number) {
    setContent((p) => ({ ...p, [key]: ((p[key] as unknown[]) ?? []).filter((_, i) => i !== idx) }));
  }

  // B-9 (rework): aplica el borrador del agente a draft_content. La generación con IA
  // devuelve TODO el site de una vez (bloques 🟢); aquí se mergean sus claves sobre el
  // borrador SIN pisar 🟡/🔴 (marcas, redes, galería, equipo, testimonios). Solo muta
  // el borrador; publicar es un paso aparte.
  function applyProposal(proposal: Record<string, unknown>) {
    setContent((p) => ({ ...p, ...proposal }));
  }

  async function saveContent() {
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/career-site", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ draft_content: content }) });
      if (!res.ok) throw new Error((await res.json()).error);
      setSavedAt(new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }));
    } catch (e) { setError(String(e instanceof Error ? e.message : e)); }
    finally { setSaving(false); }
  }

  async function saveBranding() {
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/career-site", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ branding }) });
      if (!res.ok) throw new Error((await res.json()).error);
      setSavedAt(new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }));
    } catch (e) { setError(String(e instanceof Error ? e.message : e)); }
    finally { setSaving(false); }
  }

  async function publish() {
    setPublishing(true); setError(null);
    try {
      await saveContent();
      const res = await fetch("/api/career-site/publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      if (!res.ok) throw new Error((await res.json()).error);
      setIsPublished(true);
      setSavedAt(new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }));
    } catch (e) { setError(String(e instanceof Error ? e.message : e)); }
    finally { setPublishing(false); }
  }

  async function unpublish() {
    setSaving(true);
    const res = await fetch("/api/career-site/publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ unpublish: true }) });
    if (res.ok) setIsPublished(false);
    setSaving(false);
  }

  async function translate(lang: "en" | "pt") {
    setShowTranslateMenu(false);
    await saveContent();
    setTranslating(lang);
    try {
      const res = await fetch("/api/career-site/translate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lang }) });
      if (!res.ok) throw new Error((await res.json()).error);
    } catch (e) { setError(String(e instanceof Error ? e.message : e)); }
    finally { setTranslating(null); }
  }

  /* ── Array shortcuts ── */
  const metrics      = content.aboutMetrics   ?? [];
  const gallery      = content.aboutGallery   ?? [];
  const brands       = content.brands         ?? [];
  const cultureVals  = content.cultureValues  ?? [];
  const benefits     = content.benefits       ?? [];
  const teamProfiles = content.teamProfiles   ?? [];
  const testimonials = content.testimonials   ?? [];
  const faqs         = content.faqs           ?? [];
  const socialLinks  = content.socialLinks    ?? [];

  /* ── Current Google Font URL for preview ── */
  const gFontsUrl = [
    branding.headingFont ? `family=${branding.headingFont}:wght@400;700;900` : "",
    branding.bodyFont    ? `family=${branding.bodyFont}:wght@400;600;700`    : "",
  ].filter(Boolean).join("&");

  return (
    <div>
      <PageHeader eyebrow="Reclutamiento" title="Career Site" description="Personaliza la página pública de empleo de tu empresa.">
        {company?.slug && (
          <a href={`/careers/${company.slug}`} target="_blank" rel="noreferrer"
            style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 700, fontSize: "13px", color: T.brand, textDecoration: "none", display: "flex", alignItems: "center", gap: "5px", padding: "8px 14px", border: `1.5px solid ${T.line}`, borderRadius: "10px", background: T.surface }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/><path d="M12 3a15 15 0 010 18M3 12h18" stroke="currentColor" strokeWidth="2"/></svg>
            Ver página pública ↗
          </a>
        )}
      </PageHeader>

      <Tabs defaultValue="config">
      <TabsList className="mb-5">
        <TabsTrigger value="config">Configuración</TabsTrigger>
        <TabsTrigger value="editor">Editor</TabsTrigger>
        <TabsTrigger value="seo">SEO</TabsTrigger>
        <TabsTrigger value="metrics">Métricas</TabsTrigger>
      </TabsList>

      {/* ──────────── CONFIGURACIÓN ──────────── */}
      <TabsContent value="config">
        <div style={{ maxWidth: "600px", display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Datos empresa */}
          <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: "16px", padding: "24px" }}>
            <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "15px", marginBottom: "18px" }}>Datos de empresa</div>
            {configContent}
          </div>

          {/* Branding */}
          <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: "16px", padding: "24px" }}>
            <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "15px", marginBottom: "4px" }}>Branding del career site</div>
            <p style={{ ...FL, marginBottom: "18px", fontSize: "10px" }}>Solo afecta a la página pública de empleo, no al dashboard.</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
              <ColorField label="Color primario" value={branding.primaryColor} defaultColor="#0E5C4A" onChange={(v) => updB("primaryColor", v || undefined)} />
              <ColorField label="Color de acento" value={branding.accentColor} defaultColor="#F1543F" onChange={(v) => updB("accentColor", v || undefined)} />
            </div>

            <Field label="Tipografía: titulares">
              <NativeSelect value={branding.headingFont ?? ""} onChange={(e) => updB("headingFont", e.target.value || undefined)}>
                {HEADING_FONTS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </NativeSelect>
            </Field>

            <Field label="Tipografía: texto">
              <NativeSelect value={branding.bodyFont ?? ""} onChange={(e) => updB("bodyFont", e.target.value || undefined)}>
                {BODY_FONTS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </NativeSelect>
            </Field>

            {/* Font preview */}
            {(branding.headingFont || branding.bodyFont) && gFontsUrl && (
              <>
                {/* eslint-disable-next-line @next/next/no-page-custom-font */}
                <link rel="stylesheet" href={`https://fonts.googleapis.com/css2?${gFontsUrl}&display=swap`} />
                <div style={{ padding: "14px 16px", background: T.bg, borderRadius: "10px", border: `1px solid ${T.line}`, marginBottom: "14px" }}>
                  {branding.headingFont && (
                    <div style={{ fontFamily: HEADING_FONTS.find((f) => f.value === branding.headingFont)?.css ?? undefined, fontWeight: 700, fontSize: "18px", marginBottom: "4px" }}>
                      El equipo que reimagina RRHH
                    </div>
                  )}
                  {branding.bodyFont && (
                    <div style={{ fontFamily: BODY_FONTS.find((f) => f.value === branding.bodyFont)?.css ?? undefined, fontSize: "13px", color: T.soft }}>
                      Buscamos personas con curiosidad intelectual y ganas de construir algo que importe.
                    </div>
                  )}
                </div>
              </>
            )}

            <Field label="Dominio personalizado">
              <Input placeholder="careers.miempresa.com"
                value={branding.customDomain ?? ""} onChange={(e) => updB("customDomain", e.target.value || undefined)} />
              {branding.customDomain && (
                <div style={{ fontSize: "11.5px", color: T.soft, marginTop: "6px", lineHeight: 1.5 }}>
                  Apunta un registro CNAME de <strong>{branding.customDomain}</strong> a <code style={{ background: T.bg, padding: "1px 5px", borderRadius: "4px", fontSize: "11px" }}>talentos.app</code> y contacta con soporte para activarlo.
                </div>
              )}
            </Field>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
              <button onClick={saveBranding} disabled={saving}
                style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "13px", color: "#fff", background: T.brand, border: `2px solid ${T.ink}`, borderRadius: "9px", padding: "8px 18px", cursor: "pointer", boxShadow: `3px 3px 0 ${T.ink}` }}>
                {saving ? "Guardando…" : "Guardar branding"}
              </button>
            </div>
          </div>

          {company?.slug && (
            <div style={{ padding: "14px 16px", background: T.successBg, border: `1px solid #A8D9B8`, borderRadius: "12px", fontSize: "13px", color: T.successText }}>
              Career site público:{" "}
              <a href={`/careers/${company.slug}`} target="_blank" rel="noreferrer" style={{ color: T.brand, fontWeight: 700 }}>
                /careers/{company.slug}
              </a>
            </div>
          )}
        </div>
      </TabsContent>

      {/* ──────────── EDITOR ──────────── */}
      <TabsContent value="editor">
        <div>
          {/* Toolbar */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px", flexWrap: "wrap", padding: "12px 16px", background: T.surface, border: `1px solid ${T.line}`, borderRadius: "13px" }}>
            <span style={{ ...FL, padding: "4px 10px", borderRadius: "999px", background: isPublished ? T.successBg : T.warnBg, color: isPublished ? T.successText : T.warnText }}>
              {isPublished ? "Publicado" : "Borrador"}
            </span>
            {savedAt && <span style={{ ...FL, color: T.soft }}>Guardado {savedAt}</span>}
            {error && <span style={{ fontSize: "12px", color: T.accent }}>{error}</span>}
            <div style={{ marginLeft: "auto", display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {/* Translate */}
              <div style={{ position: "relative" }}>
                <button onClick={() => setShowTranslateMenu((v) => !v)} disabled={!!translating}
                  style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 700, fontSize: "13px", color: T.soft, background: T.bg, border: `1.5px solid ${T.line}`, borderRadius: "9px", padding: "8px 13px", cursor: "pointer" }}>
                  {translating ? `Traduciendo ${translating}…` : "Traducir ↓"}
                </button>
                {showTranslateMenu && (
                  <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 50, background: T.surface, border: `1.5px solid ${T.ink}`, borderRadius: "10px", boxShadow: `3px 3px 0 ${T.ink}`, overflow: "hidden", minWidth: "150px" }}>
                    {(["en", "pt"] as const).map((l) => (
                      <button key={l} onClick={() => translate(l)}
                        style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", background: "none", border: "none", fontFamily: "'Hanken Grotesk',sans-serif", fontSize: "13px", color: T.ink, cursor: "pointer" }}>
                        {l === "en" ? "🇬🇧 Inglés" : "🇧🇷 Portugués (BR)"}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={saveContent} disabled={saving || publishing}
                style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 700, fontSize: "13px", color: T.ink, background: T.bg, border: `1.5px solid ${T.line}`, borderRadius: "9px", padding: "8px 13px", cursor: "pointer" }}>
                {saving ? "Guardando…" : "Guardar borrador"}
              </button>
              {isPublished ? (
                <button onClick={unpublish} disabled={saving || publishing}
                  style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "13px", color: T.accent, background: "#FDE8E5", border: `1.5px solid ${T.accent}`, borderRadius: "9px", padding: "8px 13px", cursor: "pointer" }}>
                  Despublicar
                </button>
              ) : (
                <button onClick={publish} disabled={saving || publishing}
                  style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "13px", color: "#fff", background: T.brand, border: `2px solid ${T.ink}`, borderRadius: "9px", padding: "8px 14px", cursor: "pointer", boxShadow: `3px 3px 0 ${T.ink}` }}>
                  {publishing ? "Publicando…" : "Publicar"}
                </button>
              )}
            </div>
          </div>

          {/* Two-column */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: "20px", alignItems: "start" }}>
            <div>

              <CareerAIPanel onApply={applyProposal} hasContent={!!content.aboutDescription} />

              <SectionPanel id="hero" title="Hero" bucket="green" isEmpty={!content.headline} open={openSection === "hero"} onToggle={toggleSection} badge={content.headline ? "1 campo" : undefined}>
                <Field label="Titular principal">
                  <Input placeholder="Únete al equipo que transforma el sector" value={content.headline ?? ""} onChange={(e) => upd("headline", e.target.value)} />
                </Field>
                <ImageUploadField label="Imagen hero (1920×600 px recomendado)" value={content.heroImageUrl ?? ""} onChange={(u) => upd("heroImageUrl", u)} />
              </SectionPanel>

              <SectionPanel id="about" title="Sobre nosotros" bucket="green" isEmpty={!content.aboutDescription} open={openSection === "about"} onToggle={toggleSection} badge={content.aboutDescription ? "con contenido" : undefined}>
                <Field label="Título"><Input placeholder="Quiénes somos" value={content.aboutTitle ?? ""} onChange={(e) => upd("aboutTitle", e.target.value)} /></Field>
                <Field label="Descripción"><Textarea rows={4} value={content.aboutDescription ?? ""} onChange={(e) => upd("aboutDescription", e.target.value)} /></Field>
              </SectionPanel>

              <SectionPanel id="metrics" title="Métricas" bucket="green" isEmpty={metrics.length === 0} open={openSection === "metrics"} onToggle={toggleSection} badge={metrics.length ? `${metrics.length}` : undefined}>
                {metrics.map((m, i) => (
                  <ArrayItemCard key={i} onRemove={() => removeItem("aboutMetrics", i)}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                      <Field label="Valor"><Input placeholder="200+" value={m.value} onChange={(e) => updArr<CSMetric>("aboutMetrics", i, "value", e.target.value)} /></Field>
                      <Field label="Etiqueta"><Input placeholder="empleados" value={m.label} onChange={(e) => updArr<CSMetric>("aboutMetrics", i, "label", e.target.value)} /></Field>
                    </div>
                  </ArrayItemCard>
                ))}
                <AddBtn onClick={() => addItem<CSMetric>("aboutMetrics", { label: "", value: "" })} label="Añadir métrica" />
              </SectionPanel>

              <SectionPanel id="gallery" title="Galería" bucket="red" isEmpty={gallery.length === 0} open={openSection === "gallery"} onToggle={toggleSection} badge={gallery.length ? `${gallery.length}` : undefined}>
                {gallery.map((g, i) => (
                  <ArrayItemCard key={i} onRemove={() => removeItem("aboutGallery", i)}>
                    <Field label="Tipo">
                      <NativeSelect className="w-auto" value={g.type} onChange={(e) => updArr<CSGalleryItem>("aboutGallery", i, "type", e.target.value)}>
                        <option value="image">Imagen</option>
                        <option value="video">Video (YouTube / Vimeo / URL directa)</option>
                      </NativeSelect>
                    </Field>
                    {g.type === "image" ? (
                      <ImageUploadField label="Imagen" value={g.url} onChange={(u) => updArr<CSGalleryItem>("aboutGallery", i, "url", u)} />
                    ) : (
                      <Field label="URL del video"><Input placeholder="https://youtube.com/watch?v=… o https://vimeo.com/…" value={g.url} onChange={(e) => updArr<CSGalleryItem>("aboutGallery", i, "url", e.target.value)} /></Field>
                    )}
                  </ArrayItemCard>
                ))}
                <AddBtn onClick={() => addItem<CSGalleryItem>("aboutGallery", { url: "", type: "image" })} label="Añadir elemento" />
              </SectionPanel>

              <SectionPanel id="brands" title="Marcas / Partners" bucket="yellow" isEmpty={brands.length === 0} open={openSection === "brands"} onToggle={toggleSection} badge={brands.length ? `${brands.length}` : undefined}>
                <Field label="Título"><Input placeholder="Empresas del grupo" value={content.brandsTitle ?? ""} onChange={(e) => upd("brandsTitle", e.target.value)} /></Field>
                {brands.map((b, i) => (
                  <ArrayItemCard key={i} onRemove={() => removeItem("brands", i)}>
                    <Field label="Nombre"><Input value={b.name} onChange={(e) => updArr<CSBrand>("brands", i, "name", e.target.value)} /></Field>
                    <ImageUploadField label="Logo" value={b.logoUrl ?? ""} onChange={(u) => updArr<CSBrand>("brands", i, "logoUrl", u)} />
                    <Field label="Website"><Input placeholder="https://…" value={b.website ?? ""} onChange={(e) => updArr<CSBrand>("brands", i, "website", e.target.value)} /></Field>
                  </ArrayItemCard>
                ))}
                <AddBtn onClick={() => addItem<CSBrand>("brands", { name: "", logoUrl: "", website: "" })} label="Añadir marca" />
              </SectionPanel>

              <SectionPanel id="culture" title="Cultura y valores" bucket="green" isEmpty={cultureVals.length === 0} open={openSection === "culture"} onToggle={toggleSection} badge={cultureVals.length ? `${cultureVals.length} valores` : undefined}>
                <Field label="Título"><Input placeholder="Nuestra cultura" value={content.cultureTitle ?? ""} onChange={(e) => upd("cultureTitle", e.target.value)} /></Field>
                <Field label="Descripción"><Textarea rows={3} value={content.cultureDescription ?? ""} onChange={(e) => upd("cultureDescription", e.target.value)} /></Field>
                {cultureVals.map((v, i) => (
                  <ArrayItemCard key={i} onRemove={() => removeItem("cultureValues", i)}>
                    <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "10px", alignItems: "end" }}>
                      <Field label="Emoji"><EmojiButton value={v.icon} onChange={(e) => updArr<CSCultureValue>("cultureValues", i, "icon", e)} /></Field>
                      <Field label="Nombre del valor"><Input placeholder="Innovación constante" value={v.name} onChange={(e) => updArr<CSCultureValue>("cultureValues", i, "name", e.target.value)} /></Field>
                    </div>
                  </ArrayItemCard>
                ))}
                <AddBtn onClick={() => addItem<CSCultureValue>("cultureValues", { icon: "", name: "" })} label="Añadir valor" />
              </SectionPanel>

              <SectionPanel id="lookingfor" title="Qué buscamos" bucket="green" isEmpty={!content.lookingForDescription} open={openSection === "lookingfor"} onToggle={toggleSection} badge={content.lookingForDescription ? "con contenido" : undefined}>
                <Field label="Título"><Input placeholder="El perfil que buscamos" value={content.lookingForTitle ?? ""} onChange={(e) => upd("lookingForTitle", e.target.value)} /></Field>
                <Field label="Descripción"><Textarea rows={4} value={content.lookingForDescription ?? ""} onChange={(e) => upd("lookingForDescription", e.target.value)} /></Field>
              </SectionPanel>

              <SectionPanel id="benefits" title="Beneficios" bucket="green" isEmpty={benefits.length === 0} open={openSection === "benefits"} onToggle={toggleSection} badge={benefits.length ? `${benefits.length}` : undefined}>
                <Field label="Título"><Input placeholder="Qué te ofrecemos" value={content.benefitsTitle ?? ""} onChange={(e) => upd("benefitsTitle", e.target.value)} /></Field>
                {benefits.map((b, i) => (
                  <ArrayItemCard key={i} onRemove={() => removeItem("benefits", i)}>
                    <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "10px", alignItems: "end" }}>
                      <Field label="Emoji"><EmojiButton value={b.icon} onChange={(e) => updArr<CSBenefit>("benefits", i, "icon", e)} /></Field>
                      <Field label="Beneficio"><Input placeholder="Seguro médico privado" value={b.name} onChange={(e) => updArr<CSBenefit>("benefits", i, "name", e.target.value)} /></Field>
                    </div>
                  </ArrayItemCard>
                ))}
                <AddBtn onClick={() => addItem<CSBenefit>("benefits", { icon: "", name: "" })} label="Añadir beneficio" />
              </SectionPanel>

              <SectionPanel id="team" title="Equipo" bucket="red" isEmpty={teamProfiles.length === 0} open={openSection === "team"} onToggle={toggleSection} badge={teamProfiles.length ? `${teamProfiles.length} personas` : undefined}>
                <Field label="Título"><Input placeholder="Conoce al equipo" value={content.teamTitle ?? ""} onChange={(e) => upd("teamTitle", e.target.value)} /></Field>
                <Field label="Descripción"><Textarea rows={2} value={content.teamDescription ?? ""} onChange={(e) => upd("teamDescription", e.target.value)} /></Field>
                {teamProfiles.map((p, i) => (
                  <ArrayItemCard key={i} onRemove={() => removeItem("teamProfiles", i)}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                      <Field label="Nombre"><Input value={p.name} onChange={(e) => updArr<CSTeamProfile>("teamProfiles", i, "name", e.target.value)} /></Field>
                      <Field label="Cargo"><Input value={p.position} onChange={(e) => updArr<CSTeamProfile>("teamProfiles", i, "position", e.target.value)} /></Field>
                    </div>
                    <ImageUploadField label="Foto" value={p.photoUrl ?? ""} onChange={(u) => updArr<CSTeamProfile>("teamProfiles", i, "photoUrl", u)} />
                    <Field label="LinkedIn (opcional)"><Input placeholder="https://linkedin.com/in/…" value={p.linkedinUrl ?? ""} onChange={(e) => updArr<CSTeamProfile>("teamProfiles", i, "linkedinUrl", e.target.value)} /></Field>
                  </ArrayItemCard>
                ))}
                <AddBtn onClick={() => addItem<CSTeamProfile>("teamProfiles", { name: "", position: "", photoUrl: "", linkedinUrl: "" })} label="Añadir persona" />
              </SectionPanel>

              <SectionPanel id="testimonials" title="Testimonios" bucket="red" isEmpty={testimonials.length === 0} open={openSection === "testimonials"} onToggle={toggleSection} badge={testimonials.length ? `${testimonials.length}` : undefined}>
                {testimonials.map((t, i) => (
                  <ArrayItemCard key={i} onRemove={() => removeItem("testimonials", i)}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                      <Field label="Nombre"><Input value={t.name} onChange={(e) => updArr<CSTestimonial>("testimonials", i, "name", e.target.value)} /></Field>
                      <Field label="Cargo"><Input value={t.position} onChange={(e) => updArr<CSTestimonial>("testimonials", i, "position", e.target.value)} /></Field>
                    </div>
                    <Field label="Texto"><Textarea rows={3} value={t.text} onChange={(e) => updArr<CSTestimonial>("testimonials", i, "text", e.target.value)} /></Field>
                    <ImageUploadField label="Foto (opcional)" value={t.photoUrl ?? ""} onChange={(u) => updArr<CSTestimonial>("testimonials", i, "photoUrl", u)} />
                  </ArrayItemCard>
                ))}
                <AddBtn onClick={() => addItem<CSTestimonial>("testimonials", { name: "", position: "", text: "", photoUrl: "" })} label="Añadir testimonio" />
              </SectionPanel>

              <SectionPanel id="faqs" title="Preguntas frecuentes" bucket="green" isEmpty={faqs.length === 0} open={openSection === "faqs"} onToggle={toggleSection} badge={faqs.length ? `${faqs.length}` : undefined}>
                <Field label="Título"><Input placeholder="Preguntas frecuentes" value={content.faqsTitle ?? ""} onChange={(e) => upd("faqsTitle", e.target.value)} /></Field>
                {faqs.map((f, i) => (
                  <ArrayItemCard key={i} onRemove={() => removeItem("faqs", i)}>
                    <Field label="Pregunta"><Input value={f.question} onChange={(e) => updArr<CSFAQ>("faqs", i, "question", e.target.value)} /></Field>
                    <Field label="Respuesta"><Textarea rows={2} value={f.answer} onChange={(e) => updArr<CSFAQ>("faqs", i, "answer", e.target.value)} /></Field>
                  </ArrayItemCard>
                ))}
                <AddBtn onClick={() => addItem<CSFAQ>("faqs", { question: "", answer: "" })} label="Añadir pregunta" />
              </SectionPanel>

              <SectionPanel id="social" title="Redes sociales" bucket="yellow" isEmpty={socialLinks.length === 0} open={openSection === "social"} onToggle={toggleSection} badge={socialLinks.length ? `${socialLinks.length}` : undefined}>
                {socialLinks.map((s, i) => (
                  <ArrayItemCard key={i} onRemove={() => removeItem("socialLinks", i)}>
                    <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: "8px" }}>
                      <Field label="Red">
                        <NativeSelect value={s.platform} onChange={(e) => updArr<CSSocialLink>("socialLinks", i, "platform", e.target.value)}>
                          <option value="linkedin">LinkedIn</option>
                          <option value="instagram">Instagram</option>
                          <option value="twitter">Twitter / X</option>
                          <option value="facebook">Facebook</option>
                          <option value="youtube">YouTube</option>
                          <option value="tiktok">TikTok</option>
                        </NativeSelect>
                      </Field>
                      <Field label="URL"><Input placeholder="https://…" value={s.url} onChange={(e) => updArr<CSSocialLink>("socialLinks", i, "url", e.target.value)} /></Field>
                    </div>
                  </ArrayItemCard>
                ))}
                <AddBtn onClick={() => addItem<CSSocialLink>("socialLinks", { platform: "linkedin", url: "" })} label="Añadir red social" />
              </SectionPanel>

            </div>

            {/* Preview */}
            <div style={{ position: "sticky", top: "20px" }}>
              <div style={{ ...FL, marginBottom: "8px" }}>Vista previa</div>
              <div style={{ border: `2px solid ${T.ink}`, borderRadius: "14px", boxShadow: `3px 3px 0 ${T.ink}`, overflow: "hidden", background: "#ECEAE4", maxHeight: "calc(100vh - 160px)", overflowY: "auto" }}>
                <CareerSitePreview content={content} company={company} activeJobsCount={activeJobsCount} />
              </div>
            </div>
          </div>
        </div>
      </TabsContent>

      {/* ──────────── SEO ──────────── */}
      <TabsContent value="seo">
        <div style={{ maxWidth: "600px" }}>
          <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: "16px", padding: "24px" }}>
            <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "15px", marginBottom: "4px" }}>SEO & Compartir en redes</div>
            <p style={{ ...FL, marginBottom: "20px", fontSize: "10px" }}>Estos valores solo se aplican cuando el career site está publicado.</p>

            <Field label="Título para Google (SEO Title)">
              <Input placeholder={`Trabaja en ${company?.name ?? "…"} | Tu empresa`}
                value={content.seoTitle ?? ""} onChange={(e) => upd("seoTitle", e.target.value)} />
              <div style={{ ...FL, fontSize: "10px", marginTop: "4px" }}>{(content.seoTitle ?? "").length} / 60 caracteres recomendados</div>
            </Field>

            <Field label="Descripción (meta description)">
              <Textarea className="resize-y min-h-[70px]" rows={3}
                placeholder="Únete al equipo que reimagina los recursos humanos. Trabajo remoto, formación y un equipo de primer nivel."
                value={content.seoDescription ?? ""} onChange={(e) => upd("seoDescription", e.target.value)} />
              <div style={{ ...FL, fontSize: "10px", marginTop: "4px" }}>{(content.seoDescription ?? "").length} / 155 caracteres recomendados</div>
            </Field>

            <ImageUploadField label="Imagen para compartir (OG Image — 1200×630 px)" value={content.seoOgImageUrl ?? ""} onChange={(u) => upd("seoOgImageUrl", u)} />

            {/* Google SERP preview */}
            <div style={{ marginTop: "8px", marginBottom: "20px" }}>
              <div style={{ ...FL, marginBottom: "8px", fontSize: "10px" }}>Preview en Google</div>
              <div style={{ padding: "14px 16px", background: "#fff", borderRadius: "10px", border: `1px solid ${T.line}` }}>
                <div style={{ fontSize: "12px", color: T.soft, marginBottom: "2px" }}>
                  talentos.app/careers/{company?.slug ?? "empresa"}
                </div>
                <div style={{ fontSize: "17px", color: "#1a0dab", fontWeight: 500, marginBottom: "3px", lineHeight: 1.3 }}>
                  {content.seoTitle || `Trabaja en ${company?.name ?? "Tu empresa"}`}
                </div>
                <div style={{ fontSize: "13px", color: "#4d5156", lineHeight: 1.5 }}>
                  {(content.seoDescription || `Únete al equipo de ${company?.name ?? "la empresa"}.`).slice(0, 155)}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={saveContent} disabled={saving}
                style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "13px", color: "#fff", background: T.brand, border: `2px solid ${T.ink}`, borderRadius: "9px", padding: "8px 18px", cursor: "pointer", boxShadow: `3px 3px 0 ${T.ink}` }}>
                {saving ? "Guardando…" : "Guardar SEO"}
              </button>
            </div>
          </div>
        </div>
      </TabsContent>

      {/* ──────────── MÉTRICAS ──────────── */}
      <TabsContent value="metrics"><MetricsPanel /></TabsContent>
      </Tabs>
    </div>
  );
}
