"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { logoFor, formatSalary, relativeDate, jobSlug } from "@/lib/board/format";

const ARCHIVO = "'Archivo',sans-serif";
const MONO = "'Space Mono',monospace";

const ROOT: CSSProperties = {
  "--brand": "#0E5C4A", "--accent": "#F1543F", "--ink": "#1A1A17", "--soft": "#79746B",
  "--line": "#E7E1D4", "--surface": "#FCFAF6", "--bg": "#F4F0E8", "--brandSoft": "#DCEFE4",
  fontFamily: "'Hanken Grotesk',system-ui,sans-serif", color: "#1A1A17", background: "#F4F0E8",
  minHeight: "100vh", WebkitFontSmoothing: "antialiased",
} as CSSProperties;

type Tab = "profile" | "applications" | "saved" | "alerts";
type Job = { id: string; title: string; city: string | null; modality: string | null; salary_min: number | null; salary_max: number | null; salary_currency: string | null; employment_type: string | null; company: { name?: string | null; logo_url?: string | null; slug?: string | null } | null };
type Application = { id: string; created_at: string; fit_score: number | null; job: Job | null };
type Saved = { id: string; created_at: string; job: Job | null };
type Alert = { id: string; criteria: Record<string, unknown>; active: boolean };
type Profile = { full_name?: string | null; headline?: string | null; about?: string | null; phone?: string | null; city?: string | null };
type Completeness = { pct: number; complete: boolean; missing: string[] };

const label = { fontFamily: MONO, fontSize: 10, textTransform: "uppercase" as const, letterSpacing: .5, color: "#79746B", marginBottom: 5, display: "block" };
const input = { width: "100%", fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: "#1A1A17", background: "#FCFAF6", border: "1.5px solid #E7E1D4", borderRadius: 10, padding: "10px 12px", outline: "none" } as CSSProperties;

export function AccountClient({ locale }: { locale: string }) {
  const t = useTranslations("Board");
  const loc = useLocale();
  const [tab, setTab] = useState<Tab>("profile");
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [completeness, setCompleteness] = useState<Completeness | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [saved, setSaved] = useState<Saved[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [alertName, setAlertName] = useState("");

  useEffect(() => {
    (async () => {
      const [p, s, a] = await Promise.all([
        fetch("/api/board/profile").then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch("/api/board/saved").then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch("/api/board/alerts").then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ]);
      if (p) { setProfile(p.profile); setSkills(p.skills ?? []); setCompleteness(p.completeness); setApplications(p.applications ?? []); }
      if (s) setSaved(s.saved ?? []);
      if (a) setAlerts(a.alerts ?? []);
      setLoading(false);
    })();
  }, []);

  async function saveProfile() {
    setSavingEdit(true);
    const body = { ...form, skills: (form.skills ?? "").split(",").map((x) => x.trim()).filter(Boolean) };
    const res = await fetch("/api/board/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    setSavingEdit(false);
    if (res) { setProfile(res.profile); setSkills(res.skills ?? []); setCompleteness(res.completeness); setEditOpen(false); }
  }

  async function createAlert() {
    if (!alertName.trim()) return;
    const res = await fetch("/api/board/alerts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ criteria: { q: alertName.trim() } }) }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    if (res?.alert) { setAlerts((a) => [res.alert, ...a]); setAlertName(""); }
  }

  async function deleteAlert(id: string) {
    await fetch(`/api/board/alerts?id=${id}`, { method: "DELETE" });
    setAlerts((a) => a.filter((x) => x.id !== id));
  }

  async function logout() {
    await createClient().auth.signOut();
    window.location.href = `/${locale}/login`;
  }

  function openEdit() {
    setForm({ full_name: profile?.full_name ?? "", headline: profile?.headline ?? "", about: profile?.about ?? "", phone: profile?.phone ?? "", city: profile?.city ?? "", skills: skills.join(", ") });
    setEditOpen(true);
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "profile", label: t("tabs.profile") },
    { key: "applications", label: t("tabs.applications") },
    { key: "saved", label: t("tabs.saved") },
    { key: "alerts", label: t("tabs.alerts") },
  ];

  return (
    <div style={ROOT}>
      <header style={{ position: "sticky", top: 0, zIndex: 20, background: "rgba(244,240,232,.94)", backdropFilter: "blur(8px)", borderBottom: "1px solid var(--line)", padding: "12px 16px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", alignItems: "center", gap: 9 }}>
          <Link href="/empleos" style={{ display: "flex", alignItems: "center", gap: 9, color: "var(--ink)" }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "2px 2px 0 var(--ink)" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 7l8 4 8-4M4 7l8-4 8 4M4 7v10l8 4 8-4V7M12 11v10" stroke="#C6F24E" strokeWidth="2" strokeLinejoin="round" /></svg>
            </div>
            <span style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 16, letterSpacing: "-.5px" }}>{t("account.title")}</span>
          </Link>
          <button onClick={logout} style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 11, fontWeight: 700, color: "var(--soft)", background: "none", border: "none", cursor: "pointer" }}>{t("account.logout")}</button>
        </div>
      </header>

      {/* Tabs */}
      <div style={{ position: "sticky", top: 53, zIndex: 19, background: "var(--bg)", borderBottom: "1px solid var(--line)" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", gap: 4, padding: "0 12px", overflowX: "auto" }}>
          {tabs.map((tb) => (
            <button key={tb.key} onClick={() => setTab(tb.key)} style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 13, color: tab === tb.key ? "var(--ink)" : "var(--soft)", background: "none", border: "none", borderBottom: `2px solid ${tab === tb.key ? "var(--ink)" : "transparent"}`, padding: "13px 10px", cursor: "pointer", whiteSpace: "nowrap" }}>{tb.label}</button>
          ))}
        </div>
      </div>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "20px 16px 60px" }}>
        {loading ? (
          <div style={{ textAlign: "center", color: "var(--soft)", padding: 40, fontSize: 14 }}>…</div>
        ) : tab === "profile" ? (
          <>
            {completeness && !completeness.complete && (
              <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, padding: 16, marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 14 }}>{t("account.completeness", { pct: completeness.pct })}</span>
                  <span style={{ fontFamily: MONO, fontSize: 12, color: "var(--brand)" }}>{completeness.pct}%</span>
                </div>
                <div style={{ height: 7, background: "var(--bg)", borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ width: `${completeness.pct}%`, height: "100%", background: "var(--brand)" }} />
                </div>
                <div style={{ fontSize: 12.5, color: "var(--soft)", marginTop: 9, lineHeight: 1.45 }}>{t("account.completeHint")}</div>
              </div>
            )}
            <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                <div>
                  <div style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 20, letterSpacing: "-.5px" }}>{profile?.full_name || "—"}</div>
                  {profile?.headline && <div style={{ fontSize: 13.5, color: "var(--soft)", marginTop: 2 }}>{profile.headline}</div>}
                  {profile?.city && <div style={{ fontFamily: MONO, fontSize: 11, color: "var(--soft)", marginTop: 4 }}>{profile.city}</div>}
                </div>
                <button onClick={openEdit} className="jb-hard" style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 12.5, color: "var(--ink)", background: "var(--surface)", border: "2px solid var(--ink)", borderRadius: 10, padding: "7px 14px", boxShadow: "2px 2px 0 var(--ink)", cursor: "pointer" }}>{t("account.edit")}</button>
              </div>
              {profile?.about && <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "#3A3833", margin: "0 0 14px" }}>{profile.about}</p>}
              {skills.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {skills.map((s) => <span key={s} style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: "#54504A", background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 7, padding: "4px 9px" }}>{s}</span>)}
                </div>
              )}
            </div>
          </>
        ) : tab === "applications" ? (
          applications.length === 0
            ? <Empty text={t("account.emptyApplications")} cta={t("account.browse")} />
            : <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{applications.map((a) => <JobRow key={a.id} job={a.job} meta={`${t("account.appliedOn", { date: relativeDate(a.created_at, loc) })}${a.fit_score != null ? ` · ${t("account.fit", { score: a.fit_score })}` : ""}`} locale={loc} />)}</div>
        ) : tab === "saved" ? (
          saved.length === 0
            ? <Empty text={t("account.emptySaved")} cta={t("account.browse")} />
            : <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{saved.map((s) => <JobRow key={s.id} job={s.job} meta={s.job ? formatSalary(s.job, loc) : ""} locale={loc} />)}</div>
        ) : (
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <input value={alertName} onChange={(e) => setAlertName(e.target.value)} placeholder={t("account.alertName")} style={input} onKeyDown={(e) => { if (e.key === "Enter") createAlert(); }} />
              <button onClick={createAlert} className="jb-hard" style={{ flexShrink: 0, fontFamily: ARCHIVO, fontWeight: 800, fontSize: 13, color: "#fff", background: "var(--accent)", border: "2px solid var(--ink)", borderRadius: 10, padding: "0 16px", boxShadow: "2px 2px 0 var(--ink)", cursor: "pointer" }}>{t("account.createAlert")}</button>
            </div>
            {alerts.length === 0
              ? <Empty text={t("account.emptyAlerts")} />
              : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{alerts.map((al) => (
                  <div key={al.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, padding: "12px 14px" }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600 }}>{String((al.criteria as { q?: string }).q ?? Object.values(al.criteria).join(", "))}</span>
                    <button onClick={() => deleteAlert(al.id)} style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: "var(--accent)", background: "none", border: "none", cursor: "pointer" }}>{t("account.delete")}</button>
                  </div>
                ))}</div>}
          </div>
        )}
      </main>

      {/* Edit profile modal */}
      {editOpen && (
        <div onClick={() => !savingEdit && setEditOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(26,26,23,.45)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 560, maxHeight: "90%", overflowY: "auto", background: "var(--bg)", borderRadius: "22px 22px 0 0", borderTop: "2px solid var(--ink)", padding: "18px 20px 24px" }}>
            <div style={{ width: 38, height: 4, borderRadius: 999, background: "#CFC7B6", margin: "0 auto 14px" }} />
            <div style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 19, letterSpacing: "-.5px", marginBottom: 16 }}>{t("account.editProfile")}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {([["full_name", "fullName"], ["headline", "headline"], ["phone", "phone"], ["city", "city"]] as const).map(([k, lbl]) => (
                <div key={k}><label style={label}>{t(`account.${lbl}`)}</label><input value={form[k] ?? ""} onChange={(e) => setForm({ ...form, [k]: e.target.value })} style={input} /></div>
              ))}
              <div><label style={label}>{t("account.about")}</label><textarea value={form.about ?? ""} onChange={(e) => setForm({ ...form, about: e.target.value })} rows={3} style={{ ...input, resize: "vertical" }} /></div>
              <div><label style={label}>{t("account.skills")}</label><input value={form.skills ?? ""} onChange={(e) => setForm({ ...form, skills: e.target.value })} style={input} /></div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={() => setEditOpen(false)} disabled={savingEdit} style={{ fontFamily: ARCHIVO, fontWeight: 700, fontSize: 14, color: "var(--soft)", background: "transparent", border: "1.5px solid var(--line)", borderRadius: 11, padding: "12px 18px", cursor: "pointer" }}>{t("account.cancel")}</button>
              <button onClick={saveProfile} disabled={savingEdit} className="jb-hard" style={{ flex: 1, fontFamily: ARCHIVO, fontWeight: 800, fontSize: 15, color: "#fff", background: "var(--brand)", border: "2px solid var(--ink)", borderRadius: 12, padding: 13, boxShadow: "3px 3px 0 var(--ink)", cursor: "pointer" }}>{savingEdit ? t("account.saving") : t("account.save")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Empty({ text, cta }: { text: string; cta?: string }) {
  return (
    <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--soft)" }}>
      <div style={{ fontSize: 14, lineHeight: 1.5, marginBottom: cta ? 14 : 0 }}>{text}</div>
      {cta && <Link href="/empleos" style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 13, color: "var(--brand)" }}>{cta} →</Link>}
    </div>
  );
}

function JobRow({ job, meta, locale }: { job: Job | null; meta: string; locale: string }) {
  if (!job) return null;
  const logo = logoFor(job.company?.name);
  return (
    <Link href={{ pathname: "/empleos/oferta/[slug]", params: { slug: jobSlug(job) } }} style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 13, padding: 13, color: "inherit" }} className="jb-job">
      <span style={{ width: 40, height: 40, borderRadius: 11, background: logo.bg, color: logo.color, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: ARCHIVO, fontWeight: 900, fontSize: 14, flexShrink: 0 }}>{logo.initials}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: MONO, fontSize: 10, color: "var(--soft)" }}>{job.company?.name}{job.city ? ` · ${job.city}` : ""}</div>
        <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 14, letterSpacing: "-.2px", lineHeight: 1.15, marginTop: 2 }}>{job.title}</div>
        {meta && <div style={{ fontFamily: MONO, fontSize: 10.5, color: "var(--brand)", marginTop: 3 }}>{meta}</div>}
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}><path d="M9 6l6 6-6 6" stroke="var(--soft)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </Link>
  );
}
