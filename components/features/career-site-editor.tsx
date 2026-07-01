"use client";

import { useState, useCallback, useRef } from "react";
import type { Company } from "@/lib/types";
import type {
  CareerSitePage, CareerSiteContent,
  CSMetric, CSBrand, CSCultureValue, CSBenefit,
  CSTeamProfile, CSTestimonial, CSFAQ, CSSocialLink, CSGalleryItem,
} from "@/lib/career-site-types";
import { CareerSitePreview } from "@/components/features/career-site-preview";
import { EmojiPicker } from "@/components/features/emoji-picker";

/* ─── Design tokens ─────────────────────────────────────────────────────── */
const T = {
  bg: "#F4F0E8", surface: "#FCFAF6", ink: "#1A1A17", soft: "#79746B",
  line: "#E7E1D4", brand: "#0E5C4A", accent: "#F1543F",
  limeSoft: "#EAF7C4", successBg: "#DCEFE3", successText: "#1B6B4F",
  warnBg: "#F8E7C4", warnText: "#946312",
};

const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", fontFamily: "'Hanken Grotesk',sans-serif",
  fontSize: "13.5px", padding: "9px 11px", border: `1.5px solid ${T.line}`,
  borderRadius: "9px", background: T.bg, color: T.ink, outline: "none",
};
const textareaStyle: React.CSSProperties = { ...inputStyle, resize: "vertical" as const, minHeight: "88px" };
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
          <img
            src={value} alt=""
            style={{ width: "58px", height: "42px", objectFit: "cover", borderRadius: "8px", border: `1.5px solid ${T.line}`, flexShrink: 0, background: T.line }}
          />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            style={{
              fontFamily: "'Hanken Grotesk',sans-serif", fontSize: "12px", fontWeight: 600,
              padding: "6px 11px", borderRadius: "8px", border: `1.5px solid ${T.line}`,
              background: T.surface, cursor: uploading ? "default" : "pointer",
              color: uploading ? T.soft : T.ink, marginBottom: "6px",
              display: "inline-flex", alignItems: "center", gap: "5px",
            }}
          >
            {uploading ? "Subiendo…" : "↑ Subir archivo"}
          </button>
          {uploadErr && <div style={{ fontSize: "11px", color: T.accent, marginBottom: "4px" }}>{uploadErr}</div>}
          <input
            style={{ ...inputStyle, fontSize: "12.5px" }}
            placeholder="o pega una URL…"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
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
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          fontSize: "20px", width: "44px", height: "44px", borderRadius: "9px",
          border: `1.5px solid ${T.line}`, background: T.bg, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          lineHeight: 1,
        }}
      >
        {value || "➕"}
      </button>
      {open && (
        <EmojiPicker
          onSelect={(e) => { onChange(e); setOpen(false); }}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

/* ─── Sub-components ────────────────────────────────────────────────────── */

function SectionPanel({
  id, title, badge, open, onToggle, children,
}: {
  id: string; title: string; badge?: string;
  open: boolean; onToggle: (id: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div style={{ border: `1.5px solid ${T.line}`, borderRadius: "12px", overflow: "hidden", marginBottom: "8px" }}>
      <button
        type="button"
        onClick={() => onToggle(id)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "11px 14px", background: open ? T.surface : T.bg,
          border: "none", cursor: "pointer", gap: "10px",
        }}
      >
        <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "13px", color: T.ink }}>
          {title}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {badge && (
            <span style={{ ...FL, background: T.limeSoft, borderRadius: "999px", padding: "2px 8px", fontSize: "9.5px" }}>
              {badge}
            </span>
          )}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .18s", flexShrink: 0 }}>
            <path d="M6 9l6 6 6-6" stroke={T.soft} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </button>
      {open && (
        <div style={{ padding: "14px 16px 16px", background: T.surface, borderTop: `1px solid ${T.line}` }}>
          {children}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "12px" }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function AddBtn({ onClick, label = "Añadir" }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button" onClick={onClick}
      style={{
        fontFamily: "'Archivo',sans-serif", fontWeight: 700, fontSize: "12px",
        color: T.brand, background: "transparent", border: `1.5px dashed ${T.line}`,
        borderRadius: "8px", padding: "6px 14px", cursor: "pointer", width: "100%", marginTop: "6px",
      }}
    >
      + {label}
    </button>
  );
}

function RemoveBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button" onClick={onClick}
      style={{
        fontFamily: "'Space Mono',monospace", fontSize: "10px", color: T.accent,
        background: "transparent", border: "none", cursor: "pointer", padding: "4px 6px",
        flexShrink: 0,
      }}
    >
      ✕
    </button>
  );
}

function ArrayItemCard({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <div style={{
      border: `1px solid ${T.line}`, borderRadius: "10px", padding: "12px",
      marginBottom: "8px", background: T.bg, position: "relative",
    }}>
      <div style={{ position: "absolute", top: "8px", right: "8px" }}>
        <RemoveBtn onClick={onRemove} />
      </div>
      <div style={{ paddingRight: "28px" }}>{children}</div>
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
  const [activeTab, setActiveTab] = useState<"config" | "editor">("config");
  const [content, setContent] = useState<CareerSiteContent>(initialPage?.draft_content ?? {});
  const [isPublished, setIsPublished] = useState(initialPage?.is_published ?? false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [translating, setTranslating] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openSection, setOpenSection] = useState<string>("hero");
  const [showTranslateMenu, setShowTranslateMenu] = useState(false);

  function toggleSection(id: string) {
    setOpenSection((prev) => (prev === id ? "" : id));
  }

  const upd = useCallback(<K extends keyof CareerSiteContent>(key: K, value: CareerSiteContent[K]) => {
    setContent((prev) => ({ ...prev, [key]: value }));
  }, []);

  function updArr<T>(key: keyof CareerSiteContent, idx: number, field: keyof T, value: string) {
    setContent((prev) => ({
      ...prev,
      [key]: ((prev[key] as T[]) ?? []).map((item, i) =>
        i === idx ? { ...item, [field]: value } : item
      ),
    }));
  }

  function addItem<T>(key: keyof CareerSiteContent, item: T) {
    setContent((prev) => ({ ...prev, [key]: [...((prev[key] as T[]) ?? []), item] }));
  }

  function removeItem(key: keyof CareerSiteContent, idx: number) {
    setContent((prev) => ({
      ...prev,
      [key]: ((prev[key] as unknown[]) ?? []).filter((_, i) => i !== idx),
    }));
  }

  async function saveDraft() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/career-site", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft_content: content }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setSavedAt(new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }));
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setSaving(false);
    }
  }

  async function publish() {
    setPublishing(true);
    setError(null);
    try {
      await saveDraft();
      const res = await fetch("/api/career-site/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setIsPublished(true);
      setSavedAt(new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }));
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setPublishing(false);
    }
  }

  async function unpublish() {
    setSaving(true);
    const res = await fetch("/api/career-site/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unpublish: true }),
    });
    if (res.ok) setIsPublished(false);
    setSaving(false);
  }

  async function translate(lang: "en" | "pt") {
    setShowTranslateMenu(false);
    await saveDraft();
    setTranslating(lang);
    try {
      const res = await fetch("/api/career-site/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lang }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setTranslating(null);
    }
  }

  /* ── Tab nav ── */
  const tabStyle = (active: boolean): React.CSSProperties => ({
    fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "13px",
    padding: "8px 16px", borderRadius: "9px", border: "none", cursor: "pointer",
    background: active ? T.ink : "transparent",
    color: active ? "#fff" : T.soft,
    transition: "background .14s",
  });

  /* ── Array state shortcuts ── */
  const metrics      = content.aboutMetrics   ?? [];
  const gallery      = content.aboutGallery   ?? [];
  const brands       = content.brands         ?? [];
  const cultureVals  = content.cultureValues  ?? [];
  const benefits     = content.benefits       ?? [];
  const teamProfiles = content.teamProfiles   ?? [];
  const testimonials = content.testimonials   ?? [];
  const faqs         = content.faqs           ?? [];
  const socialLinks  = content.socialLinks    ?? [];

  return (
    <div>
      {/* ── Page header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", marginBottom: "24px", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: "28px", letterSpacing: "-.8px", lineHeight: 1, margin: 0 }}>
            Career Site
          </h1>
          <p style={{ ...FL, marginTop: "8px" }}>Personaliza la página pública de empleo de tu empresa.</p>
        </div>
        {company?.slug && (
          <a
            href={`/careers/${company.slug}`}
            target="_blank"
            rel="noreferrer"
            style={{
              fontFamily: "'Archivo',sans-serif", fontWeight: 700, fontSize: "13px",
              color: T.brand, textDecoration: "none", display: "flex", alignItems: "center", gap: "5px",
              padding: "8px 14px", border: `1.5px solid ${T.line}`, borderRadius: "10px",
              background: T.surface,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 3a15 15 0 010 18M3 12h18" stroke="currentColor" strokeWidth="2"/>
            </svg>
            Ver página pública ↗
          </a>
        )}
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "20px", background: T.bg, padding: "4px", borderRadius: "12px", width: "fit-content", border: `1px solid ${T.line}` }}>
        <button style={tabStyle(activeTab === "config")} onClick={() => setActiveTab("config")}>
          Configuración
        </button>
        <button style={tabStyle(activeTab === "editor")} onClick={() => setActiveTab("editor")}>
          Editor
        </button>
      </div>

      {/* ── Configuración tab ── */}
      {activeTab === "config" && (
        <div style={{ maxWidth: "600px" }}>
          <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: "16px", padding: "24px" }}>
            <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "15px", marginBottom: "18px" }}>
              Datos básicos de empresa
            </div>
            {configContent}
          </div>
          {company?.slug && (
            <div style={{ marginTop: "16px", padding: "14px 16px", background: T.successBg, border: `1px solid #A8D9B8`, borderRadius: "12px", fontSize: "13px", color: T.successText }}>
              Career site público:{" "}
              <a href={`/careers/${company.slug}`} target="_blank" rel="noreferrer" style={{ color: T.brand, fontWeight: 700 }}>
                /careers/{company.slug}
              </a>
            </div>
          )}
        </div>
      )}

      {/* ── Editor tab ── */}
      {activeTab === "editor" && (
        <div>
          {/* Editor toolbar */}
          <div style={{
            display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px",
            flexWrap: "wrap", padding: "12px 16px", background: T.surface,
            border: `1px solid ${T.line}`, borderRadius: "13px",
          }}>
            <span style={{
              ...FL, padding: "4px 10px", borderRadius: "999px",
              background: isPublished ? T.successBg : T.warnBg,
              color: isPublished ? T.successText : T.warnText,
            }}>
              {isPublished ? "Publicado" : "Borrador"}
            </span>
            {savedAt && <span style={{ ...FL, color: T.soft }}>Guardado {savedAt}</span>}
            {error && <span style={{ fontSize: "12px", color: T.accent }}>{error}</span>}

            <div style={{ marginLeft: "auto", display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {/* Translate */}
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setShowTranslateMenu((v) => !v)}
                  disabled={!!translating}
                  style={{
                    fontFamily: "'Archivo',sans-serif", fontWeight: 700, fontSize: "13px",
                    color: T.soft, background: T.bg, border: `1.5px solid ${T.line}`,
                    borderRadius: "9px", padding: "8px 13px", cursor: "pointer",
                  }}
                >
                  {translating ? `Traduciendo ${translating}…` : "Traducir ↓"}
                </button>
                {showTranslateMenu && (
                  <div style={{
                    position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 50,
                    background: T.surface, border: `1.5px solid ${T.ink}`, borderRadius: "10px",
                    boxShadow: `3px 3px 0 ${T.ink}`, overflow: "hidden", minWidth: "150px",
                  }}>
                    {(["en", "pt"] as const).map((l) => (
                      <button
                        key={l}
                        onClick={() => translate(l)}
                        style={{
                          display: "block", width: "100%", textAlign: "left",
                          padding: "10px 14px", background: "none", border: "none",
                          fontFamily: "'Hanken Grotesk',sans-serif", fontSize: "13px",
                          color: T.ink, cursor: "pointer",
                        }}
                      >
                        {l === "en" ? "🇬🇧 Inglés" : "🇧🇷 Portugués (BR)"}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={saveDraft}
                disabled={saving || publishing}
                style={{
                  fontFamily: "'Archivo',sans-serif", fontWeight: 700, fontSize: "13px",
                  color: T.ink, background: T.bg, border: `1.5px solid ${T.line}`,
                  borderRadius: "9px", padding: "8px 13px", cursor: "pointer",
                }}
              >
                {saving ? "Guardando…" : "Guardar borrador"}
              </button>

              {isPublished ? (
                <button
                  onClick={unpublish}
                  disabled={saving || publishing}
                  style={{
                    fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "13px",
                    color: T.accent, background: "#FDE8E5", border: `1.5px solid ${T.accent}`,
                    borderRadius: "9px", padding: "8px 13px", cursor: "pointer",
                  }}
                >
                  Despublicar
                </button>
              ) : (
                <button
                  onClick={publish}
                  disabled={saving || publishing}
                  style={{
                    fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "13px",
                    color: "#fff", background: T.brand, border: `2px solid ${T.ink}`,
                    borderRadius: "9px", padding: "8px 14px", cursor: "pointer",
                    boxShadow: `3px 3px 0 ${T.ink}`,
                  }}
                >
                  {publishing ? "Publicando…" : "Publicar"}
                </button>
              )}
            </div>
          </div>

          {/* Two-column layout */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: "20px", alignItems: "start" }}>

            {/* ── Left: Form ── */}
            <div>

              {/* Hero */}
              <SectionPanel id="hero" title="Hero" open={openSection === "hero"} onToggle={toggleSection}
                badge={content.headline ? "1 campo" : undefined}>
                <Field label="Titular principal">
                  <input style={inputStyle} placeholder="Únete al equipo que transforma el sector"
                    value={content.headline ?? ""} onChange={(e) => upd("headline", e.target.value)} />
                </Field>
                <ImageUploadField
                  label="Imagen hero (1920×600 px recomendado)"
                  value={content.heroImageUrl ?? ""}
                  onChange={(url) => upd("heroImageUrl", url)}
                />
              </SectionPanel>

              {/* Sobre nosotros */}
              <SectionPanel id="about" title="Sobre nosotros" open={openSection === "about"} onToggle={toggleSection}
                badge={content.aboutDescription ? "con contenido" : undefined}>
                <Field label="Título de sección">
                  <input style={inputStyle} placeholder="Quiénes somos"
                    value={content.aboutTitle ?? ""} onChange={(e) => upd("aboutTitle", e.target.value)} />
                </Field>
                <Field label="Descripción">
                  <textarea style={textareaStyle} rows={4} placeholder="Cuéntanos vuestra historia…"
                    value={content.aboutDescription ?? ""} onChange={(e) => upd("aboutDescription", e.target.value)} />
                </Field>
              </SectionPanel>

              {/* Métricas */}
              <SectionPanel id="metrics" title="Métricas" open={openSection === "metrics"} onToggle={toggleSection}
                badge={metrics.length ? `${metrics.length}` : undefined}>
                {metrics.map((m, i) => (
                  <ArrayItemCard key={i} onRemove={() => removeItem("aboutMetrics", i)}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                      <Field label="Valor"><input style={inputStyle} placeholder="200+"
                        value={m.value} onChange={(e) => updArr<CSMetric>("aboutMetrics", i, "value", e.target.value)} /></Field>
                      <Field label="Etiqueta"><input style={inputStyle} placeholder="empleados"
                        value={m.label} onChange={(e) => updArr<CSMetric>("aboutMetrics", i, "label", e.target.value)} /></Field>
                    </div>
                  </ArrayItemCard>
                ))}
                <AddBtn onClick={() => addItem<CSMetric>("aboutMetrics", { label: "", value: "" })} label="Añadir métrica" />
              </SectionPanel>

              {/* Galería */}
              <SectionPanel id="gallery" title="Galería" open={openSection === "gallery"} onToggle={toggleSection}
                badge={gallery.length ? `${gallery.length}` : undefined}>
                {gallery.map((g, i) => (
                  <ArrayItemCard key={i} onRemove={() => removeItem("aboutGallery", i)}>
                    <Field label="Tipo">
                      <select style={{ ...inputStyle, width: "auto" }} value={g.type}
                        onChange={(e) => updArr<CSGalleryItem>("aboutGallery", i, "type", e.target.value)}>
                        <option value="image">Imagen</option>
                        <option value="video">Video (YouTube / Vimeo / URL directa)</option>
                      </select>
                    </Field>
                    {g.type === "image" ? (
                      <ImageUploadField
                        label="Imagen"
                        value={g.url}
                        onChange={(url) => updArr<CSGalleryItem>("aboutGallery", i, "url", url)}
                      />
                    ) : (
                      <Field label="URL del video">
                        <input style={inputStyle} placeholder="https://youtube.com/watch?v=… o https://vimeo.com/…"
                          value={g.url} onChange={(e) => updArr<CSGalleryItem>("aboutGallery", i, "url", e.target.value)} />
                      </Field>
                    )}
                  </ArrayItemCard>
                ))}
                <AddBtn onClick={() => addItem<CSGalleryItem>("aboutGallery", { url: "", type: "image" })} label="Añadir elemento" />
              </SectionPanel>

              {/* Marcas */}
              <SectionPanel id="brands" title="Marcas / Partners" open={openSection === "brands"} onToggle={toggleSection}
                badge={brands.length ? `${brands.length}` : undefined}>
                <Field label="Título de sección">
                  <input style={inputStyle} placeholder="Empresas del grupo / Partners"
                    value={content.brandsTitle ?? ""} onChange={(e) => upd("brandsTitle", e.target.value)} />
                </Field>
                {brands.map((b, i) => (
                  <ArrayItemCard key={i} onRemove={() => removeItem("brands", i)}>
                    <Field label="Nombre">
                      <input style={inputStyle} value={b.name}
                        onChange={(e) => updArr<CSBrand>("brands", i, "name", e.target.value)} />
                    </Field>
                    <ImageUploadField
                      label="Logo de marca"
                      value={b.logoUrl ?? ""}
                      onChange={(url) => updArr<CSBrand>("brands", i, "logoUrl", url)}
                    />
                    <Field label="Website">
                      <input style={inputStyle} placeholder="https://…" value={b.website ?? ""}
                        onChange={(e) => updArr<CSBrand>("brands", i, "website", e.target.value)} />
                    </Field>
                  </ArrayItemCard>
                ))}
                <AddBtn onClick={() => addItem<CSBrand>("brands", { name: "", logoUrl: "", website: "" })} label="Añadir marca" />
              </SectionPanel>

              {/* Cultura y valores */}
              <SectionPanel id="culture" title="Cultura y valores" open={openSection === "culture"} onToggle={toggleSection}
                badge={cultureVals.length ? `${cultureVals.length} valores` : undefined}>
                <Field label="Título de sección">
                  <input style={inputStyle} placeholder="Nuestra cultura"
                    value={content.cultureTitle ?? ""} onChange={(e) => upd("cultureTitle", e.target.value)} />
                </Field>
                <Field label="Descripción">
                  <textarea style={textareaStyle} rows={3}
                    value={content.cultureDescription ?? ""} onChange={(e) => upd("cultureDescription", e.target.value)} />
                </Field>
                {cultureVals.map((v, i) => (
                  <ArrayItemCard key={i} onRemove={() => removeItem("cultureValues", i)}>
                    <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "10px", alignItems: "end" }}>
                      <Field label="Emoji">
                        <EmojiButton
                          value={v.icon}
                          onChange={(e) => updArr<CSCultureValue>("cultureValues", i, "icon", e)}
                        />
                      </Field>
                      <Field label="Nombre del valor">
                        <input style={inputStyle} placeholder="Innovación constante"
                          value={v.name} onChange={(e) => updArr<CSCultureValue>("cultureValues", i, "name", e.target.value)} />
                      </Field>
                    </div>
                  </ArrayItemCard>
                ))}
                <AddBtn onClick={() => addItem<CSCultureValue>("cultureValues", { icon: "", name: "" })} label="Añadir valor" />
              </SectionPanel>

              {/* Qué buscamos */}
              <SectionPanel id="lookingfor" title="Qué buscamos" open={openSection === "lookingfor"} onToggle={toggleSection}
                badge={content.lookingForDescription ? "con contenido" : undefined}>
                <Field label="Título">
                  <input style={inputStyle} placeholder="El perfil que buscamos"
                    value={content.lookingForTitle ?? ""} onChange={(e) => upd("lookingForTitle", e.target.value)} />
                </Field>
                <Field label="Descripción">
                  <textarea style={textareaStyle} rows={4}
                    value={content.lookingForDescription ?? ""} onChange={(e) => upd("lookingForDescription", e.target.value)} />
                </Field>
              </SectionPanel>

              {/* Beneficios */}
              <SectionPanel id="benefits" title="Beneficios" open={openSection === "benefits"} onToggle={toggleSection}
                badge={benefits.length ? `${benefits.length}` : undefined}>
                <Field label="Título de sección">
                  <input style={inputStyle} placeholder="Qué te ofrecemos"
                    value={content.benefitsTitle ?? ""} onChange={(e) => upd("benefitsTitle", e.target.value)} />
                </Field>
                {benefits.map((b, i) => (
                  <ArrayItemCard key={i} onRemove={() => removeItem("benefits", i)}>
                    <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "10px", alignItems: "end" }}>
                      <Field label="Emoji">
                        <EmojiButton
                          value={b.icon}
                          onChange={(e) => updArr<CSBenefit>("benefits", i, "icon", e)}
                        />
                      </Field>
                      <Field label="Beneficio">
                        <input style={inputStyle} placeholder="Seguro médico privado"
                          value={b.name} onChange={(e) => updArr<CSBenefit>("benefits", i, "name", e.target.value)} />
                      </Field>
                    </div>
                  </ArrayItemCard>
                ))}
                <AddBtn onClick={() => addItem<CSBenefit>("benefits", { icon: "", name: "" })} label="Añadir beneficio" />
              </SectionPanel>

              {/* Equipo */}
              <SectionPanel id="team" title="Equipo" open={openSection === "team"} onToggle={toggleSection}
                badge={teamProfiles.length ? `${teamProfiles.length} personas` : undefined}>
                <Field label="Título">
                  <input style={inputStyle} placeholder="Conoce al equipo"
                    value={content.teamTitle ?? ""} onChange={(e) => upd("teamTitle", e.target.value)} />
                </Field>
                <Field label="Descripción">
                  <textarea style={textareaStyle} rows={2}
                    value={content.teamDescription ?? ""} onChange={(e) => upd("teamDescription", e.target.value)} />
                </Field>
                {teamProfiles.map((p, i) => (
                  <ArrayItemCard key={i} onRemove={() => removeItem("teamProfiles", i)}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                      <Field label="Nombre">
                        <input style={inputStyle}
                          value={p.name} onChange={(e) => updArr<CSTeamProfile>("teamProfiles", i, "name", e.target.value)} />
                      </Field>
                      <Field label="Cargo">
                        <input style={inputStyle}
                          value={p.position} onChange={(e) => updArr<CSTeamProfile>("teamProfiles", i, "position", e.target.value)} />
                      </Field>
                    </div>
                    <ImageUploadField
                      label="Foto"
                      value={p.photoUrl ?? ""}
                      onChange={(url) => updArr<CSTeamProfile>("teamProfiles", i, "photoUrl", url)}
                    />
                    <Field label="LinkedIn (opcional)">
                      <input style={inputStyle} placeholder="https://linkedin.com/in/…"
                        value={p.linkedinUrl ?? ""} onChange={(e) => updArr<CSTeamProfile>("teamProfiles", i, "linkedinUrl", e.target.value)} />
                    </Field>
                  </ArrayItemCard>
                ))}
                <AddBtn onClick={() => addItem<CSTeamProfile>("teamProfiles", { name: "", position: "", photoUrl: "", linkedinUrl: "" })} label="Añadir persona" />
              </SectionPanel>

              {/* Testimonios */}
              <SectionPanel id="testimonials" title="Testimonios" open={openSection === "testimonials"} onToggle={toggleSection}
                badge={testimonials.length ? `${testimonials.length}` : undefined}>
                {testimonials.map((t, i) => (
                  <ArrayItemCard key={i} onRemove={() => removeItem("testimonials", i)}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                      <Field label="Nombre"><input style={inputStyle}
                        value={t.name} onChange={(e) => updArr<CSTestimonial>("testimonials", i, "name", e.target.value)} /></Field>
                      <Field label="Cargo"><input style={inputStyle}
                        value={t.position} onChange={(e) => updArr<CSTestimonial>("testimonials", i, "position", e.target.value)} /></Field>
                    </div>
                    <Field label="Texto del testimonio">
                      <textarea style={textareaStyle} rows={3}
                        value={t.text} onChange={(e) => updArr<CSTestimonial>("testimonials", i, "text", e.target.value)} />
                    </Field>
                    <ImageUploadField
                      label="Foto (opcional)"
                      value={t.photoUrl ?? ""}
                      onChange={(url) => updArr<CSTestimonial>("testimonials", i, "photoUrl", url)}
                    />
                  </ArrayItemCard>
                ))}
                <AddBtn onClick={() => addItem<CSTestimonial>("testimonials", { name: "", position: "", text: "", photoUrl: "" })} label="Añadir testimonio" />
              </SectionPanel>

              {/* FAQs */}
              <SectionPanel id="faqs" title="Preguntas frecuentes" open={openSection === "faqs"} onToggle={toggleSection}
                badge={faqs.length ? `${faqs.length}` : undefined}>
                <Field label="Título de sección">
                  <input style={inputStyle} placeholder="Preguntas frecuentes"
                    value={content.faqsTitle ?? ""} onChange={(e) => upd("faqsTitle", e.target.value)} />
                </Field>
                {faqs.map((f, i) => (
                  <ArrayItemCard key={i} onRemove={() => removeItem("faqs", i)}>
                    <Field label="Pregunta">
                      <input style={inputStyle}
                        value={f.question} onChange={(e) => updArr<CSFAQ>("faqs", i, "question", e.target.value)} />
                    </Field>
                    <Field label="Respuesta">
                      <textarea style={textareaStyle} rows={2}
                        value={f.answer} onChange={(e) => updArr<CSFAQ>("faqs", i, "answer", e.target.value)} />
                    </Field>
                  </ArrayItemCard>
                ))}
                <AddBtn onClick={() => addItem<CSFAQ>("faqs", { question: "", answer: "" })} label="Añadir pregunta" />
              </SectionPanel>

              {/* Redes sociales */}
              <SectionPanel id="social" title="Redes sociales" open={openSection === "social"} onToggle={toggleSection}
                badge={socialLinks.length ? `${socialLinks.length}` : undefined}>
                {socialLinks.map((s, i) => (
                  <ArrayItemCard key={i} onRemove={() => removeItem("socialLinks", i)}>
                    <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: "8px" }}>
                      <Field label="Red">
                        <select style={{ ...inputStyle, width: "100%" }} value={s.platform}
                          onChange={(e) => updArr<CSSocialLink>("socialLinks", i, "platform", e.target.value)}>
                          <option value="linkedin">LinkedIn</option>
                          <option value="instagram">Instagram</option>
                          <option value="twitter">Twitter / X</option>
                          <option value="facebook">Facebook</option>
                          <option value="youtube">YouTube</option>
                          <option value="tiktok">TikTok</option>
                        </select>
                      </Field>
                      <Field label="URL">
                        <input style={inputStyle} placeholder="https://…"
                          value={s.url} onChange={(e) => updArr<CSSocialLink>("socialLinks", i, "url", e.target.value)} />
                      </Field>
                    </div>
                  </ArrayItemCard>
                ))}
                <AddBtn onClick={() => addItem<CSSocialLink>("socialLinks", { platform: "linkedin", url: "" })} label="Añadir red social" />
              </SectionPanel>

            </div>

            {/* ── Right: Preview ── */}
            <div style={{ position: "sticky", top: "20px" }}>
              <div style={{ ...FL, marginBottom: "8px" }}>Vista previa</div>
              <div style={{
                border: `2px solid ${T.ink}`, borderRadius: "14px",
                boxShadow: `3px 3px 0 ${T.ink}`, overflow: "hidden",
                background: "#ECEAE4", maxHeight: "calc(100vh - 160px)", overflowY: "auto",
              }}>
                <CareerSitePreview
                  content={content}
                  company={company}
                  activeJobsCount={activeJobsCount}
                />
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
