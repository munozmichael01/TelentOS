"use client";

import { useState, useEffect, useTransition, type CSSProperties } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import type { BoardJob, BoardFacets, BoardSort } from "@/lib/job-board/search";
import type { BoardCategory, BoardCity } from "@/lib/board/geo";
import { modalityStyle, formatSalary, logoFor, relativeDate, isNew, jobSlug } from "@/lib/board/format";
import { BoardTabBar } from "@/components/board/tab-bar";
import { OfferDetailPanel } from "@/components/board/offer-detail-panel";

// ≥1240px activamos el split lista+detalle (LinkedIn-style). Por debajo, la tarjeta
// navega a la página de oferta (comportamiento mobile intacto).
function useIsDesktop() {
  const [d, setD] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1240px)");
    const on = () => setD(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return d;
}

const ARCHIVO = "'Archivo',sans-serif";
const MONO = "'Space Mono',monospace";

const ROOT: CSSProperties = {
  "--brand": "#0E5C4A", "--accent": "#F1543F", "--lime": "#C6F24E", "--ink": "#1A1A17",
  "--soft": "#79746B", "--line": "#E7E1D4", "--surface": "#FCFAF6", "--bg": "#F4F0E8",
  "--brandSoft": "#DCEFE4", "--limeSoft": "#EAF7C4",
  fontFamily: "'Hanken Grotesk',system-ui,sans-serif", color: "#1A1A17",
  background: "#F4F0E8", minHeight: "100vh",
  WebkitFontSmoothing: "antialiased",
} as CSSProperties;

type Filters = { categoryKey?: string; location?: string; modality?: "presencial" | "hibrido" | "remoto"; contract?: string; companyId?: string };
type NlChip = { k: string; v: string };

export function BoardClient({
  initialJobs, initialTotal, initialFacets, initialQuery, categories, country,
}: {
  initialJobs: BoardJob[]; initialTotal: number; initialFacets: BoardFacets; initialQuery: string;
  categories: BoardCategory[]; country: string;
}) {
  const t = useTranslations("Board");
  const locale = useLocale();
  const router = useRouter();

  const [jobs, setJobs] = useState(initialJobs);
  const [total, setTotal] = useState(initialTotal);
  const [facets, setFacets] = useState(initialFacets);
  const [query, setQuery] = useState(initialQuery);
  const [nlChips, setNlChips] = useState<NlChip[]>([]);
  const [filters, setFilters] = useState<Filters>({});
  const [sort, setSort] = useState<BoardSort>("relevance");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draft, setDraft] = useState<Filters>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [citySug, setCitySug] = useState<BoardCity[]>([]);
  const catLabel = (key?: string) => categories.find((c) => c.key === key)?.label ?? key ?? "";

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  }

  async function fetchCities(q: string) {
    const r = await fetch(`/api/board/cities?country=${country}&q=${encodeURIComponent(q)}`).then((x) => (x.ok ? x.json() : null)).catch(() => null);
    setCitySug(r?.cities ?? []);
  }

  async function fetchJobs(f: Filters, s: BoardSort, q: string) {
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (f.categoryKey) p.set("categoryKey", f.categoryKey);
    if (f.location) p.set("location", f.location);
    if (f.modality) p.set("modality", f.modality);
    if (f.contract) p.set("contract", f.contract);
    if (f.companyId) p.set("companyId", f.companyId);
    p.set("sort", s);
    const res = await fetch(`/api/board/jobs?${p.toString()}`);
    if (!res.ok) return;
    const data = await res.json();
    setJobs(data.jobs); setTotal(data.total); setFacets(data.facets);
  }

  function runSearch() {
    startTransition(async () => {
      // Interpreta el texto libre (NL) → filtros FRESCOS (no acumula con búsquedas
      // previas). Los filtros del sheet se aplican aparte (applyDraft).
      const chips: NlChip[] = [];
      const nlFilters: Filters = {};
      let effQuery = query.trim();
      if (effQuery) {
        const r = await fetch("/api/board/search-parse", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: effQuery }),
        }).then((x) => (x.ok ? x.json() : null)).catch(() => null);
        if (r?.filters) {
          const f = r.filters;
          // La categoría del NL es free-text (no canónica) → no fija filtro; el texto q la
          // cubre. La ubicación y la modalidad sí son señales fiables.
          if (f.modality) { nlFilters.modality = f.modality; chips.push({ k: t("filters.modality"), v: t(`modality.${f.modality}`) }); }
          if (f.location) { nlFilters.location = f.location; chips.push({ k: "📍", v: f.location }); }
          if (f.q) { effQuery = f.q; setQuery(f.q); }
        }
      }
      setNlChips(chips);
      setFilters(nlFilters);
      await fetchJobs(nlFilters, sort, effQuery);
    });
  }

  function changeSort(s: BoardSort) {
    setSort(s);
    startTransition(() => fetchJobs(filters, s, query));
  }

  function applyDraft() {
    setFilters(draft);
    setFiltersOpen(false);
    startTransition(() => fetchJobs(draft, sort, query));
  }

  function removeFilter(key: keyof Filters) {
    const next = { ...filters }; delete next[key];
    setFilters(next);
    startTransition(() => fetchJobs(next, sort, query));
  }

  async function toggleSave(e: React.MouseEvent, jobId: string) {
    e.preventDefault(); e.stopPropagation();
    const isSaved = !!saved[jobId];
    setSaved((s) => ({ ...s, [jobId]: !isSaved }));
    const res = isSaved
      ? await fetch(`/api/board/saved?jobId=${jobId}`, { method: "DELETE" })
      : await fetch("/api/board/saved", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobId }) });
    if (res.status === 401) { setSaved((s) => ({ ...s, [jobId]: false })); router.push("/cuenta/entrar"); return; }
    if (!res.ok) { setSaved((s) => ({ ...s, [jobId]: isSaved })); return; } // revierte
    flash(isSaved ? t("toast.unsaved") : t("toast.saved"));
  }

  const isDesktop = useIsDesktop();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [applied, setApplied] = useState<Record<string, boolean>>({});
  const [applying, setApplying] = useState<Record<string, boolean>>({});

  // El board es ANÓNIMO por defecto. El "1 toque" (⚡) solo se ofrece a un candidato
  // logueado con perfil completo; en cualquier otro caso la card muestra "Aplicar" y abre
  // el flujo. Perfil completo es global; el screening es por oferta (viene en cada BoardJob).
  const [hasProfile, setHasProfile] = useState(false);
  useEffect(() => {
    fetch("/api/board/profile").then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.completeness?.complete) setHasProfile(true); }).catch(() => {});
  }, []);

  // Desktop: mantener seleccionada la oferta activa (o la primera) para el panel inline.
  // Mobile: sin selección (la tarjeta navega).
  useEffect(() => {
    if (!isDesktop) { setSelectedId(null); return; }
    setSelectedId((prev) => (prev && jobs.some((j) => j.id === prev) ? prev : jobs[0]?.id ?? null));
  }, [isDesktop, jobs]);

  // Navegación por teclado sobre la lista (solo desktop): ↑/↓ mueve la selección, Enter abre.
  useEffect(() => {
    if (!isDesktop) return;
    function onKey(e: KeyboardEvent) {
      const el = document.activeElement;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      if (!jobs.length) return;
      const idx = jobs.findIndex((j) => j.id === selectedId);
      if (e.key === "Enter") {
        const j = jobs[idx];
        if (j) router.push({ pathname: "/empleos/oferta/[slug]", params: { slug: jobSlug(j) } });
        return;
      }
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      e.preventDefault();
      const next = idx === -1 ? 0 : e.key === "ArrowDown" ? Math.min(idx + 1, jobs.length - 1) : Math.max(idx - 1, 0);
      const id = jobs[next].id;
      setSelectedId(id);
      document.getElementById(`jbcard-${id}`)?.scrollIntoView({ block: "nearest" });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isDesktop, jobs, selectedId, router]);

  // Aplicar en 1 toque desde la card — SOLO en modo "quick" (perfil completo ∧ sin
  // screening). Aplica al instante con la ficha del candidato. Los demás casos NO llaman
  // aquí: son un enlace al flujo Apply (modo "full"). stopPropagation para no seleccionar.
  async function oneTapFromCard(e: React.MouseEvent, j: BoardJob) {
    e.preventDefault(); e.stopPropagation();
    if (applied[j.id] || applying[j.id]) return;
    setApplying((s) => ({ ...s, [j.id]: true }));
    const slug = jobSlug(j);
    const res = await fetch("/api/board/apply/one-tap", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobId: j.id }),
    }).then((r) => r.json().then((d) => ({ status: r.status, d })).catch(() => ({ status: r.status, d: null }))).catch(() => null);
    setApplying((s) => { const n = { ...s }; delete n[j.id]; return n; });
    if (!res) { flash(t("apply.error")); return; }
    if (res.status === 401) { router.push("/cuenta/entrar"); return; }
    // Cambió el estado (screening/perfil) desde la carga → cae al flujo completo.
    if (res.d?.needsWizard) { router.push({ pathname: "/empleos/oferta/[slug]/aplicar", params: { slug } }); return; }
    if ((res.status === 200 && res.d?.ok) || res.status === 409) { setApplied((s) => ({ ...s, [j.id]: true })); flash(t("toast.applied")); return; }
    flash(t("apply.error"));
  }

  const activeFilters = (Object.keys(filters) as (keyof Filters)[]).filter((k) => filters[k]);
  const sorts: BoardSort[] = ["relevance", "recent", "salary"];

  return (
    <div style={ROOT}>
      {/* Header */}
      <header style={{ position: "sticky", top: 0, zIndex: 20, background: "rgba(244,240,232,.94)", backdropFilter: "blur(8px)", borderBottom: "1px solid var(--line)", padding: "12px 16px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "2px 2px 0 var(--ink)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 7l8 4 8-4M4 7l8-4 8 4M4 7v10l8 4 8-4V7M12 11v10" stroke="#C6F24E" strokeWidth="2" strokeLinejoin="round" /></svg>
          </div>
          <span style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 16, letterSpacing: "-.5px" }}>
            TalentOS <span style={{ color: "var(--brand)" }}>{t("brand")}</span>
          </span>
          <Link href="/cuenta/entrar" style={{ marginLeft: "auto", fontFamily: ARCHIVO, fontWeight: 800, fontSize: 12, color: "var(--ink)", background: "var(--surface)", border: "1.5px solid var(--ink)", borderRadius: 9, padding: "6px 12px", boxShadow: "2px 2px 0 var(--ink)" }}>
            {t("login")}
          </Link>
        </div>
      </header>

      <main className="jb-board-main">
        {/* Hero + búsqueda */}
        <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: 1.5, textTransform: "uppercase", color: "var(--brand)", marginBottom: 9 }}>{t("hero.eyebrow")}</div>
        <h1 style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 32, lineHeight: 1, letterSpacing: "-1.4px", margin: "0 0 16px" }}>
          {t("hero.title")} <span style={{ fontStyle: "italic", color: "var(--accent)" }}>{t("hero.titleAccent")}</span> {t("hero.titleEnd")}
        </h1>

        <div style={{ background: "var(--surface)", border: "2px solid var(--ink)", borderRadius: 14, boxShadow: "3px 3px 0 var(--ink)", padding: "11px 13px", display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}><circle cx="11" cy="11" r="7" stroke="var(--soft)" strokeWidth="2" /><path d="M20 20l-3.5-3.5" stroke="var(--soft)" strokeWidth="2" strokeLinecap="round" /></svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") runSearch(); }}
            placeholder={t("search.placeholder")}
            style={{ width: "100%", fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 15, color: "var(--ink)", background: "transparent", border: "none", outline: "none" }}
          />
        </div>
        <div style={{ display: "flex", gap: 7, marginTop: 9 }}>
          <button onClick={runSearch} disabled={pending} className="jb-hard" style={{ flex: 1, fontFamily: ARCHIVO, fontWeight: 800, fontSize: 14, color: "#fff", background: "var(--accent)", border: "2px solid var(--ink)", borderRadius: 11, padding: 11, boxShadow: "3px 3px 0 var(--ink)", cursor: "pointer", opacity: pending ? 0.7 : 1 }}>
            {t("search.submit")}
          </button>
          <button onClick={() => { setDraft(filters); setFiltersOpen(true); }} className="jb-hard" style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: ARCHIVO, fontWeight: 700, fontSize: 14, color: "var(--ink)", background: "var(--surface)", border: "2px solid var(--ink)", borderRadius: 11, padding: "11px 14px", boxShadow: "3px 3px 0 var(--ink)", cursor: "pointer" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M3 5h18M6 12h12M10 19h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            {t("search.filters")}
            {activeFilters.length > 0 && <span style={{ fontFamily: MONO, fontSize: 10, color: "#fff", background: "var(--accent)", borderRadius: 999, padding: "0 6px" }}>{activeFilters.length}</span>}
          </button>
        </div>

        {/* NL chips */}
        {nlChips.length > 0 && (
          <div style={{ marginTop: 11, background: "var(--limeSoft)", border: "1px solid #D6E89A", borderRadius: 12, padding: "10px 12px" }}>
            <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: .5, textTransform: "uppercase", color: "#46540F", marginBottom: 8 }}>{t("search.interpreted")}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {nlChips.map((c, i) => (
                <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "#2C5247", background: "var(--surface)", border: "1px solid #C9E3D3", borderRadius: 999, padding: "4px 10px" }}>
                  <span style={{ fontFamily: MONO, fontSize: 8.5, textTransform: "uppercase", color: "var(--soft)" }}>{c.k}</span>{c.v}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="jb-board-split">
         <div className="jb-board-list">
        {/* Sort + count */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0 6px" }}>
          <div style={{ fontFamily: MONO, fontSize: 11, color: "var(--soft)" }}>
            <b style={{ color: "var(--ink)", fontSize: 13 }}>{total}</b> · {t("results.count", { count: total })}
          </div>
          <div style={{ display: "flex", gap: 5 }}>
            {sorts.map((s) => (
              <button key={s} onClick={() => changeSort(s)} style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: sort === s ? 700 : 600, fontSize: 11.5, borderRadius: 999, padding: "5px 10px", cursor: "pointer", border: `1px solid ${sort === s ? "#1A1A17" : "#E7E1D4"}`, background: sort === s ? "#1A1A17" : "#FCFAF6", color: sort === s ? "#fff" : "#79746B" }}>
                {t(`sort.${s}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Active filter chips */}
        {activeFilters.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", padding: "6px 0" }}>
            {activeFilters.map((k) => (
              <button key={k} onClick={() => removeFilter(k)} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--brand)", background: "var(--brandSoft)", border: "1px solid #BEE0CE", borderRadius: 999, padding: "5px 8px 5px 11px", cursor: "pointer" }}>
                {k === "modality" ? t(`modality.${filters.modality}`) : k === "categoryKey" ? catLabel(filters.categoryKey) : filters[k]}
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="#0E5C4A" strokeWidth="2.6" strokeLinecap="round" /></svg>
              </button>
            ))}
          </div>
        )}

        {/* Resultados */}
        <div style={{ display: "flex", flexDirection: "column", gap: 11, marginTop: 8 }}>
          {jobs.map((j) => {
            const m = modalityStyle(j.modality);
            const logo = logoFor(j.company?.name);
            const salary = formatSalary(j, locale);
            return (
              <Link key={j.id} id={`jbcard-${j.id}`} href={{ pathname: "/empleos/oferta/[slug]", params: { slug: jobSlug(j) } }} onClick={(e) => { if (isDesktop) { e.preventDefault(); setSelectedId(j.id); } }} style={{ display: "block", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 15, color: "inherit", cursor: "pointer" }} className={`jb-job${isDesktop && selectedId === j.id ? " jb-board-card-active" : ""}`}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <span style={{ width: 42, height: 42, borderRadius: 12, background: logo.bg, color: logo.color, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: ARCHIVO, fontWeight: 900, fontSize: 15, flexShrink: 0 }}>{logo.initials}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span style={{ fontFamily: MONO, fontSize: 11, color: "var(--soft)" }}>{j.company?.name}</span>
                      {isNew(j.created_at) && <span style={{ fontFamily: MONO, fontSize: 8.5, fontWeight: 700, textTransform: "uppercase", color: "#46540F", background: "var(--limeSoft)", borderRadius: 5, padding: "1px 6px" }}>{t("card.new")}</span>}
                    </div>
                    <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 16, letterSpacing: "-.3px", lineHeight: 1.15, marginTop: 2 }}>{j.title}</div>
                  </div>
                  <button onClick={(e) => toggleSave(e, j.id)} aria-label="save" style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "none", cursor: "pointer", margin: "-4px -4px 0 0" }}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill={saved[j.id] ? "#0E5C4A" : "none"}><path d="M6 4h12v17l-6-4-6 4V4Z" stroke={saved[j.id] ? "#0E5C4A" : "#79746B"} strokeWidth="2" strokeLinejoin="round" /></svg>
                  </button>
                </div>
                {j.description && <div style={{ fontSize: 12.5, lineHeight: 1.45, color: "#6B665E", marginTop: 8, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{j.description}</div>}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                  {j.city && <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 600, color: "#54504A", background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 8, padding: "4px 9px" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 21s7-6 7-12a7 7 0 10-14 0c0 6 7 12 7 12Z" stroke="var(--soft)" strokeWidth="2" strokeLinejoin="round" /><circle cx="12" cy="9" r="2.4" stroke="var(--soft)" strokeWidth="2" /></svg>{j.city}
                  </span>}
                  {j.modality && <span style={{ fontSize: 11.5, fontWeight: 700, color: m.color, background: m.bg, border: `1px solid ${m.border}`, borderRadius: 8, padding: "4px 9px" }}>{t(`modality.${j.modality}`)}</span>}
                  {j.employment_type && <span style={{ fontSize: 11.5, fontWeight: 600, color: "#54504A", background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 8, padding: "4px 9px" }}>{j.employment_type}</span>}
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, paddingTop: 11, borderTop: "1px solid var(--line)" }}>
                  <div>
                    <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 14, color: "var(--brand)" }}>{salary || t("card.salaryTBD")}</div>
                    <div style={{ fontFamily: MONO, fontSize: 9.5, color: "var(--soft)", marginTop: 1 }}>{relativeDate(j.created_at, locale)}</div>
                  </div>
                  {applied[j.id] ? (
                    // Aplicada — verde suave, sin sombra (confirmación)
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: ARCHIVO, fontWeight: 800, fontSize: 12.5, color: "var(--brand)", background: "var(--brandSoft)", border: "1.5px solid #BEE0CE", borderRadius: 10, padding: "7px 12px" }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5 9-11" stroke="var(--brand)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>{t("card.applied")}
                    </span>
                  ) : hasProfile && !j.hasRequiredScreening ? (
                    // 1 toque — solo perfil completo ∧ oferta sin screening (coral + rayo)
                    <button onClick={(e) => oneTapFromCard(e, j)} disabled={!!applying[j.id]} className="jb-hard" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: ARCHIVO, fontWeight: 800, fontSize: 12.5, color: "#fff", background: "var(--accent)", border: "2px solid var(--ink)", borderRadius: 10, padding: "7px 12px", boxShadow: "2px 2px 0 var(--ink)", cursor: "pointer", opacity: applying[j.id] ? 0.7 : 1 }}>
                      {applying[j.id] ? t("apply.sending") : <><svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8Z" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" /></svg>{t("card.quickApply")}</>}
                    </button>
                  ) : (
                    // Aplicar — por defecto (incl. anónimo): abre el flujo Apply, sin icono.
                    // <button> (no <a>): la card ya es un <a> y anidar anchors rompe la hidratación.
                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push({ pathname: "/empleos/oferta/[slug]/aplicar", params: { slug: jobSlug(j) } }); }} className="jb-hard" style={{ display: "inline-flex", alignItems: "center", fontFamily: ARCHIVO, fontWeight: 800, fontSize: 12.5, color: "var(--ink)", background: "var(--surface)", border: "2px solid var(--ink)", borderRadius: 10, padding: "7px 12px", boxShadow: "2px 2px 0 var(--ink)", cursor: "pointer" }}>
                      {t("card.apply")}
                    </button>
                  )}
                </div>
              </Link>
            );
          })}

          {jobs.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--soft)" }}>
              <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 17, color: "var(--ink)", marginBottom: 6 }}>{t("empty.title")}</div>
              <div style={{ fontSize: 13.5, lineHeight: 1.5 }}>{t("empty.desc")}</div>
              <button onClick={() => { setFilters({}); setQuery(""); setNlChips([]); startTransition(() => fetchJobs({}, sort, "")); }} style={{ marginTop: 14, fontFamily: ARCHIVO, fontWeight: 800, fontSize: 13, color: "var(--brand)", background: "none", border: "none", cursor: "pointer" }}>{t("empty.reset")}</button>
            </div>
          )}
         </div>
         </div>{/* /jb-board-list */}

         {/* Panel de detalle inline — solo desktop (CSS oculta en mobile) */}
         <aside className="jb-board-detail" aria-live="polite">
           {selectedId
             ? <OfferDetailPanel key={selectedId} jobId={selectedId} locale={locale} />
             : (
               <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--soft)" }}>
                 <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 16, color: "var(--ink)", marginBottom: 6 }}>{t("results.selectPrompt")}</div>
                 <div style={{ fontSize: 13.5, lineHeight: 1.5 }}>{t("results.selectHint")}</div>
               </div>
             )}
         </aside>
        </div>{/* /jb-board-split */}
      </main>

      {/* FAB: asistente IA (la página se auto-protege si no hay sesión). Sobre la tab bar. */}
      <Link href="/empleos/asistente" className="jb-hard" style={{ position: "fixed", right: 18, bottom: 84, zIndex: 25, display: "inline-flex", alignItems: "center", gap: 8, fontFamily: ARCHIVO, fontWeight: 800, fontSize: 13, color: "#fff", background: "var(--ink)", border: "2px solid var(--ink)", borderRadius: 999, padding: "11px 16px", boxShadow: "3px 3px 0 var(--brand)" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2Z" stroke="#C6F24E" strokeWidth="1.7" strokeLinejoin="round" /></svg>
        {t("assistant.cta")}
      </Link>

      {/* Navegación inferior (candidato) */}
      <BoardTabBar active="search" />

      {/* Filter sheet */}
      {filtersOpen && (
        <div onClick={() => setFiltersOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(26,26,23,.4)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 720, maxHeight: "85%", overflowY: "auto", background: "var(--bg)", borderRadius: "22px 22px 0 0", borderTop: "2px solid var(--ink)" }}>
            <div style={{ position: "sticky", top: 0, background: "var(--bg)", padding: "14px 18px 10px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 19, letterSpacing: "-.5px" }}>{t("filters.title")}</span>
              <button onClick={() => setDraft({})} style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: "var(--accent)", background: "none", border: "none", cursor: "pointer" }}>{t("filters.clear")}</button>
            </div>
            <div style={{ padding: "16px 18px 10px" }}>
              {/* Ubicación: autocomplete de la lista canónica del mercado (no solo con ofertas) */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontFamily: MONO, fontSize: 10, textTransform: "uppercase", letterSpacing: 1, color: "var(--soft)", marginBottom: 10 }}>{t("filters.location")}</div>
                {draft.location ? (
                  <button onClick={() => setDraft((d) => ({ ...d, location: undefined }))} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "#0E5C4A", background: "#DCEFE4", border: "1.5px solid #1A1A17", borderRadius: 999, padding: "7px 13px", cursor: "pointer" }}>
                    {draft.location}<svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="#0E5C4A" strokeWidth="2.6" strokeLinecap="round" /></svg>
                  </button>
                ) : (
                  <>
                    <input onChange={(e) => fetchCities(e.target.value)} placeholder={t("filters.locationPlaceholder")} style={{ width: "100%", fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, background: "#FCFAF6", border: "1.5px solid #E7E1D4", borderRadius: 10, padding: "9px 12px", outline: "none", boxSizing: "border-box" }} />
                    {citySug.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                        {citySug.map((c) => (
                          <button key={`${c.name}-${c.admin1}`} onClick={() => { setDraft((d) => ({ ...d, location: c.name })); setCitySug([]); }} style={{ fontSize: 12.5, fontWeight: 600, color: "#54504A", background: "#FCFAF6", border: "1px solid #E7E1D4", borderRadius: 999, padding: "6px 11px", cursor: "pointer" }}>{c.name} <span style={{ color: "var(--soft)", fontSize: 10 }}>{c.admin1}</span></button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
              {/* Categoría CANÓNICA — lista completa (las 22), no solo las con ofertas */}
              <FacetGroup label={t("filters.category")} options={categories.map((c) => ({ val: c.key, label: c.label }))} selected={draft.categoryKey} onToggle={(v) => setDraft((d) => ({ ...d, categoryKey: d.categoryKey === v ? undefined : v }))} />
              <FacetGroup label={t("filters.modality")} options={(["remoto", "hibrido", "presencial"] as const).map((v) => ({ val: v, label: t(`modality.${v}`) }))} selected={draft.modality} onToggle={(v) => setDraft((d) => ({ ...d, modality: d.modality === v ? undefined : (v as Filters["modality"]) }))} />
              <FacetGroup label={t("filters.contract")} options={facets.contract.map((f) => ({ val: f.value, label: `${f.value} · ${f.count}` }))} selected={draft.contract} onToggle={(v) => setDraft((d) => ({ ...d, contract: d.contract === v ? undefined : v }))} />
            </div>
            <div style={{ position: "sticky", bottom: 0, background: "var(--bg)", borderTop: "1px solid var(--line)", padding: "12px 18px 18px" }}>
              <button onClick={applyDraft} className="jb-hard" style={{ width: "100%", fontFamily: ARCHIVO, fontWeight: 800, fontSize: 15, color: "#fff", background: "var(--accent)", border: "2px solid var(--ink)", borderRadius: 11, padding: 13, boxShadow: "3px 3px 0 var(--ink)", cursor: "pointer" }}>{t("filters.title")}</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", left: 16, right: 16, bottom: 24, zIndex: 50, maxWidth: 400, margin: "0 auto", background: "var(--ink)", color: "#F4F0E8", borderRadius: 14, padding: "13px 15px", display: "flex", alignItems: "center", gap: 11, boxShadow: "0 20px 40px -20px rgba(0,0,0,.6)" }}>
          <span style={{ width: 30, height: 30, borderRadius: 9, background: "rgba(198,242,78,.18)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5 9-11" stroke="#C6F24E" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
          <span style={{ fontSize: 13, lineHeight: 1.4 }}>{toast}</span>
        </div>
      )}
    </div>
  );
}

function FacetGroup({
  label, options, selected, onToggle, hidden,
}: {
  label: string; options: { val: string; label: string }[]; selected?: string; onToggle: (v: string) => void; hidden?: boolean;
}) {
  if (hidden || options.length === 0) return null;
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontFamily: MONO, fontSize: 10, textTransform: "uppercase", letterSpacing: 1, color: "var(--soft)", marginBottom: 10 }}>{label}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
        {options.map((o) => {
          const on = selected === o.val;
          return (
            <button key={o.val} onClick={() => onToggle(o.val)} style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: on ? 700 : 600, fontSize: 13, borderRadius: 999, padding: "7px 13px", border: `1.5px solid ${on ? "#1A1A17" : "#E7E1D4"}`, background: on ? "#DCEFE4" : "#FCFAF6", color: on ? "#0E5C4A" : "#54504A", cursor: "pointer" }}>
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
