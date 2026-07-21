"use client";

import { useState, useEffect, useTransition, type CSSProperties } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import type { BoardJob, BoardFacets, BoardSort } from "@/lib/job-board/search";
import type { BoardCategory } from "@/lib/board/geo";
import { modalityStyle, formatSalary, logoFor, relativeDate, isNew, jobSlug } from "@/lib/board/format";
import { BoardTabBar } from "@/components/board/tab-bar";
import { OfferDetailPanel } from "@/components/board/offer-detail-panel";

// ≥1024px activamos el split lista+detalle (LinkedIn-style). Por debajo, la tarjeta
// navega a la página de oferta (comportamiento mobile intacto). Coincide con el
// breakpoint de las otras pantallas del board y con el split de la spec (tablet+desktop).
function useIsDesktop() {
  const [d, setD] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
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

type NlChip = { k: string; v: string };

// Filtros multi-select por grupo (barra de filtros desktop). area/modality/contract/
// company se alimentan de las facetas reales; salary/date son bandas fijas.
type GroupKey = "area" | "modality" | "salary" | "contract" | "company" | "date";
type Sel = Record<GroupKey, string[]>;
const GROUPS: GroupKey[] = ["area", "modality", "salary", "contract", "company", "date"];
function emptySel(): Sel { return { area: [], modality: [], salary: [], contract: [], company: [], date: [] }; }
const SALARY_MIN: Record<string, number> = { lt1000: 0, "b1000": 1000, "b2000": 2000 };
const SALARY_BANDS = [{ v: "lt1000", min: 0 }, { v: "b1000", min: 1000 }, { v: "b2000", min: 2000 }];
const DATE_BANDS = ["24h", "week", "month"];

// Números de página a mostrar (‹ 1 2 3 … 16 ›).
function pageDefs(cur: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  const start = Math.max(2, cur - 1), end = Math.min(total - 1, cur + 1);
  if (start > 2) out.push("…");
  for (let i = start; i <= end; i++) out.push(i);
  if (end < total - 1) out.push("…");
  out.push(total);
  return out;
}

export function BoardClient({
  initialJobs, initialTotal, initialFacets, initialQuery, categories, country, authed = false,
}: {
  initialJobs: BoardJob[]; initialTotal: number; initialFacets: BoardFacets; initialQuery: string;
  categories: BoardCategory[]; country: string; authed?: boolean;
}) {
  const t = useTranslations("Board");
  const locale = useLocale();
  const router = useRouter();

  const [jobs, setJobs] = useState(initialJobs);
  const [total, setTotal] = useState(initialTotal);
  const [facets, setFacets] = useState(initialFacets);
  const [query, setQuery] = useState(initialQuery);
  const [nlChips, setNlChips] = useState<NlChip[]>([]);
  // Multi-select por grupo (barra de filtros desktop): OR dentro del grupo, AND entre grupos.
  const [sel, setSel] = useState<Sel>(emptySel());
  const [location, setLocation] = useState("");
  const [sort, setSort] = useState<BoardSort>("relevance");
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<GroupKey | null>(null);
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [savedSearch, setSavedSearch] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const catLabel = (key?: string) => categories.find((c) => c.key === key)?.label ?? key ?? "";

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }

  const PAGE_SIZE = 20;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Construye los query params desde la selección multi + ubicación + salario + fecha.
  function buildParams(s: Sel, sortV: BoardSort, q: string, loc: string, pg: number): URLSearchParams {
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (loc.trim()) p.set("location", loc.trim());
    if (s.area.length) p.set("categoryKeys", s.area.join(","));
    if (s.modality.length) p.set("modalities", s.modality.join(","));
    if (s.contract.length) p.set("contracts", s.contract.join(","));
    if (s.company.length) p.set("companyIds", s.company.join(","));
    if (s.date.length) p.set("datePosted", s.date[0]);
    if (s.salary.length) { const min = Math.min(...s.salary.map((v) => SALARY_MIN[v] ?? 0)); if (min > 0) p.set("salaryMin", String(min)); }
    p.set("sort", sortV);
    if (pg > 1) p.set("page", String(pg));
    return p;
  }

  async function fetchJobs(s: Sel, sortV: BoardSort, q: string, loc: string, pg: number) {
    setSavedSearch(false);
    const res = await fetch(`/api/board/jobs?${buildParams(s, sortV, q, loc, pg).toString()}`);
    if (!res.ok) return;
    const data = await res.json();
    setJobs(data.jobs); setTotal(data.total); setFacets(data.facets);
  }

  function runSearch() {
    startTransition(async () => {
      const chips: NlChip[] = [];
      const next = emptySel();
      let nextLoc = "";
      let effQuery = query.trim();
      if (effQuery) {
        const r = await fetch("/api/board/search-parse", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: effQuery }),
        }).then((x) => (x.ok ? x.json() : null)).catch(() => null);
        if (r?.filters) {
          const f = r.filters;
          if (f.modality) { next.modality = [f.modality]; chips.push({ k: t("filters.modality"), v: t(`modality.${f.modality}`) }); }
          if (f.location) { nextLoc = f.location; chips.push({ k: t("filters.location"), v: f.location }); }
          if (f.q) { effQuery = f.q; setQuery(f.q); }
        }
      }
      setNlChips(chips); setSel(next); setLocation(nextLoc); setPage(1);
      await fetchJobs(next, sort, effQuery, nextLoc, 1);
    });
  }

  function changeSort(s: BoardSort) {
    setSort(s); setPage(1);
    startTransition(() => fetchJobs(sel, s, query, location, 1));
  }

  // Toggle multi-select de una opción de grupo; re-busca desde page 1.
  function toggleOption(group: GroupKey, value: string) {
    const cur = sel[group];
    const next: Sel = { ...sel, [group]: cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value] };
    setSel(next); setPage(1);
    startTransition(() => fetchJobs(next, sort, query, location, 1));
  }

  function clearFilters() {
    const next = emptySel();
    setSel(next); setLocation(""); setNlChips([]); setPage(1);
    startTransition(() => fetchJobs(next, sort, query, "", 1));
  }

  function goPage(pg: number) {
    if (pg < 1 || pg > totalPages || pg === page) return;
    setPage(pg);
    startTransition(() => fetchJobs(sel, sort, query, location, pg));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const selCount = GROUPS.reduce((n, g) => n + sel[g].length, 0);

  // Guardar búsqueda como alerta (puesto/empresa + ubicación, aviso diario).
  async function saveSearch() {
    if (savedSearch) return;
    const criteria: Record<string, unknown> = {};
    if (query.trim()) criteria.q = query.trim();
    if (location.trim()) criteria.location = location.trim();
    if (sel.area.length) criteria.area = sel.area.map(catLabel);
    if (sel.modality.length) criteria.modality = sel.modality.map((m) => t(`modality.${m}`));
    const res = await fetch("/api/board/alerts", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ criteria, frequency: "daily" }),
    });
    if (res.status === 401) { router.push("/cuenta/entrar"); return; }
    if (res.ok) { setSavedSearch(true); flash(t("search.alertCreated")); }
    else flash(t("apply.error"));
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

  const sorts: BoardSort[] = ["relevance", "recent", "salary"];
  // Opciones por grupo: área/modalidad/contrato/empresa de las facetas reales; salario/fecha bandas fijas.
  function groupOptions(g: GroupKey): { value: string; label: string; count?: number }[] {
    if (g === "area") return facets.category.map((f) => ({ value: f.value, label: catLabel(f.value), count: f.count }));
    if (g === "modality") return facets.modality.map((f) => ({ value: f.value, label: t(`modality.${f.value}`), count: f.count }));
    if (g === "contract") return facets.contract.map((f) => ({ value: f.value, label: f.value, count: f.count }));
    if (g === "company") return facets.company.map((f) => ({ value: f.id ?? f.value, label: f.value, count: f.count }));
    if (g === "salary") return SALARY_BANDS.map((b) => ({ value: b.v, label: t(`filters.salaryBand.${b.v}`) }));
    return DATE_BANDS.map((d) => ({ value: d, label: t(`filters.dateBand.${d}`) }));
  }
  // Cabecera SEO: cargo (área) + ciudad activos.
  const activeArea = sel.area[0] ? catLabel(sel.area[0]) : null;
  const activeCity = location.trim() || null;

  return (
    <div style={ROOT}>
      {/* Header — logo + top-nav (Empresas/Alertas/cuenta) en desktop; solo logo+cuenta en mobile */}
      <header style={{ position: "sticky", top: 0, zIndex: 20, background: "rgba(244,240,232,.94)", backdropFilter: "blur(8px)", borderBottom: "1px solid var(--line)", padding: "12px 16px" }}>
        <div className="jb-board-headwrap" style={{ margin: "0 auto", display: "flex", alignItems: "center", gap: 9 }}>
          <Link href="/empleos" style={{ display: "flex", alignItems: "center", gap: 9, color: "var(--ink)" }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "2px 2px 0 var(--ink)", flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 7l8 4 8-4M4 7l8-4 8 4M4 7v10l8 4 8-4V7M12 11v10" stroke="#C6F24E" strokeWidth="2" strokeLinejoin="round" /></svg>
            </div>
            <span style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 16, letterSpacing: "-.5px" }}>
              TalentOS <span style={{ color: "var(--brand)" }}>{t("brand")}</span>
            </span>
          </Link>
          {/* Buscador compacto en la barra superior — solo desktop (mobile lo tiene en el hero) */}
          <div className="jb-topsearch" style={{ flex: 1, maxWidth: 520, alignItems: "center", gap: 9, background: "var(--surface)", border: "2px solid var(--ink)", borderRadius: 11, boxShadow: "2px 2px 0 var(--ink)", padding: "7px 12px" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}><circle cx="11" cy="11" r="7" stroke="var(--soft)" strokeWidth="2" /><path d="M20 20l-3.5-3.5" stroke="var(--soft)" strokeWidth="2" strokeLinecap="round" /></svg>
            <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") runSearch(); }} placeholder={t("search.placeholderTop")} style={{ flex: 1, minWidth: 0, fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14.5, color: "var(--ink)", background: "transparent", border: "none", outline: "none" }} />
            <button onClick={runSearch} disabled={pending} className="jb-hard" style={{ flexShrink: 0, fontFamily: ARCHIVO, fontWeight: 800, fontSize: 13, color: "#fff", background: "var(--accent)", border: "2px solid var(--ink)", borderRadius: 9, padding: "6px 15px", boxShadow: "2px 2px 0 var(--ink)", cursor: "pointer", opacity: pending ? 0.7 : 1 }}>{t("search.submit")}</button>
          </div>
          {/* Nav + cuenta, agrupados a la derecha (nav visible solo en desktop) */}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 20 }}>
            <nav className="jb-topnav" style={{ alignItems: "center", gap: 22 }}>
              <Link href="/empleos/empresas" style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 700, fontSize: 13.5, color: "var(--soft)" }}>{t("nav.companies")}</Link>
              <Link href="/cuenta" style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 700, fontSize: 13.5, color: "var(--soft)" }}>{t("nav.alerts")}</Link>
            </nav>
            {authed ? (
              <Link href="/cuenta" aria-label={t("nav.account")} style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--brand)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "2px 2px 0 var(--ink)", flexShrink: 0 }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="#C6F24E" strokeWidth="2" /><path d="M5 20c1-4 4.5-5 7-5s6 1 7 5" stroke="#C6F24E" strokeWidth="2" strokeLinecap="round" /></svg>
              </Link>
            ) : (
              <Link href="/cuenta/entrar" style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 12, color: "var(--ink)", background: "var(--surface)", border: "1.5px solid var(--ink)", borderRadius: 9, padding: "6px 12px", boxShadow: "2px 2px 0 var(--ink)", flexShrink: 0 }}>
                {t("login")}
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="jb-board-main">
        {/* Hero + búsqueda — SOLO mobile (en desktop el buscador vive en la barra superior) */}
        <div className="jb-hero">
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
          <button onClick={() => setFiltersOpen(true)} className="jb-hard" style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: ARCHIVO, fontWeight: 700, fontSize: 14, color: "var(--ink)", background: "var(--surface)", border: "2px solid var(--ink)", borderRadius: 11, padding: "11px 14px", boxShadow: "3px 3px 0 var(--ink)", cursor: "pointer" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M3 5h18M6 12h12M10 19h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            {t("search.filters")}
            {selCount > 0 && <span style={{ fontFamily: MONO, fontSize: 10, color: "#fff", background: "var(--accent)", borderRadius: 999, padding: "0 6px" }}>{selCount}</span>}
          </button>
        </div>
        </div>{/* /jb-hero */}

        {/* Barra de filtros — solo desktop: chips multi-select con dropdown + conteos */}
        <div className="jb-filterstrip">
          <button onClick={() => setFiltersOpen(true)} className="jb-hard" style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 7, fontFamily: ARCHIVO, fontWeight: 800, fontSize: 13, color: "var(--ink)", background: "var(--bg)", border: "2px solid var(--ink)", borderRadius: 11, padding: "8px 13px", boxShadow: "2px 2px 0 var(--ink)", cursor: "pointer" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M3 5h18M6 12h12M10 19h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>{t("search.allFilters")}
            {selCount > 0 && <span style={{ fontFamily: MONO, fontSize: 10, color: "#fff", background: "var(--accent)", borderRadius: 999, padding: "0 6px" }}>{selCount}</span>}
          </button>
          <span style={{ width: 1, height: 26, background: "var(--line)", flexShrink: 0 }} />
          <div style={{ display: "flex", gap: 8, flex: 1, flexWrap: "wrap" }}>
            {GROUPS.map((g) => {
              const opts = groupOptions(g);
              const on = sel[g].length > 0, open = openGroup === g;
              return (
                <div key={g} data-keep-open style={{ position: "relative" }}>
                  <button onClick={() => setOpenGroup(open ? null : g)} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: on || open ? 700 : 600, fontSize: 12.5, borderRadius: 999, padding: "7px 13px", cursor: "pointer", border: `1.5px solid ${on || open ? "#1A1A17" : "#E7E1D4"}`, background: on || open ? "#DCEFE4" : "#F4F0E8", color: on || open ? "#0E5C4A" : "#54504A" }}>
                    {t(`filters.group.${g}`)}
                    {sel[g].length > 0 && <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: "#fff", background: "var(--brand)", borderRadius: 999, padding: "0 6px" }}>{sel[g].length}</span>}
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" style={{ transform: open ? "rotate(180deg)" : "none" }}><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                  {open && (
                    <div style={{ position: "absolute", top: 42, left: 0, minWidth: 224, background: "var(--surface)", border: "1.5px solid var(--ink)", borderRadius: 12, boxShadow: "5px 5px 0 rgba(26,26,23,.12)", zIndex: 38, padding: 8, maxHeight: 320, overflowY: "auto" }}>
                      {opts.length === 0 ? <div style={{ fontSize: 12.5, color: "var(--soft)", padding: "8px 9px" }}>{t("filters.noOptions")}</div> : opts.map((o) => {
                        const checked = sel[g].includes(o.value);
                        return (
                          <label key={o.value} className="jb-tap" style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 9px", borderRadius: 8, cursor: "pointer" }} onClick={(e) => { e.preventDefault(); toggleOption(g, o.value); }}>
                            <span style={{ width: 18, height: 18, borderRadius: 6, flexShrink: 0, border: `1.5px solid ${checked ? "#1A1A17" : "#CFC7B6"}`, background: checked ? "var(--brand)" : "#FCFAF6", display: "flex", alignItems: "center", justifyContent: "center" }}>{checked && <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5 9-11" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}</span>
                            <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: "#3A3833" }}>{o.label}</span>
                            {o.count != null && <span style={{ fontFamily: MONO, fontSize: 10, color: "var(--soft)" }}>{o.count}</span>}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            {selCount > 0 && <button onClick={clearFilters} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: MONO, fontSize: 11, fontWeight: 700, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: "0 4px" }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>{t("filters.clear")}</button>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, marginLeft: 8 }}>
            <span style={{ fontFamily: MONO, fontSize: 11, color: "var(--soft)" }}>{t("sort.label")}</span>
            {sorts.map((s) => (
              <button key={s} onClick={() => changeSort(s)} style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: sort === s ? 700 : 600, fontSize: 11.5, borderRadius: 999, padding: "5px 11px", cursor: "pointer", border: `1px solid ${sort === s ? "#1A1A17" : "#E7E1D4"}`, background: sort === s ? "#1A1A17" : "#FCFAF6", color: sort === s ? "#fff" : "#79746B" }}>{t(`sort.${s}`)}</button>
            ))}
          </div>
        </div>
        {openGroup && <div onClick={() => setOpenGroup(null)} style={{ position: "fixed", inset: 0, zIndex: 35 }} />}

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
        {/* Breadcrumb + H1 SEO enlazable */}
        <nav style={{ fontFamily: MONO, fontSize: 10, color: "var(--soft)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", paddingTop: 4 }}>
          <Link href="/" style={{ color: "var(--soft)" }}>{t("crumb.home")}</Link> / <Link href="/empleos" style={{ color: "var(--soft)" }}>{t("crumb.jobs")}</Link>
          {activeArea && <> / {sel.area[0] ? <Link href={{ pathname: "/empleos/[categoria]", params: { categoria: sel.area[0] } }} style={{ color: "var(--soft)" }}>{activeArea}</Link> : activeArea}</>}
          {activeCity && <> / <span style={{ color: "var(--ink)" }}>{activeCity}</span></>}
        </nav>
        <h1 style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 21, letterSpacing: "-.6px", lineHeight: 1.2, margin: "9px 0 3px" }}>
          {t("results.count", { count: total })}{(activeArea || activeCity) && " "}
          {activeArea && <>{t("results.ofRole")} <span style={{ color: "var(--brand)" }}>{activeArea}</span></>}
          {activeCity && <>{" "}{t("results.inCity")} <span style={{ color: "var(--brand)" }}>{activeCity}</span></>}
        </h1>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "0 0 12px" }}>
          <span style={{ fontFamily: MONO, fontSize: 11, color: "var(--soft)" }}>{t("results.results", { count: total })}</span>
          <button onClick={saveSearch} className={savedSearch ? undefined : "jb-hard"} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: ARCHIVO, fontWeight: 800, fontSize: 11.5, borderRadius: 10, padding: "6px 11px", cursor: "pointer", ...(savedSearch ? { color: "#0E5C4A", background: "var(--brandSoft)", border: "1.5px solid #1A1A17", boxShadow: "2px 2px 0 var(--ink)" } : { color: "#54504A", background: "var(--surface)", border: "1.5px solid var(--line)" }) }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill={savedSearch ? "#0E5C4A" : "none"}><path d="M6 9a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6Z" stroke={savedSearch ? "#0E5C4A" : "currentColor"} strokeWidth="2" strokeLinejoin="round" /><path d="M10 19a2 2 0 004 0" stroke={savedSearch ? "#0E5C4A" : "currentColor"} strokeWidth="2" /></svg>
            {savedSearch ? t("search.alertActive") : t("search.createAlert")}
          </button>
        </div>
        {/* Sort — visible en mobile (en desktop está en la barra de filtros) */}
        <div className="jb-sort-mobile" style={{ gap: 5, paddingBottom: 8 }}>
          {sorts.map((s) => (
            <button key={s} onClick={() => changeSort(s)} style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: sort === s ? 700 : 600, fontSize: 11.5, borderRadius: 999, padding: "5px 10px", cursor: "pointer", border: `1px solid ${sort === s ? "#1A1A17" : "#E7E1D4"}`, background: sort === s ? "#1A1A17" : "#FCFAF6", color: sort === s ? "#fff" : "#79746B" }}>
              {t(`sort.${s}`)}
            </button>
          ))}
        </div>

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
              <button onClick={() => { setQuery(""); clearFilters(); }} style={{ marginTop: 14, fontFamily: ARCHIVO, fontWeight: 800, fontSize: 13, color: "var(--brand)", background: "none", border: "none", cursor: "pointer" }}>{t("empty.reset")}</button>
            </div>
          )}
         </div>

         {/* Paginación numerada (enlaces reales rastreables ?page=N) */}
         {totalPages > 1 && (
           <nav style={{ display: "flex", flexDirection: "column", gap: 9, alignItems: "center", marginTop: 14 }}>
             <div style={{ display: "flex", gap: 5 }}>
               {pageDefs(page, totalPages).map((pd, i) => pd === "…" ? (
                 <span key={`e${i}`} style={{ fontFamily: MONO, fontSize: 12, color: "#B0AAA0", padding: "0 4px", alignSelf: "center" }}>…</span>
               ) : (
                 <a key={pd} href={`?page=${pd}`} onClick={(e) => { e.preventDefault(); goPage(pd as number); }} style={{ minWidth: 30, height: 30, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 8, fontFamily: MONO, fontSize: 12, fontWeight: 700, textDecoration: "none", cursor: "pointer", border: `1px solid ${pd === page ? "#1A1A17" : "var(--line)"}`, background: pd === page ? "#1A1A17" : "var(--surface)", color: pd === page ? "#fff" : "#54504A" }}>{pd}</a>
               ))}
             </div>
             <span style={{ fontFamily: MONO, fontSize: 9.5, color: "#B0AAA0" }}>{t("results.pageOf", { page, total: totalPages })}</span>
           </nav>
         )}
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
      <BoardTabBar active="search" className="jb-board-tabbar" />

      {/* "Todos los filtros" — bottom-sheet en mobile, modal centrado en desktop. Multi-select
          con contador vivo "Ver N ofertas". */}
      {filtersOpen && (
        <div onClick={() => setFiltersOpen(false)} className="jb-filtermodal" style={{ position: "fixed", inset: 0, zIndex: 45, background: "rgba(26,26,23,.42)", display: "flex", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()} className="jb-filtermodal-panel" style={{ width: "100%", maxWidth: 640, maxHeight: "86%", overflowY: "auto", background: "var(--bg)", border: "2px solid var(--ink)" }}>
            <div style={{ position: "sticky", top: 0, background: "var(--bg)", padding: "14px 18px 10px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 1 }}>
              <span style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 20, letterSpacing: "-.5px" }}>{t("search.allFilters")}</span>
              <button onClick={() => setFiltersOpen(false)} aria-label="close" style={{ width: 34, height: 34, borderRadius: 10, background: "var(--surface)", border: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="var(--ink)" strokeWidth="2.2" strokeLinecap="round" /></svg></button>
            </div>
            <div style={{ padding: "16px 18px 10px", display: "flex", flexDirection: "column", gap: 18 }}>
              {GROUPS.map((g) => {
                const opts = groupOptions(g);
                if (opts.length === 0) return null;
                return (
                  <div key={g}>
                    <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 14, marginBottom: 9 }}>{t(`filters.group.${g}`)}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                      {opts.map((o) => {
                        const checked = sel[g].includes(o.value);
                        return (
                          <button key={o.value} onClick={() => toggleOption(g, o.value)} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: checked ? 700 : 600, fontSize: 13, borderRadius: 999, padding: "8px 13px", cursor: "pointer", border: `1.5px solid ${checked ? "#1A1A17" : "#E7E1D4"}`, background: checked ? "#DCEFE4" : "#FCFAF6", color: checked ? "#0E5C4A" : "#54504A" }}>
                            {o.label}{o.count != null && <span style={{ fontFamily: MONO, fontSize: 9.5, color: checked ? "#0E5C4A" : "var(--soft)" }}>{o.count}</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ position: "sticky", bottom: 0, background: "var(--bg)", borderTop: "1px solid var(--line)", padding: "12px 18px 18px", display: "flex", alignItems: "center", gap: 12 }}>
              {selCount > 0 && <button onClick={clearFilters} style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: "var(--accent)", background: "none", border: "none", cursor: "pointer" }}>{t("filters.clearAll")}</button>}
              <button onClick={() => setFiltersOpen(false)} className="jb-hard" style={{ flex: 1, fontFamily: ARCHIVO, fontWeight: 800, fontSize: 15, color: "#fff", background: "var(--accent)", border: "2px solid var(--ink)", borderRadius: 11, padding: 13, boxShadow: "3px 3px 0 var(--ink)", cursor: "pointer" }}>{t("filters.viewN", { count: total })}</button>
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

