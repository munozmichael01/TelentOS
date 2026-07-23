"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { ARCHIVO, MONO, MonoLabel, CompanyLogo, ModalityTag } from "@/components/board/ui";
import { formatSalary, jobSlug } from "@/lib/board/format";

const PERIODS = ["hour", "day", "week", "month", "year"];

// Icono bookmark (guardar) — SVG de línea del DS. Trazo tinta, relleno verde al guardar.
function BookmarkIcon({ saved }: { saved: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={saved ? "#0E5C4A" : "none"}>
      <path d="M6 4h12v17l-6-4-6 4V4Z" stroke={saved ? "#0E5C4A" : "#1A1A17"} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

// Detalle de la oferta renderizado INLINE en el panel derecho del split (desktop).
// Es autocontenido: pide /api/board/offer/[id] al cambiar jobId, muestra skeleton, y
// resuelve el aplicar (1-toque vs wizard) igual que JobApplyBar. Reutiliza las primitivas
// del DS del board — mismo lenguaje visual que la página de oferta.
type PanelJob = {
  id: string; title: string; description: string | null; city: string | null; country_code: string | null;
  location: string | null; modality: string | null; salary_min: number | null; salary_max: number | null;
  salary_currency: string | null; salary_period: string | null; employment_type: string | null; created_at: string;
  education_level: string | null; seniority_level: string | null; experience_min_years: number | null;
  company: { id: string; name: string; slug: string | null; logo_url: string | null } | null;
};
type PanelData = { job: PanelJob; skills: { name: string; requirement: "excluyente" | "deseable" }[]; hasRequiredScreening: boolean };

const CAP = (s: string | null) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");

export function OfferDetailPanel({ jobId, locale }: { jobId: string; locale: string }) {
  const t = useTranslations("Board");
  const router = useRouter();
  const [data, setData] = useState<PanelData | null>(null);
  const [loading, setLoading] = useState(true);
  const reqSeq = useRef(0);

  // Estado de guardar — se reinicia con cada oferta. El detalle desktop NO aplica en
  // 1-toque (la conversión de 1-toque vive en la card de la lista, según el mockup): la
  // barra sticky y el CTA inline enlazan siempre al flujo Apply.
  const [saved, setSaved] = useState(false);
  // Preferencias del candidato (solo logueado) para el tile "Match para ti N de 4".
  const [prefs, setPrefs] = useState<{ pref_modality?: string[] | null; pref_locations?: string[] | null; pref_salary_min?: number | null; headline?: string | null; city?: string | null } | null>(null);

  useEffect(() => {
    const seq = ++reqSeq.current;
    setLoading(true); setData(null);
    setSaved(false); setPrefs(null);
    fetch(`/api/board/offer/${jobId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: PanelData | null) => {
        if (seq !== reqSeq.current) return; // respuesta obsoleta (cambió la selección)
        setData(d); setLoading(false);
        // Perfil (si hay sesión): alimenta el match de preferencias del tile.
        if (d) {
          fetch("/api/board/profile").then((r) => (r.ok ? r.json() : null)).then((p) => {
            if (seq !== reqSeq.current || !p) return;
            if (p.profile) setPrefs(p.profile);
          }).catch(() => {});
        }
      })
      .catch(() => { if (seq === reqSeq.current) setLoading(false); });
  }, [jobId]);

  async function toggleSave() {
    const next = !saved;
    setSaved(next);
    const res = next
      ? await fetch("/api/board/saved", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobId }) })
      : await fetch(`/api/board/saved?jobId=${jobId}`, { method: "DELETE" });
    if (res.status === 401) { setSaved(false); router.push("/cuenta/entrar"); }
    else if (!res.ok) setSaved(!next);
  }

  if (loading) return <PanelSkeleton t={t} />;
  if (!data) return (
    <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--soft)" }}>
      <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 16, color: "var(--ink)", marginBottom: 6 }}>{t("empty.title")}</div>
      <div style={{ fontSize: 13.5 }}>{t("empty.desc")}</div>
    </div>
  );

  const { job, skills } = data;
  const salary = formatSalary(job, locale);
  const slug = jobSlug(job);
  // Unidad/periodo del salario ("USD / mes") — mockup del tile de salario.
  const salaryPeriod = job.salary_period && PERIODS.includes(job.salary_period) ? job.salary_period : "month";
  const salaryUnit = `${job.salary_currency || "USD"} / ${t(`detail.period.${salaryPeriod}`)}`;
  const applyHref = { pathname: "/empleos/oferta/[slug]/aplicar" as const, params: { slug } };

  // "Match para ti N de 4": preferencias cumplidas (modalidad · ubicación · salario · rol).
  // Solo si hay sesión con alguna preferencia definida; anónimo no lo ve (mockup).
  const match = (() => {
    if (!prefs) return null;
    const hasAny = (prefs.pref_modality?.length || prefs.pref_locations?.length || prefs.pref_salary_min || prefs.headline);
    if (!hasAny) return null;
    const lc = (s?: string | null) => (s ?? "").toLowerCase();
    let n = 0;
    if (prefs.pref_modality?.some((m) => lc(m) === lc(job.modality))) n++;
    const locs = (prefs.pref_locations?.length ? prefs.pref_locations : [prefs.city]).filter(Boolean) as string[];
    if (locs.some((l) => lc(job.city).includes(lc(l)) || lc(l).includes(lc(job.city)))) n++;
    if (prefs.pref_salary_min != null && (job.salary_max ?? 0) >= prefs.pref_salary_min) n++;
    const headToks = lc(prefs.headline).split(/[^a-záéíóúñ0-9]+/).filter((w) => w.length > 3);
    if (headToks.some((w) => lc(job.title).includes(w))) n++;
    return { n, total: 4 };
  })();
  const reqs: string[] = [];
  if ((job.experience_min_years ?? 0) > 0) reqs.push(t("detail.reqExperience", { years: job.experience_min_years! }));
  if (job.education_level) reqs.push(t("detail.reqEducation", { level: CAP(job.education_level) }));
  if (job.seniority_level) reqs.push(t("detail.reqSeniority", { level: CAP(job.seniority_level) }));

  const applyBtn = { flexShrink: 0, textAlign: "center" as const, fontFamily: ARCHIVO, fontWeight: 800, fontSize: 14.5, color: "#fff", background: "var(--accent)", border: "2px solid var(--ink)", borderRadius: 11, padding: "12px 30px", boxShadow: "3px 3px 0 var(--ink)", textDecoration: "none", cursor: "pointer" } as const;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Cuerpo scrolleable */}
      <div style={{ flex: 1, overflowY: "auto", padding: "22px 24px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 13, marginBottom: 14 }}>
          <CompanyLogo name={job.company?.name} logoUrl={job.company?.logo_url} size={52} />
          <div style={{ flex: 1, minWidth: 0 }}>
            {job.company?.slug
              ? <Link href={{ pathname: "/empleos/empresa/[slug]", params: { slug: job.company.slug } }} style={{ fontFamily: MONO, fontSize: 12, color: "var(--brand)", fontWeight: 700 }}>{job.company.name} →</Link>
              : <div style={{ fontFamily: MONO, fontSize: 12, color: "var(--brand)", fontWeight: 700 }}>{job.company?.name}</div>}
            <h2 style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 23, lineHeight: 1.06, letterSpacing: "-.7px", margin: "3px 0 0" }}>{job.title}</h2>
          </div>
          {/* Guardar (bookmark) grande hard-shadow — mockup desktop, esquina superior derecha */}
          <button onClick={toggleSave} aria-label={t("detail.save")} className="jb-hard" style={{ flexShrink: 0, width: 46, height: 46, borderRadius: 11, background: "var(--surface)", border: "2px solid var(--ink)", boxShadow: "3px 3px 0 var(--ink)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <BookmarkIcon saved={saved} />
          </button>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 16 }}>
          {job.city && <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: "#54504A", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 9, padding: "6px 10px" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 21s7-6 7-12a7 7 0 10-14 0c0 6 7 12 7 12Z" stroke="var(--soft)" strokeWidth="2" strokeLinejoin="round" /><circle cx="12" cy="9" r="2.4" stroke="var(--soft)" strokeWidth="2" /></svg>{job.city}
          </span>}
          {job.modality && <ModalityTag modality={job.modality} label={t(`modality.${job.modality}`)} />}
          {job.employment_type && <span style={{ fontSize: 12, fontWeight: 600, color: "#54504A", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 9, padding: "6px 10px" }}>{job.employment_type}</span>}
        </div>

        {(salary || match) && (
          <div style={{ display: "grid", gridTemplateColumns: match && salary ? "1fr 1fr" : "1fr", gap: 12, marginBottom: 16 }}>
            {salary && (
              <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, padding: "14px 15px" }}>
                <MonoLabel style={{ fontSize: 9.5 }}>{t("detail.salary")}</MonoLabel>
                <div style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 19, letterSpacing: "-.4px", color: "var(--brand)", marginTop: 3 }}>{salary}</div>
                <div style={{ fontSize: 12, color: "var(--soft)", marginTop: 2 }}>{salaryUnit}</div>
              </div>
            )}
            {/* Match de preferencias — solo candidato logueado con preferencias */}
            {match && (
              <div style={{ background: "var(--brandSoft)", border: "1px solid #BEE0CE", borderRadius: 14, padding: "14px 15px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: MONO, fontSize: 9.5, textTransform: "uppercase", letterSpacing: .5, color: "var(--brand)" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2Z" stroke="var(--brand)" strokeWidth="1.7" strokeLinejoin="round" /></svg>
                  {t("detail.matchLabel")}
                </div>
                <div style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 19, letterSpacing: "-.4px", color: "var(--brand)", marginTop: 3 }}>{t("detail.matchValue", { n: match.n, total: match.total })}</div>
                <div style={{ fontFamily: MONO, fontSize: 9.5, color: "#2C5247", marginTop: 2 }}>{t("detail.matchSub")}</div>
              </div>
            )}
          </div>
        )}

        {/* CTA de aplicar dentro del detalle (sin scroll), además de la barra inferior.
            Enlaza siempre al flujo Apply — el detalle desktop no tiene 1-toque (mockup). */}
        <Link href={applyHref} className="jb-hard" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: ARCHIVO, fontWeight: 800, fontSize: 15, color: "#fff", background: "var(--accent)", border: "2px solid var(--ink)", borderRadius: 11, padding: 14, boxShadow: "3px 3px 0 var(--ink)", cursor: "pointer", marginBottom: 18, textDecoration: "none" }}>
          {t("detail.applyInline")}
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </Link>

        {job.description && <>
          <SectionHeading>{t("detail.about")}</SectionHeading>
          <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "#3A3833", margin: "0 0 18px", whiteSpace: "pre-wrap" }}>{job.description}</p>
        </>}

        {reqs.length > 0 && <>
          <SectionHeading>{t("detail.looking")}</SectionHeading>
          <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 18 }}>
            {reqs.map((r, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10" fill="var(--brandSoft)" /><path d="M8 12.5l2.5 2.5 5-5.5" stroke="var(--brand)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <span style={{ fontSize: 14, lineHeight: 1.5, color: "#3A3833" }}>{r}</span>
              </div>
            ))}
          </div>
        </>}

        {skills.length > 0 && <>
          <SectionHeading>{t("detail.skills")}</SectionHeading>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {skills.map((s) => (
              <span key={s.name} title={s.requirement === "excluyente" ? t("detail.required") : t("detail.desirable")} style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: s.requirement === "excluyente" ? "#0E5C4A" : "#54504A", background: s.requirement === "excluyente" ? "var(--brandSoft)" : "var(--surface)", border: `1px solid ${s.requirement === "excluyente" ? "#BEE0CE" : "var(--line)"}`, borderRadius: 8, padding: "6px 11px" }}>{s.name}</span>
            ))}
          </div>
        </>}
      </div>

      {/* Barra sticky inferior — título+meta a la izquierda, guardar (bookmark) y "Aplicar →"
          (coral). El detalle desktop no aplica en 1-toque (mockup). */}
      <div style={{ borderTop: "1px solid var(--line)", background: "rgba(252,250,246,.96)", padding: "14px 24px", display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{job.title}</div>
          <div style={{ fontFamily: MONO, fontSize: 10.5, color: "var(--soft)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {[job.company?.name, job.modality && t(`modality.${job.modality}`), salary].filter(Boolean).join(" · ")}
          </div>
        </div>
        <button onClick={toggleSave} aria-label={t("detail.save")} className="jb-hard" style={{ width: 46, height: 46, flexShrink: 0, borderRadius: 11, background: "var(--surface)", border: "2px solid var(--ink)", boxShadow: "3px 3px 0 var(--ink)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <BookmarkIcon saved={saved} />
        </button>
        <Link href={applyHref} className="jb-hard" style={applyBtn}>{t("detail.apply")} →</Link>
      </div>
    </div>
  );
}

// Encabezado de sección del detalle desktop (Archivo 900 17px) — mockup.
function SectionHeading({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 17, marginBottom: 10 }}>{children}</div>;
}

function PanelSkeleton({ t }: { t: ReturnType<typeof useTranslations> }) {
  const bar = (w: number | string, h: number, mt = 0) => (
    <div style={{ width: w, height: h, marginTop: mt, borderRadius: 7, background: "linear-gradient(90deg,#EDE8DD,#F4F0E8,#EDE8DD)", backgroundSize: "200% 100%", animation: "jbShimmer 1.2s infinite" }} />
  );
  return (
    <div style={{ padding: "22px 24px" }}>
      <div style={{ display: "flex", gap: 13, marginBottom: 18 }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, flexShrink: 0, background: "linear-gradient(90deg,#EDE8DD,#F4F0E8,#EDE8DD)", backgroundSize: "200% 100%", animation: "jbShimmer 1.2s infinite" }} />
        <div style={{ flex: 1 }}>{bar(120, 11)}{bar("80%", 22, 8)}</div>
      </div>
      {bar(180, 12)}
      {bar("100%", 58, 14)}
      {bar(90, 11, 18)}
      {bar("100%", 13, 10)}{bar("96%", 13, 7)}{bar("88%", 13, 7)}{bar("70%", 13, 7)}
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 26, fontFamily: MONO, fontSize: 11, color: "var(--soft)" }}>
        <span style={{ width: 15, height: 15, border: "2px solid #D8D1C2", borderTopColor: "var(--brand)", borderRadius: "50%", display: "inline-block", animation: "jbSpin .8s linear infinite" }} />
        {t("detail.loading")}
      </div>
    </div>
  );
}
