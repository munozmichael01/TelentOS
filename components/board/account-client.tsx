"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatSalary, jobSlug, relativeDate } from "@/lib/board/format";
import { BoardTabBar } from "@/components/board/tab-bar";
import { CityAutocomplete } from "@/components/board/city-autocomplete";
import { AiTag, ARCHIVO, BoardField, BoardRoot, Chip, CompanyLogo, HardButton, MONO, MonoLabel, inputStyle } from "@/components/board/ui";

type Tab = "profile" | "applications" | "saved" | "alerts";
type Job = { id: string; title: string; city: string | null; modality: string | null; salary_min: number | null; salary_max: number | null; salary_currency: string | null; employment_type: string | null; company: { name?: string | null; logo_url?: string | null; slug?: string | null } | null };
type AppStage = { name: string | null; order_index?: number | null; is_terminal?: boolean | null };
type AppFeedback = { reason: string; created_at: string } | null;
type Application = { id: string; created_at: string; fit_score: number | null; status?: "open" | "hired" | "rejected" | string | null; stage?: AppStage | null; pipeline?: AppStage[]; feedback?: AppFeedback; job: Job | null };
type ApplicationTimelineEvent = { type?: string | null; from_stage?: string | null; to_stage?: string | null; reason?: string | null; created_at: string };
type ApplicationDetail = { application: Application; timeline: ApplicationTimelineEvent[] };
type Saved = { id: string; created_at: string; job: Job | null };
type Alert = { id: string; criteria: Record<string, unknown>; active: boolean; frequency?: string; match_count?: number; created_at?: string | null };
type Experience = { title?: string | null; company?: string | null; seniority?: string | null; start_date?: string | null; end_date?: string | null; is_current?: boolean | null };
type Education = { degree?: string | null; institution?: string | null; field?: string | null; level?: string | null; start_year?: number | null; end_year?: number | null };
type Language = { language?: string | null; level?: string | null };
type LinkItem = { type: string; url: string; label?: string | null };
type Sourced = { experiences?: Experience[]; education?: Education[]; languages?: Language[]; skills?: string[]; first_name?: string | null; last_name?: string | null; phone?: string | null; city?: string | null; country_code?: string | null; cv_url?: string | null };
type Profile = { full_name?: string | null; first_name?: string | null; last_name?: string | null; email?: string | null; headline?: string | null; about?: string | null; phone?: string | null; city?: string | null; country_code?: string | null; pref_salary_min?: number | null; pref_currency?: string | null; pref_modality?: string[] | null; pref_locations?: string[] | null; pref_contract?: string[] | null; experiences?: Experience[] | null; education?: Education[] | null; languages?: Language[] | null; links?: LinkItem[] | null; avatar_url?: string | null };
type ItemType = "exp" | "edu" | "lang" | "link";
type Completeness = { pct: number; complete: boolean; missing: string[] };

type FormState = { first_name: string; last_name: string; headline: string; about: string; phone: string; city: string; country_code: string; pref_salary_min: string; pref_currency: string; pref_modality: string; pref_locations: string; pref_contract: string; skills: string };

const pageStyle: CSSProperties = { maxWidth: 720, margin: "0 auto", padding: "16px 16px 84px" };
const cardStyle: CSSProperties = { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, padding: 14 };
const sheetHandle: CSSProperties = { width: 38, height: 4, borderRadius: 999, background: "#CFC7B6", margin: "0 auto 12px" };

export function AccountClient({ locale }: { locale: string }) {
  const t = useTranslations("Board");
  const loc = useLocale();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("profile");
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sourced, setSourced] = useState<Sourced>({});
  const [skills, setSkills] = useState<string[]>([]);
  const [completeness, setCompleteness] = useState<Completeness | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [saved, setSaved] = useState<Saved[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertOn, setAlertOn] = useState<Record<string, boolean>>({});
  const [editOpen, setEditOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newAlertOpen, setNewAlertOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [savingEdit, setSavingEdit] = useState(false);
  const [alertName, setAlertName] = useState("");
  const [alertFreq, setAlertFreq] = useState("daily");
  const [prefsOn, setPrefsOn] = useState({ email: true, push: true, digest: false, visible: true });
  const [detailId, setDetailId] = useState<string | null>(null);
  const [appDetail, setAppDetail] = useState<ApplicationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  // Arrays editables (persisten en el perfil). Se siembran del perfil guardado o, si aún
  // no hay, de lo parseado del CV (sourced). El primer add/edit los persiste como propios.
  const [exp, setExp] = useState<Experience[]>([]);
  const [edu, setEdu] = useState<Education[]>([]);
  const [langs, setLangs] = useState<Language[]>([]);
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [editor, setEditor] = useState<{ type: ItemType; index: number | null } | null>(null);

  useEffect(() => {
    (async () => {
      const [p, s, a] = await Promise.all([
        fetch("/api/board/profile").then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch("/api/board/saved").then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch("/api/board/alerts").then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ]);
      if (p) {
        setProfile(p.profile); setSourced(p.sourced ?? {}); setSkills((p.skills?.length ? p.skills : p.sourced?.skills) ?? []); setCompleteness(p.completeness); setApplications(p.applications ?? []);
        const seed = <T,>(own?: T[] | null, cv?: T[] | null) => (own && own.length ? own : cv ?? []);
        setExp(seed<Experience>(p.profile?.experiences, p.sourced?.experiences));
        setEdu(seed<Education>(p.profile?.education, p.sourced?.education));
        setLangs(seed<Language>(p.profile?.languages, p.sourced?.languages));
        setLinks(Array.isArray(p.profile?.links) ? p.profile.links : []);
        setAvatarUrl(p.profile?.avatar_url ?? null);
        if (p.profile) setPrefsOn({ email: p.profile.notify_email !== false, push: p.profile.notify_push !== false, digest: !!p.profile.notify_digest, visible: p.profile.profile_visible !== false });
      }
      if (s) setSaved(s.saved ?? []);
      if (a) { setAlerts(a.alerts ?? []); setAlertOn(Object.fromEntries(((a.alerts ?? []) as Alert[]).map((x) => [x.id, x.active !== false]))); }
      setLoading(false);
    })();
  }, []);

  // Persiste un cambio parcial del perfil y refresca completitud.
  async function persistProfile(patch: Record<string, unknown>) {
    const res = await fetch("/api/board/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    if (res) { setProfile(res.profile); setCompleteness(res.completeness); }
  }
  const ITEM_META = { exp: { arr: exp, set: setExp, field: "experiences" }, edu: { arr: edu, set: setEdu, field: "education" }, lang: { arr: langs, set: setLangs, field: "languages" }, link: { arr: links, set: setLinks, field: "links" } } as const;
  function saveItem(type: ItemType, index: number | null, draft: Record<string, unknown>) {
    const m = ITEM_META[type];
    const next = index == null ? [...m.arr, draft] : m.arr.map((x, i) => (i === index ? draft : x));
    (m.set as (v: unknown[]) => void)(next);
    setEditor(null);
    persistProfile({ [m.field]: next });
  }
  function removeItem(type: ItemType, index: number) {
    const m = ITEM_META[type];
    const next = m.arr.filter((_, i) => i !== index);
    (m.set as (v: unknown[]) => void)(next);
    persistProfile({ [m.field]: next });
  }

  const display = useMemo(() => buildDisplay(profile, sourced, skills), [profile, sourced, skills]);

  function openEdit() {
    setForm({
      first_name: profile?.first_name ?? sourced.first_name ?? splitName(profile?.full_name).first,
      last_name: profile?.last_name ?? sourced.last_name ?? splitName(profile?.full_name).last,
      headline: profile?.headline ?? "",
      about: profile?.about ?? "",
      phone: profile?.phone ?? sourced.phone ?? "",
      city: profile?.city ?? sourced.city ?? "",
      country_code: profile?.country_code ?? sourced.country_code ?? defaultCountry(locale),
      pref_salary_min: profile?.pref_salary_min != null ? String(profile.pref_salary_min) : "",
      pref_currency: profile?.pref_currency ?? "USD",
      pref_modality: (profile?.pref_modality ?? []).join(", "),
      pref_locations: (profile?.pref_locations ?? []).join(", "),
      pref_contract: (profile?.pref_contract ?? []).join(", "),
      skills: display.skills.join(", "),
    });
    setEditOpen(true);
  }

  async function saveProfile() {
    setSavingEdit(true);
    const first = form.first_name.trim();
    const last = form.last_name.trim();
    const salary = Number(form.pref_salary_min.replace(/[^0-9.]/g, ""));
    const body = {
      first_name: first,
      last_name: last,
      full_name: [first, last].filter(Boolean).join(" "),
      headline: form.headline,
      about: form.about,
      phone: form.phone,
      city: form.city,
      country_code: form.country_code,
      pref_salary_min: Number.isFinite(salary) && salary > 0 ? salary : null,
      pref_currency: form.pref_currency || "USD",
      pref_modality: splitList(form.pref_modality),
      pref_locations: splitList(form.pref_locations),
      pref_contract: splitList(form.pref_contract),
      skills: splitList(form.skills),
    };
    const res = await fetch("/api/board/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    setSavingEdit(false);
    if (res) { setProfile(res.profile); setSkills(res.skills ?? []); setCompleteness(res.completeness); setEditOpen(false); }
  }

  async function createAlert() {
    if (!alertName.trim()) return;
    const res = await fetch("/api/board/alerts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ criteria: { q: alertName.trim() }, frequency: alertFreq }) }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    if (res?.alert) { setAlerts((a) => [res.alert, ...a]); setAlertOn((m) => ({ ...m, [res.alert.id]: true })); setAlertName(""); setNewAlertOpen(false); }
  }

  async function openApplicationDetail(id: string) {
    setDetailId(id);
    setDetailLoading(true);
    const res = await fetch(`/api/board/applications/${encodeURIComponent(id)}`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    setDetailLoading(false);
    if (res) setAppDetail(res);
  }

  function closeApplicationDetail() {
    setDetailId(null);
    setAppDetail(null);
    setDetailLoading(false);
  }

  async function removeSaved(row: Saved) {
    if (!row.job?.id) return;
    await fetch(`/api/board/saved?jobId=${encodeURIComponent(row.job.id)}`, { method: "DELETE" });
    setSaved((rows) => rows.filter((x) => x.id !== row.id));
  }

  async function deleteAlert(id: string) {
    await fetch(`/api/board/alerts?id=${id}`, { method: "DELETE" });
    setAlerts((a) => a.filter((x) => x.id !== id));
  }

  async function toggleAlert(id: string, next: boolean) {
    setAlertOn((m) => ({ ...m, [id]: next })); // optimista
    const r = await fetch("/api/board/alerts", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, active: next }) });
    if (!r.ok) setAlertOn((m) => ({ ...m, [id]: !next })); // revertir si falla
  }

  const PREF_FIELD = { email: "notify_email", push: "notify_push", digest: "notify_digest", visible: "profile_visible" } as const;
  async function savePref(key: keyof typeof PREF_FIELD, next: boolean) {
    setPrefsOn((p) => ({ ...p, [key]: next })); // optimista, persiste en el perfil
    fetch("/api/board/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [PREF_FIELD[key]]: next }) }).catch(() => {});
  }

  async function logout() {
    await createClient().auth.signOut();
    router.push("/cuenta/entrar");
    router.refresh();
  }

  const actionCount = applications.filter((a) => statusStyle(a).kind === "action").length;
  const content = loading ? <div style={{ textAlign: "center", color: "var(--soft)", padding: 44, fontSize: 14 }}>...</div> : (
    <>
      {tab === "profile" && <ProfileTab display={display} completeness={completeness} exp={exp} edu={edu} langs={langs} links={links} avatarUrl={avatarUrl} onEdit={openEdit} onSettings={() => setSettingsOpen(true)} onAddItem={(ty) => setEditor({ type: ty, index: null })} onEditItem={(ty, i) => setEditor({ type: ty, index: i })} onRemoveItem={removeItem} onAvatar={setAvatarUrl} onSkills={(next) => { setSkills(next); persistProfile({ skills: next }); }} onCv={() => { fetch("/api/board/profile").then((r) => (r.ok ? r.json() : null)).then((p) => { if (p) { setSourced(p.sourced ?? {}); setCompleteness(p.completeness); } }); }} t={t} loc={loc} />}
      {tab === "applications" && <ApplicationsTracker t={t} applications={applications} loc={loc} onOpen={openApplicationDetail} />}
      {tab === "saved" && <SavedTab saved={saved} onRemove={removeSaved} t={t} loc={loc} />}
      {tab === "alerts" && <AlertsTab alerts={alerts} alertOn={alertOn} onToggle={toggleAlert} onNew={() => setNewAlertOpen(true)} onDelete={deleteAlert} t={t} />}
    </>
  );

  return (
    <BoardRoot>
      {/* Top bar — solo desktop (mockup): logo + CTA "Buscar ofertas" */}
      <div className="jb-acct-topbar" style={{ height: 64, flexShrink: 0, alignItems: "center", gap: 14, background: "var(--surface)", borderBottom: "1px solid var(--line)", padding: "0 26px" }}>
        <Link href="/empleos" style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--ink)" }}>
          <span style={{ width: 36, height: 36, borderRadius: 8, background: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "2px 2px 0 var(--ink)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 7l8 4 8-4M4 7l8-4 8 4M4 7v10l8 4 8-4V7M12 11v10" stroke="#C6F24E" strokeWidth="2" strokeLinejoin="round" /></svg>
          </span>
          <span style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 18, letterSpacing: "-.5px" }}>TalentOS <span style={{ color: "var(--brand)" }}>{t("brand")}</span></span>
        </Link>
        <span style={{ flex: 1 }} />
        <Link href="/empleos" className="jb-hard" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: ARCHIVO, fontWeight: 800, fontSize: 13.5, color: "#fff", background: "var(--accent)", border: "2px solid var(--ink)", borderRadius: 11, padding: "9px 16px", boxShadow: "3px 3px 0 var(--ink)" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="#fff" strokeWidth="2" /><path d="M20 20l-3.5-3.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" /></svg>
          {t("account.searchJobs")}
        </Link>
      </div>
      {/* Header mobile (se oculta en desktop) */}
      <div className="jb-acct-header-mobile">
        <Header title={t("account.title")} onSettings={() => setSettingsOpen(true)} />
      </div>
      <div className="jb-acct-body">
        {/* Sidebar — solo desktop: mini-perfil + nav + Ajustes */}
        <aside className="jb-acct-sidebar">
          <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "0 8px 18px" }}>
            <span style={{ width: 48, height: 48, borderRadius: 14, background: avatarUrl ? undefined : "linear-gradient(135deg,#8FE3D0,#4FBFA6)", backgroundImage: avatarUrl ? `url(${avatarUrl})` : undefined, backgroundSize: "cover", backgroundPosition: "center", color: "#063D31", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: ARCHIVO, fontWeight: 900, fontSize: 16, flexShrink: 0, boxShadow: "2px 2px 0 var(--ink)" }}>{!avatarUrl && initials(display.name)}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{display.name || t("account.unnamed")}</div>
              <div style={{ fontFamily: MONO, fontSize: 10, color: "var(--soft)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{display.headline || t("account.noHeadline")}</div>
            </div>
          </div>
          <nav style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {([
              { k: "profile" as Tab, label: t("tabs.profile"), icon: <><circle cx="12" cy="8" r="4" /><path d="M5 20c1-4 4.5-5 7-5s6 1 7 5" strokeLinecap="round" /></> },
              { k: "applications" as Tab, label: t("tabs.applications"), icon: <path d="M4 5h16v14H4zM4 9h16" strokeLinejoin="round" /> },
              { k: "saved" as Tab, label: t("tabs.saved"), icon: <path d="M6 4h12v17l-6-4-6 4V4Z" strokeLinejoin="round" /> },
              { k: "alerts" as Tab, label: t("tabs.alerts"), icon: <><path d="M6 9a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6Z" strokeLinejoin="round" /><path d="M10 19a2 2 0 004 0" /></> },
            ]).map((it) => {
              const on = tab === it.k;
              return (
                <button key={it.k} onClick={() => setTab(it.k)} className="jb-tap" style={{ display: "flex", alignItems: "center", gap: 11, fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: on ? 700 : 600, fontSize: 14, color: on ? "#0E5C4A" : "#54504A", background: on ? "#DCEFE4" : "transparent", border: 0, borderRadius: 11, padding: "11px 13px", cursor: "pointer", textAlign: "left" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">{it.icon}</svg>
                  {it.label}
                  {it.k === "applications" && actionCount > 0 && <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 10, fontWeight: 700, color: "#fff", background: "var(--accent)", borderRadius: 999, padding: "1px 7px" }}>{actionCount}</span>}
                </button>
              );
            })}
          </nav>
          <span style={{ flex: 1 }} />
          <div style={{ height: 1, background: "var(--line)", margin: "8px 8px" }} />
          <button onClick={() => setSettingsOpen(true)} className="jb-tap" style={{ display: "flex", alignItems: "center", gap: 11, fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 600, fontSize: 14, color: "#54504A", background: "transparent", border: 0, borderRadius: 11, padding: "11px 13px", cursor: "pointer", textAlign: "left" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7Z" /><path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 01-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 01-4 0v-.1a1.7 1.7 0 00-1-1.5 1.7 1.7 0 00-1.9.3l-.1.1A2 2 0 014.2 17l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.5-1H3a2 2 0 010-4h.1a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.9L4.2 7A2 2 0 017 4.2l.1.1a1.7 1.7 0 001.9.3h.1a1.7 1.7 0 001-1.5V3a2 2 0 014 0v.1a1.7 1.7 0 001 1.5h.1a1.7 1.7 0 001.9-.3l.1-.1A2 2 0 0119.8 7l-.1.1a1.7 1.7 0 00-.3 1.9v.1a1.7 1.7 0 001.5 1h.1a2 2 0 010 4h-.1a1.7 1.7 0 00-1.5 1Z" strokeLinejoin="round" /></svg>
            {t("account.settings")}
          </button>
        </aside>
        <div className="jb-acct-scroll">
          <main style={pageStyle} className={tab === "profile" ? "jb-acct-narrow" : "jb-acct-wide"}>
            {content}
          </main>
        </div>
      </div>
      <BoardTabBar active={tab} onSelect={setTab} badges={{ applications: actionCount }} className="jb-acct-tabbar" />
      {editOpen && <EditSheet form={form} setForm={setForm} saving={savingEdit} onClose={() => setEditOpen(false)} onSave={saveProfile} t={t} />}
      {newAlertOpen && <NewAlertSheet name={alertName} setName={setAlertName} freq={alertFreq} setFreq={setAlertFreq} onClose={() => setNewAlertOpen(false)} onCreate={createAlert} t={t} />}
      {settingsOpen && <SettingsSheet prefs={prefsOn} onPref={savePref} onClose={() => setSettingsOpen(false)} onLogout={logout} t={t} />}
      {editor && <ItemEditor type={editor.type} item={editor.index != null ? ITEM_META[editor.type].arr[editor.index] : null} onClose={() => setEditor(null)} onSave={(d) => saveItem(editor.type, editor.index, d)} t={t} />}
      {detailId && <ApplicationDetailSheet detail={appDetail} fallback={applications.find((a) => a.id === detailId) ?? null} loading={detailLoading} onClose={closeApplicationDetail} t={t} loc={loc} />}
    </BoardRoot>
  );
}

function Header({ title, onSettings }: { title: string; onSettings: () => void }) {
  return (
    <header style={{ position: "sticky", top: 0, zIndex: 20, background: "rgba(244,240,232,.94)", backdropFilter: "blur(8px)", borderBottom: "1px solid var(--line)", padding: "12px 16px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", alignItems: "center", gap: 9 }}>
        <Link href="/empleos" style={{ display: "flex", alignItems: "center", gap: 9, color: "var(--ink)" }}>
          <span style={{ width: 28, height: 28, borderRadius: 8, background: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "2px 2px 0 var(--ink)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 7l8 4 8-4M4 7l8-4 8 4M4 7v10l8 4 8-4V7M12 11v10" stroke="#C6F24E" strokeWidth="2" strokeLinejoin="round" /></svg>
          </span>
          <span style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 16, letterSpacing: "-.5px" }}>{title}</span>
        </Link>
        <button onClick={onSettings} className="jb-tap" style={{ marginLeft: "auto", width: 36, height: 36, borderRadius: 11, background: "var(--surface)", border: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }} aria-label="settings">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7Z" stroke="var(--ink)" strokeWidth="2"/><path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 01-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 01-4 0v-.1a1.7 1.7 0 00-1-1.5 1.7 1.7 0 00-1.9.3l-.1.1A2 2 0 014.2 17l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.5-1H3a2 2 0 010-4h.1a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.9L4.2 7A2 2 0 017 4.2l.1.1a1.7 1.7 0 001.9.3h.1a1.7 1.7 0 001-1.5V3a2 2 0 014 0v.1a1.7 1.7 0 001 1.5h.1a1.7 1.7 0 001.9-.3l.1-.1A2 2 0 0119.8 7l-.1.1a1.7 1.7 0 00-.3 1.9v.1a1.7 1.7 0 001.5 1h.1a2 2 0 010 4h-.1a1.7 1.7 0 00-1.5 1Z" stroke="var(--ink)" strokeWidth="2" strokeLinejoin="round"/></svg>
        </button>
      </div>
    </header>
  );
}

function ProfileTab({ display, completeness, exp, edu, langs, links, avatarUrl, onEdit, onSettings, onAddItem, onEditItem, onRemoveItem, onAvatar, onCv, onSkills, t, loc }: { display: ReturnType<typeof buildDisplay>; completeness: Completeness | null; exp: Experience[]; edu: Education[]; langs: Language[]; links: LinkItem[]; avatarUrl: string | null; onEdit: () => void; onSettings: () => void; onAddItem: (t: ItemType) => void; onEditItem: (t: ItemType, i: number) => void; onRemoveItem: (t: ItemType, i: number) => void; onAvatar: (url: string | null) => void; onCv: () => void; onSkills: (next: string[]) => void; t: ReturnType<typeof useTranslations>; loc: string }) {
  const pct = completeness?.pct ?? 0;
  const complete = completeness?.complete ?? false;
  const pending = display.checks.filter((c) => !c.done);
  const dash = Math.round(151 * (1 - pct / 100));
  return (
    <div className="jb-fade jb-acct-profile">
      <section className="jb-ord-a" style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 16 }}>
        <AvatarUpload url={avatarUrl} name={display.name} onChange={onAvatar} t={t} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="jb-acct-name" style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 21, letterSpacing: "-.6px", lineHeight: 1 }}>{display.name || t("account.unnamed")}</div>
          <div style={{ fontSize: 13, color: "#54504A", marginTop: 3 }}>{display.headline || t("account.noHeadline")}</div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: "var(--soft)", marginTop: 3, display: "flex", alignItems: "center", gap: 5 }}><PinIcon />{display.location || t("account.noLocation")}</div>
        </div>
        <button onClick={onEdit} className="jb-hard" style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: ARCHIVO, fontWeight: 800, fontSize: 13, color: "var(--ink)", background: "var(--surface)", border: "2px solid var(--ink)", borderRadius: 11, padding: "10px 15px", boxShadow: "3px 3px 0 var(--ink)", cursor: "pointer", flexShrink: 0 }}><EditIcon />{t("account.edit")}</button>
      </section>

      <section className="jb-ord-b" style={{ background: "var(--ink)", color: "#F4F0E8", borderRadius: 16, padding: 16, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ position: "relative", width: 56, height: 56, flexShrink: 0 }}>
            <svg width="56" height="56" viewBox="0 0 56 56"><circle cx="28" cy="28" r="24" fill="none" stroke="#38352E" strokeWidth="6"/><circle cx="28" cy="28" r="24" fill="none" stroke="#C6F24E" strokeWidth="6" strokeLinecap="round" transform="rotate(-90 28 28)" strokeDasharray="151" strokeDashoffset={dash}/></svg>
            <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: ARCHIVO, fontWeight: 900, fontSize: 15 }}>{pct}%</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 15 }}>{complete ? t("account.completeDone") : t("account.completeness", { pct })}</div>
            <div style={{ fontSize: 12.5, color: "#B7B2A8", lineHeight: 1.4, marginTop: 2 }}>{complete ? t("account.completeDoneHint") : t("account.completeHint")}</div>
          </div>
        </div>
        {/* Solo los pendientes, y cada chip abre el editor (no decorativos). Al 100%, sin chips. */}
        {!complete && pending.length > 0 && (
          <div style={{ display: "flex", gap: 6, marginTop: 13, flexWrap: "wrap" }}>{pending.map((c) => <Chip key={c.key} tone="neutral" onClick={c.key === "experience" ? () => onAddItem("exp") : c.key === "languages" ? () => onAddItem("lang") : onEdit}><PlusTiny />{t(`account.check.${c.key}`)}</Chip>)}</div>
        )}
      </section>

      <Section title={t("account.aboutTitle")} action={t("account.edit")} onAction={onEdit}><p style={{ fontSize: 13.5, lineHeight: 1.6, color: "#3A3833", margin: 0 }}>{display.about || t("account.emptyAbout")}</p></Section>
      <Section title={t("account.lookingFor")} action={t("account.edit")} onAction={onEdit}><PrefsView display={display} t={t} loc={loc} /></Section>
      <Section className="jb-ord-cv" title={t("account.cvTitle")}><CvCard t={t} name={display.cvName} hasCv={!!display.cvUrl} onReplaced={onCv} /></Section>
      <ExperienceSection rows={exp} t={t} onAdd={() => onAddItem("exp")} onEdit={(i) => onEditItem("exp", i)} onRemove={(i) => onRemoveItem("exp", i)} />
      <EducationSection rows={edu} t={t} onAdd={() => onAddItem("edu")} onEdit={(i) => onEditItem("edu", i)} onRemove={(i) => onRemoveItem("edu", i)} />
      <LanguageSection rows={langs} t={t} onAdd={() => onAddItem("lang")} onEdit={(i) => onEditItem("lang", i)} onRemove={(i) => onRemoveItem("lang", i)} />
      <SkillsSection skills={display.skills} onChange={onSkills} t={t} />
      <LinksSection rows={links} t={t} onAdd={() => onAddItem("link")} onEdit={(i) => onEditItem("link", i)} onRemove={(i) => onRemoveItem("link", i)} />
      {/* Tarjeta IA — solo desktop (mockup): tinta + chispa + CTA lima condicional */}
      <div className="jb-acct-ia-desktop" style={{ alignItems: "center", gap: 16, background: "var(--ink)", color: "#F4F0E8", borderRadius: 14, padding: "20px 22px", marginTop: 6 }}>
        <span style={{ width: 44, height: 44, borderRadius: 14, background: "rgba(198,242,78,.15)", color: "var(--lime)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><SparkIcon /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 15 }}>{complete ? t("account.refineWithAi") : t("account.completeWithAi")}</div>
          <div style={{ fontSize: 12.5, color: "#B7B2A8", marginTop: 2 }}>{complete ? t("account.completeDoneHint") : t("account.completeHint")}</div>
        </div>
        <Link href="/cuenta/perfil" className="jb-hard" style={{ flexShrink: 0, fontFamily: ARCHIVO, fontWeight: 800, fontSize: 13, color: "var(--ink)", background: "var(--lime)", border: "2px solid var(--lime)", borderRadius: 11, padding: "10px 16px", boxShadow: "3px 3px 0 rgba(198,242,78,.35)" }}>{complete ? t("account.aiCtaRefine") : t("account.aiCtaComplete")}</Link>
      </div>
      {/* Footer de CTAs — solo mobile (en desktop viven en top bar y sidebar) */}
      <div className="jb-acct-footer-mobile" style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 6 }}><HardButton href="/empleos" variant="brand" full><SearchIcon />{t("account.searchForMe")}</HardButton><HardButton href="/cuenta/perfil" variant="lime" full><SparkIcon />{complete ? t("account.refineWithAi") : t("account.completeWithAi")}</HardButton><button onClick={onSettings} className="jb-tap" style={{ width: "100%", fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 700, fontSize: 13.5, color: "var(--soft)", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, padding: 11, cursor: "pointer" }}>{t("account.settingsAndNotifications")}</button></div>
    </div>
  );
}

const SUGGESTED_SKILLS = ["Figma", "UX research", "Prototyping", "Design systems", "Node.js", "SQL", "Excel", "Comunicación", "Liderazgo", "Inglés"];
function SkillsSection({ skills, onChange, t }: { skills: string[]; onChange: (next: string[]) => void; t: ReturnType<typeof useTranslations> }) {
  const [draft, setDraft] = useState("");
  const add = (v: string) => { const x = v.trim(); if (!x || skills.some((s) => s.toLowerCase() === x.toLowerCase())) { setDraft(""); return; } onChange([...skills, x]); setDraft(""); };
  const remove = (v: string) => onChange(skills.filter((s) => s !== v));
  const suggested = SUGGESTED_SKILLS.filter((x) => !skills.some((s) => s.toLowerCase() === x.toLowerCase())).slice(0, 5);
  return (
    <Section title={t("account.skillsTitle")}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {skills.map((s) => (
          <span key={s} style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: MONO, fontSize: 11, fontWeight: 700, color: "#54504A", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "6px 8px 6px 11px" }}>
            {s}
            <button onClick={() => remove(s)} aria-label={`remove ${s}`} style={{ background: "none", border: 0, padding: 0, cursor: "pointer", display: "flex" }}><svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="var(--soft)" strokeWidth="2.6" strokeLinecap="round" /></svg></button>
          </span>
        ))}
      </div>
      <div style={{ display: "flex", gap: 7, marginTop: 10, maxWidth: 420 }}>
        <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(draft); } }} placeholder={t("account.skillsPlaceholder")} style={{ ...inputStyle, flex: 1 }} />
        <HardButton variant="brand" onClick={() => add(draft)} style={{ fontSize: 13, padding: "0 16px" }}>{t("account.add")}</HardButton>
      </div>
      {suggested.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <MonoLabel style={{ fontSize: 9, marginBottom: 6 }}>{t("account.suggested")}</MonoLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {suggested.map((sg) => <button key={sg} onClick={() => add(sg)} className="jb-tap" style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: "var(--brand)", background: "var(--brandSoft)", border: "1px dashed #BEE0CE", borderRadius: 8, padding: "6px 9px", cursor: "pointer" }}>+ {sg}</button>)}
          </div>
        </div>
      )}
    </Section>
  );
}

function Section({ title, children, action, onAction, className }: { title: string; children: ReactNode; action?: string; onAction?: () => void; className?: string }) {
  return <section className={className} style={{ marginBottom: 14 }}><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}><MonoLabel>{title}</MonoLabel>{action && <button onClick={onAction} className="jb-tap" style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: "var(--brand)", padding: "2px 4px", background: "transparent", border: 0, cursor: "pointer" }}>{action}</button>}</div><div style={cardStyle}>{children}</div></section>;
}

function CvCard({ t, name, hasCv = true, onReplaced }: { t: ReturnType<typeof useTranslations>; name: string | null; hasCv?: boolean; onReplaced: () => void }) {
  const [busy, setBusy] = useState(false);
  const [replacing, setReplacing] = useState(false);
  async function open() {
    setBusy(true);
    const r = await fetch("/api/board/cv").then((x) => (x.ok ? x.json() : null)).catch(() => null);
    setBusy(false);
    if (r?.url) window.open(r.url, "_blank", "noopener");
  }
  async function replace(file: File) {
    setReplacing(true);
    const fd = new FormData(); fd.append("file", file);
    const parsed = await fetch("/api/careers/parse-cv", { method: "POST", body: fd }).then((x) => (x.ok ? x.json() : null)).catch(() => null);
    if (parsed?.cv_path) {
      await fetch("/api/board/cv", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cv_path: parsed.cv_path }) }).catch(() => {});
      onReplaced();
    }
    setReplacing(false);
  }
  if (!hasCv) return (
    <label className="jb-tap" style={{ display: "flex", alignItems: "center", gap: 12, cursor: replacing ? "wait" : "pointer" }}>
      <input type="file" accept=".pdf,.doc,.docx,.txt" onChange={(e) => { const f = e.target.files?.[0]; if (f) replace(f); }} style={{ display: "none" }} />
      <span style={{ width: 38, height: 46, borderRadius: 8, background: "var(--limeSoft)", border: "1.5px dashed #C6D96A", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><FileIcon /></span>
      <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, lineHeight: 1.45, color: "var(--soft)" }}>{t("account.cvEmpty")}</span>
      <span className="jb-hard" style={{ flexShrink: 0, fontFamily: ARCHIVO, fontWeight: 800, fontSize: 12, color: "var(--ink)", background: "var(--lime)", border: "2px solid var(--ink)", borderRadius: 9, padding: "8px 13px", boxShadow: "2px 2px 0 var(--ink)" }}>{replacing ? "…" : t("account.cvUpload")}</span>
    </label>
  );
  return <div style={{ display: "flex", alignItems: "center", gap: 12 }}><span style={{ width: 38, height: 46, borderRadius: 8, background: "var(--brandSoft)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><FileIcon /></span><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name || t("account.cvFile")}</div><div style={{ fontFamily: MONO, fontSize: 9.5, color: "var(--soft)", marginTop: 2 }}>{t("account.cvMeta")}</div></div><div style={{ display: "flex", gap: 6, flexShrink: 0 }}><button onClick={open} disabled={busy} className="jb-tap" style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: 700, color: "var(--brand)", background: "var(--brandSoft)", border: "1px solid #BEE0CE", borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}>{busy ? "…" : t("account.cvView")}</button><label className="jb-tap" style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: 700, color: "var(--soft)", background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 8, padding: "6px 10px", cursor: replacing ? "wait" : "pointer" }}><input type="file" accept=".pdf,.doc,.docx,.txt" onChange={(e) => { const f = e.target.files?.[0]; if (f) replace(f); }} style={{ display: "none" }} />{replacing ? "…" : t("account.cvReplace")}</label></div></div>;
}

function PrefsView({ display, t, loc }: { display: ReturnType<typeof buildDisplay>; t: ReturnType<typeof useTranslations>; loc: string }) {
  const prefs = [
    { label: t("account.role"), value: display.headline || t("account.anyRole"), icon: <BriefcaseIcon /> },
    { label: t("account.salary"), value: display.salary ? new Intl.NumberFormat(loc, { style: "currency", currency: display.currency }).format(display.salary) : t("account.open") , icon: <MoneyIcon /> },
    { label: t("account.modality"), value: display.modality || t("account.open"), icon: <ScreenIcon /> },
    { label: t("account.location"), value: display.prefLocation || display.location || t("account.open"), icon: <PinIcon /> },
  ];
  return <div className="jb-prefs-grid">{prefs.map((p) => <div key={p.label} style={{ display: "flex", alignItems: "center", gap: 11 }}><span style={{ width: 30, height: 30, borderRadius: 8, background: "var(--bg)", color: "var(--soft)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{p.icon}</span><span style={{ minWidth: 0 }}><span style={{ display: "block", fontFamily: MONO, fontSize: 9, textTransform: "uppercase", letterSpacing: .4, color: "var(--soft)" }}>{p.label}</span><span style={{ display: "block", fontSize: 14.5, fontWeight: 700, color: "var(--ink)", marginTop: 2 }}>{p.value}</span></span></div>)}</div>;
}

function ExperienceSection({ rows, t, onAdd, onEdit, onRemove }: { rows: Experience[]; t: ReturnType<typeof useTranslations>; onAdd: () => void; onEdit: (i: number) => void; onRemove: (i: number) => void }) {
  return <section style={{ marginBottom: 14 }}><HeaderLine title={t("account.experienceTitle")} action={t("account.add")} onAction={onAdd} />{rows.length === 0 ? <EmptyInline text={t("account.emptyExperience")} /> : <div style={{ position: "relative", paddingLeft: 6 }}>{rows.map((e, i) => <div key={i} style={{ display: "flex", gap: 13 }}><div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}><CompanyLogo name={e.company || e.title} size={38} />{i < rows.length - 1 && <span style={{ flex: 1, width: 2, background: "var(--line)", margin: "4px 0" }} />}</div><div style={{ flex: 1, minWidth: 0, paddingBottom: 16 }}><div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 14.5, letterSpacing: "-.2px" }}>{e.title || t("account.untitledRole")}</div><div style={{ fontSize: 12.5, color: "#54504A", marginTop: 1 }}>{e.company || t("account.noCompany")}</div></div><RowActions onEdit={() => onEdit(i)} onRemove={() => onRemove(i)} /></div><div style={{ fontFamily: MONO, fontSize: 10, color: "var(--soft)", marginTop: 3 }}>{period(e.start_date, e.end_date, e.is_current, t)}</div></div></div>)}</div>}</section>;
}

function EducationSection({ rows, t, onAdd, onEdit, onRemove }: { rows: Education[]; t: ReturnType<typeof useTranslations>; onAdd: () => void; onEdit: (i: number) => void; onRemove: (i: number) => void }) {
  return <section style={{ marginBottom: 14 }}><HeaderLine title={t("account.educationTitle")} action={t("account.add")} onAction={onAdd} />{rows.length === 0 ? <EmptyInline text={t("account.emptyEducation")} /> : <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>{rows.map((ed, i) => <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 13, padding: "12px 13px" }}><span style={{ width: 34, height: 34, borderRadius: 10, background: "var(--limeSoft)", color: "#46540F", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><EducationIcon /></span><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 14 }}>{ed.degree || ed.field || t("account.education")}</div><div style={{ fontSize: 12.5, color: "#54504A", marginTop: 1 }}>{ed.institution || t("account.noInstitution")}</div><div style={{ fontFamily: MONO, fontSize: 10, color: "var(--soft)", marginTop: 3 }}>{yearPeriod(ed.start_year, ed.end_year)}</div></div><RowActions onEdit={() => onEdit(i)} onRemove={() => onRemove(i)} /></div>)}</div>}</section>;
}

function LanguageSection({ rows, t, onAdd, onEdit, onRemove }: { rows: Language[]; t: ReturnType<typeof useTranslations>; onAdd: () => void; onEdit: (i: number) => void; onRemove: (i: number) => void }) {
  return <section style={{ marginBottom: 14 }}><HeaderLine title={t("account.languagesTitle")} action={t("account.add")} onAction={onAdd} />{rows.length === 0 ? <EmptyInline text={t("account.emptyLanguages")} /> : <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, padding: "6px 14px" }}>{rows.map((l, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i === rows.length - 1 ? "1px solid transparent" : "1px solid var(--line)" }}><span style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 13.5, flex: 1 }}>{l.language || t("account.language")}</span><Dots level={l.level} /><span style={{ fontFamily: MONO, fontSize: 10, color: "var(--soft)", width: 58, textAlign: "right" }}>{l.level || t("account.basic")}</span><RowActions onEdit={() => onEdit(i)} onRemove={() => onRemove(i)} /></div>)}</div>}</section>;
}

function LinksSection({ rows, t, onAdd, onEdit, onRemove }: { rows: LinkItem[]; t: ReturnType<typeof useTranslations>; onAdd: () => void; onEdit: (i: number) => void; onRemove: (i: number) => void }) {
  return <section style={{ marginBottom: 14 }}><HeaderLine title={t("account.linksTitle")} action={t("account.add")} onAction={onAdd} />{rows.length === 0 ? <EmptyInline text={t("account.emptyLinks")} /> : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{rows.map((lk, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 11, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, padding: "11px 13px" }}><span style={{ width: 30, height: 30, borderRadius: 9, background: "var(--bg)", color: "var(--soft)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><ExternalIcon /></span><a href={normalizeUrl(lk.url)} target="_blank" rel="noopener noreferrer" style={{ flex: 1, minWidth: 0, color: "inherit", textDecoration: "none" }}><div style={{ fontSize: 13, fontWeight: 700 }}>{lk.label || linkTypeLabel(lk.type)}</div><div style={{ fontFamily: MONO, fontSize: 10, color: "var(--brand)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lk.url}</div></a><RowActions onEdit={() => onEdit(i)} onRemove={() => onRemove(i)} /></div>)}</div>}</section>;
}

function AvatarUpload({ url, name, onChange, t }: { url: string | null; name: string; onChange: (url: string | null) => void; t: ReturnType<typeof useTranslations> }) {
  const [busy, setBusy] = useState(false);
  async function upload(file: File) {
    setBusy(true);
    const fd = new FormData(); fd.append("file", file);
    const r = await fetch("/api/board/avatar", { method: "POST", body: fd }).then((x) => (x.ok ? x.json() : null)).catch(() => null);
    setBusy(false);
    if (r?.url) onChange(r.url);
  }
  return (
    <div style={{ position: "relative", width: 56, height: 56, flexShrink: 0 }}>
      {url
        ? <img src={url} alt={name} style={{ width: 56, height: 56, borderRadius: 17, objectFit: "cover", boxShadow: "2px 2px 0 var(--ink)" }} />
        : <span style={{ width: 56, height: 56, borderRadius: 17, background: "linear-gradient(135deg,#8FE3D0,#4FBFA6)", color: "#063D31", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: ARCHIVO, fontWeight: 900, fontSize: 19, boxShadow: "2px 2px 0 var(--ink)" }}>{initials(name)}</span>}
      <label className="jb-tap" style={{ position: "absolute", right: -4, bottom: -4, width: 28, height: 28, borderRadius: 8, background: "var(--surface)", border: "2px solid var(--ink)", display: "flex", alignItems: "center", justifyContent: "center", cursor: busy ? "wait" : "pointer" }} aria-label={t("account.photoUpload")}>
        <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} style={{ display: "none" }} />
        {busy ? <span style={{ width: 10, height: 10, border: "2px solid var(--ink)", borderTopColor: "transparent", borderRadius: "50%", animation: "jbSpin .7s linear infinite" }} /> : <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M4 8h3l2-2h6l2 2h3v12H4V8Z" stroke="var(--ink)" strokeWidth="2" strokeLinejoin="round" /><circle cx="12" cy="13" r="3" stroke="var(--ink)" strokeWidth="2" /></svg>}
      </label>
    </div>
  );
}

function RowActions({ onEdit, onRemove }: { onEdit: () => void; onRemove: () => void }) {
  const s: CSSProperties = { width: 30, height: 30, borderRadius: 8, background: "var(--bg)", border: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, color: "var(--soft)" };
  return <div style={{ display: "flex", flexDirection: "row", gap: 6, flexShrink: 0, alignItems: "center" }}>
    <button onClick={onEdit} className="jb-tap" aria-label="edit" style={s}><svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 20h4L18.5 9.5a2.1 2.1 0 00-3-3L5 17v3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg></button>
    <button onClick={onRemove} className="jb-tap" aria-label="remove" style={s}><svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M5 7h14M9 7V5h6v2M7 7l1 13h8l1-13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
  </div>;
}

function SavedTab({ saved, onRemove, t, loc }: { saved: Saved[]; onRemove: (row: Saved) => void; t: ReturnType<typeof useTranslations>; loc: string }) {
  return <div className="jb-fade"><h1 style={titleStyle}>{t("saved.title")}</h1>{saved.length === 0 ? <EmptyPanel title={t("saved.emptyTitle")} text={t("saved.emptyText")} cta={t("account.browse")} /> : <div className="jb-acct-grid3">{saved.map((row) => row.job && <div key={row.id} className="jb-card jb-saved-card" style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 15, padding: 14 }}>
  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
    <CompanyLogo name={row.job.company?.name} logoUrl={row.job.company?.logo_url} size={40} />
    <Link href={{ pathname: "/empleos/oferta/[slug]", params: { slug: jobSlug(row.job) } }} style={{ flex: 1, minWidth: 0, color: "inherit" }}>
      <div style={{ fontFamily: MONO, fontSize: 10, color: "var(--soft)" }}>{row.job.company?.name}</div>
      <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 14.5, letterSpacing: "-.3px", lineHeight: 1.15, marginTop: 1 }}>{row.job.title}</div>
    </Link>
    {/* Desguardar = bookmark relleno (mockup), no pill de texto */}
    <button onClick={() => onRemove(row)} className="jb-tap" aria-label={t("saved.remove")} title={t("saved.remove")} style={{ width: 32, height: 32, borderRadius: 9, background: "transparent", border: 0, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="#0E5C4A"><path d="M6 4h12v17l-6-4-6 4V4Z" stroke="#0E5C4A" strokeWidth="2" strokeLinejoin="round" /></svg>
    </button>
  </div>
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, borderTop: "1px solid var(--line)", marginTop: 11, paddingTop: 11 }}>
    <span style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 13.5, color: "var(--brand)" }}>{formatSalary(row.job, loc) || t("saved.salaryOpen")}</span>
    <Link href={{ pathname: "/empleos/oferta/[slug]/aplicar", params: { slug: jobSlug(row.job) } }} className="jb-hard" style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 12, color: "#fff", background: "var(--accent)", border: "2px solid var(--ink)", borderRadius: 8, padding: "7px 13px", boxShadow: "2px 2px 0 var(--ink)" }}>{t("card.apply")}</Link>
  </div>
</div>)}</div>}</div>;
}

function AlertsTab({ alerts, alertOn, onToggle, onNew, onDelete, t }: { alerts: Alert[]; alertOn: Record<string, boolean>; onToggle: (id: string, next: boolean) => void; onNew: () => void; onDelete: (id: string) => void; t: ReturnType<typeof useTranslations> }) {
  return <div className="jb-fade"><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}><h1 style={{ ...titleStyle, margin: 0 }}>{t("alerts.title")}</h1><HardButton onClick={onNew} style={{ padding: "7px 12px", fontSize: 12 }}><PlusTiny />{t("alerts.new")}</HardButton></div>{alerts.length === 0 ? <EmptyPanel title={t("alerts.emptyTitle")} text={t("alerts.emptyText")} /> : <div className="jb-acct-grid2">{alerts.map((al) => { const on = alertOn[al.id] !== false; const name = alertLabel(al.criteria, t("alerts.default")); return <div key={al.id} className="jb-pop" style={cardStyle}><div style={{ display: "flex", alignItems: "flex-start", gap: 11 }}><span style={{ width: 34, height: 34, borderRadius: 10, background: "var(--brandSoft)", color: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><BellIcon /></span><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 14, lineHeight: 1.15 }}>{name}</div><div style={{ fontFamily: MONO, fontSize: 9.5, color: "var(--soft)", marginTop: 3 }}>{t("alerts." + (al.frequency || "weekly"))} · {t("alerts.newCount", { count: al.match_count ?? 0 })}</div></div><Toggle on={on} onClick={() => onToggle(al.id, !on)} /></div><div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 11 }}>{criteriaChips(al.criteria, t("alerts.match")).map((c) => <span key={c} style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: "#54504A", background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 7, padding: "3px 8px" }}>{c}</span>)}</div><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 11, paddingTop: 11, borderTop: "1px solid var(--line)" }}><Link href={{ pathname: "/empleos", query: { q: alertLabel(al.criteria, "") } }} style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 12.5, color: "var(--brand)", textDecoration: "none" }}>{t("alerts.viewOffers", { count: al.match_count ?? 0 })} →</Link><button onClick={() => onDelete(al.id)} style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: "var(--accent)", background: "transparent", border: 0, cursor: "pointer" }}>{t("account.delete")}</button></div></div>; })}</div>}<div style={{ marginTop: 14, background: "var(--limeSoft)", border: "1px solid #D6E89A", borderRadius: 12, padding: "12px 13px", fontSize: 12.5, lineHeight: 1.5, color: "#46540F" }}>{t("alerts.hint")}</div></div>;
}

function ApplicationsTracker({ t, applications, loc, onOpen }: { t: ReturnType<typeof useTranslations>; applications: Application[]; loc: string; onOpen: (id: string) => void }) {
  const actionCount = applications.filter((a) => statusStyle(a).kind === "action").length;
  return <div className="jb-fade"><h1 style={titleStyle}>{t("account.applicationsTitle")}</h1>{actionCount > 0 && <div className="jb-pop" style={{ background: "var(--ink)", color: "#F4F0E8", borderRadius: 15, padding: "15px 16px", marginBottom: 16 }}><div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9 }}><span style={{ width: 24, height: 24, borderRadius: 7, background: "rgba(198,242,78,.18)", display: "flex", alignItems: "center", justifyContent: "center" }}><EditIcon /></span><span style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 13 }}>{t("account.applicationsTitle")}</span><AiTag>{actionCount}</AiTag></div><p style={{ fontSize: 13, lineHeight: 1.5, color: "#E4E0D8", margin: 0 }}>{applications.find((a) => statusStyle(a).kind === "action")?.feedback?.reason ?? t("account.completeHint")}</p></div>}{applications.length === 0 ? <EmptyPanel title={t("account.emptyApplications")} text={t("account.emptyApplications")} cta={t("account.browse")} /> : <div className="jb-acct-grid2">{applications.map((a) => <ApplicationCard key={a.id} app={a} loc={loc} t={t} onOpen={() => onOpen(a.id)} />)}</div>}</div>;
}

function ApplicationCard({ app, loc, t, onOpen }: { app: Application; loc: string; t: ReturnType<typeof useTranslations>; onOpen: () => void }) {
  if (!app.job) return null;
  const st = statusStyle(app);
  const stageLabel = app.stage?.name || statusLabel(app.status);
  return <button onClick={onOpen} className="jb-card jb-pop" style={{ width: "100%", textAlign: "left", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 15, cursor: "pointer" }}><div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 13 }}><CompanyLogo name={app.job.company?.name} logoUrl={app.job.company?.logo_url} size={40} /><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontFamily: MONO, fontSize: 10.5, color: "var(--soft)" }}>{app.job.company?.name || "-"}</div><div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 15, letterSpacing: "-.3px", lineHeight: 1.1, marginTop: 2 }}>{app.job.title}</div></div><span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: .4, color: st.color, background: st.bg, border: `1px solid ${st.border}`, borderRadius: 999, padding: "4px 9px", whiteSpace: "nowrap", flexShrink: 0 }}>{st.label}</span></div><StageTrack app={app} /><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "3px 0 9px" }}><span style={{ fontFamily: MONO, fontSize: 9.5, color: "var(--soft)" }}>{stageLabel}</span><span style={{ fontFamily: MONO, fontSize: 9.5, color: "var(--soft)" }}>{relativeDate(app.created_at, loc)}</span></div>{app.feedback?.reason && <FeedbackBox app={app} />}<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 11, paddingTop: 11, borderTop: "1px solid var(--line)" }}><span style={{ fontFamily: MONO, fontSize: 9.5, color: "var(--soft)" }}>{t("account.appliedOn", { date: relativeDate(app.created_at, loc) })}</span><span style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 12, color: "var(--brand)" }}>{t("account.viewDetail")} →</span></div></button>;
}

function StageTrack({ app }: { app: Application }) {
  const pipeline = normalizedPipeline(app);
  const current = currentStageIndex(app, pipeline);
  return <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 8 }}>{pipeline.map((stage, i) => { const done = app.status === "hired" || i <= current; const rejected = app.status === "rejected" && i >= current; return <span key={`${stage.name}-${i}`} style={{ display: "flex", alignItems: "center", flex: i === pipeline.length - 1 ? "0 0 auto" : 1 }}><span style={{ width: i === current ? 12 : 9, height: i === current ? 12 : 9, borderRadius: "50%", background: rejected ? "#79746B" : done ? "#0E5C4A" : "#E0DACC", flexShrink: 0, border: i === current ? "2px solid #BEE0CE" : "2px solid transparent" }} />{i < pipeline.length - 1 && <span style={{ flex: 1, height: 2, background: done && !rejected ? "#0E5C4A" : "#E0DACC" }} />}</span>; })}</div>;
}

function FeedbackBox({ app }: { app: Application }) {
  const st = statusStyle(app);
  return <div style={{ display: "flex", gap: 9, alignItems: "flex-start", background: st.feedbackBg, border: `1px solid ${st.feedbackBorder}`, borderRadius: 11, padding: "9px 11px" }}><span style={{ flexShrink: 0, marginTop: 1 }}>{st.icon}</span><span style={{ fontSize: 12.5, lineHeight: 1.45, color: st.feedbackColor }}>{app.feedback?.reason}</span></div>;
}

function ApplicationDetailSheet({ detail, fallback, loading, onClose, t, loc }: { detail: ApplicationDetail | null; fallback: Application | null; loading: boolean; onClose: () => void; t: ReturnType<typeof useTranslations>; loc: string }) {
  const app = detail?.application ?? fallback;
  const st = app ? statusStyle(app) : null;
  return <Sheet onClose={onClose}><div style={{ position: "sticky", top: 0, background: "var(--bg)", padding: "14px 18px 12px", borderBottom: "1px solid var(--line)", zIndex: 1 }}><div className="jb-sheet-handle" style={sheetHandle} />{app?.job && <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}><CompanyLogo name={app.job.company?.name} logoUrl={app.job.company?.logo_url} size={44} /><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontFamily: MONO, fontSize: 10.5, color: "var(--soft)" }}>{app.job.company?.name}</div><div style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 18, letterSpacing: "-.4px", lineHeight: 1.1, marginTop: 2 }}>{app.job.title}</div></div>{st && <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: .4, color: st.color, background: st.bg, border: `1px solid ${st.border}`, borderRadius: 999, padding: "4px 9px", whiteSpace: "nowrap", flexShrink: 0 }}>{st.label}</span>}</div>}</div><div style={{ padding: "16px 18px 8px" }}>{loading ? <div style={{ color: "var(--soft)", padding: 20, textAlign: "center" }}>...</div> : <><MonoLabel style={{ marginBottom: 14 }}>{t("account.applicationProgress")}</MonoLabel>{detail?.timeline?.length ? <Timeline rows={detail.timeline} loc={loc} /> : app ? <FallbackTimeline app={app} loc={loc} /> : null}{app?.feedback?.reason && <FeedbackBox app={app} />}</>}</div><div style={{ position: "sticky", bottom: 0, background: "var(--bg)", borderTop: "1px solid var(--line)", padding: "12px 18px 18px", display: "flex", flexDirection: "column", gap: 9 }}>{app?.job ? <HardButton href={`/${loc}/empleos/oferta/${jobSlug(app.job)}`} variant={st?.kind === "good" ? "lime" : st?.kind === "action" ? "accent" : "brand"} full>{t("account.viewOriginalOffer")}</HardButton> : null}<button onClick={onClose} className="jb-tap" style={{ width: "100%", fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 700, fontSize: 13.5, color: "var(--soft)", background: "transparent", border: 0, padding: 6, cursor: "pointer" }}>{t("account.cancel")}</button></div></Sheet>;
}

function Timeline({ rows, loc }: { rows: ApplicationTimelineEvent[]; loc: string }) {
  return <div style={{ position: "relative", paddingLeft: 4 }}>{rows.map((row, i) => <TimelineRow key={`${row.created_at}-${i}`} title={row.to_stage || row.type || "Actualización"} date={relativeDate(row.created_at, loc)} note={row.reason || stageMove(row)} done={i < rows.length - 1} current={i === rows.length - 1} connector={i < rows.length - 1} />)}</div>;
}

function FallbackTimeline({ app, loc }: { app: Application; loc: string }) {
  const pipeline = normalizedPipeline(app);
  const current = currentStageIndex(app, pipeline);
  return <div style={{ position: "relative", paddingLeft: 4 }}>{pipeline.map((stage, i) => <TimelineRow key={`${stage.name}-${i}`} title={stage.name || statusLabel(app.status)} date={i === 0 ? relativeDate(app.created_at, loc) : i === current ? statusLabel(app.status) : "Pendiente"} note={i === current ? app.feedback?.reason ?? "" : ""} done={i < current || app.status === "hired"} current={i === current && app.status !== "hired"} connector={i < pipeline.length - 1} />)}</div>;
}

function TimelineRow({ title, date, note, done, current, connector }: { title: string; date: string; note?: string | null; done?: boolean; current?: boolean; connector?: boolean }) {
  return <div style={{ display: "flex", gap: 13 }}><div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}><span style={{ width: 24, height: 24, borderRadius: "50%", background: done ? "#0E5C4A" : current ? "#C6F24E" : "#EDE8DC", border: `2px solid ${done ? "#0E5C4A" : current ? "#1A1A17" : "#E0DACC"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>{done ? <CheckTiny /> : <span style={{ width: 7, height: 7, borderRadius: "50%", background: current ? "#1A1A17" : "#CFC7B6", display: "block" }} />}</span>{connector && <span style={{ flex: 1, width: 2, background: done ? "#0E5C4A" : "#E0DACC", margin: "3px 0", minHeight: 22 }} />}</div><div style={{ flex: 1, minWidth: 0, paddingBottom: 14 }}><div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 14, color: done || current ? "#1A1A17" : "#A39E94" }}>{title}</div><div style={{ fontFamily: MONO, fontSize: 9.5, color: "var(--soft)", marginTop: 2 }}>{date}</div>{note && <p style={{ fontSize: 12.5, lineHeight: 1.5, color: "#54504A", margin: "6px 0 0" }}>{note}</p>}</div></div>;
}

function EditSheet
({ form, setForm, saving, onClose, onSave, t }: { form: FormState; setForm: (v: FormState) => void; saving: boolean; onClose: () => void; onSave: () => void; t: ReturnType<typeof useTranslations> }) {
  const update = (key: keyof FormState, value: string) => setForm({ ...form, [key]: value });
  return <Sheet onClose={onClose}><div style={{ position: "sticky", top: 0, background: "var(--bg)", padding: "14px 18px 10px", borderBottom: "1px solid var(--line)", zIndex: 1 }}><div className="jb-sheet-handle" style={sheetHandle} /><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}><span style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 19, letterSpacing: "-.5px" }}>{t("account.editProfile")}</span><button onClick={onSave} disabled={saving} className="jb-tap" style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: "var(--brand)", padding: 4, background: "transparent", border: 0, cursor: "pointer" }}>{saving ? t("account.saving") : t("account.save")}</button></div></div><div style={{ padding: "16px 18px 20px", display: "flex", flexDirection: "column", gap: 14 }}><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}><Field label={t("account.firstName")} value={form.first_name} onChange={(v) => update("first_name", v)} /><Field label={t("account.lastName")} value={form.last_name} onChange={(v) => update("last_name", v)} /></div><Field label={t("account.headline")} value={form.headline} onChange={(v) => update("headline", v)} /><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}><Field label={t("account.phone")} value={form.phone} onChange={(v) => update("phone", v)} /><Field label={t("account.currency")} value={form.pref_currency} onChange={(v) => update("pref_currency", v)} /></div><BoardField label={t("account.city")}><CityAutocomplete value={form.city} country={form.country_code || "VE"} onChange={(city, meta) => setForm({ ...form, city, country_code: meta?.country ?? form.country_code })} placeholder={t("account.city")} inputStyle={inputStyle} /></BoardField><BoardField label={t("account.about")}><textarea value={form.about} onChange={(e) => update("about", e.target.value)} rows={4} style={{ ...inputStyle, resize: "vertical" }} /></BoardField><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}><Field label={t("account.salaryMin")} value={form.pref_salary_min} onChange={(v) => update("pref_salary_min", v)} /><Field label={t("account.modality")} value={form.pref_modality} onChange={(v) => update("pref_modality", v)} /></div><Field label={t("account.prefLocations")} value={form.pref_locations} onChange={(v) => update("pref_locations", v)} /><Field label={t("account.skills")} value={form.skills} onChange={(v) => update("skills", v)} /><HardButton onClick={onSave} disabled={saving} variant="brand" full>{saving ? t("account.saving") : t("account.saveChanges")}</HardButton></div></Sheet>;
}

function NewAlertSheet({ name, setName, freq, setFreq, onClose, onCreate, t }: { name: string; setName: (v: string) => void; freq: string; setFreq: (v: string) => void; onClose: () => void; onCreate: () => void; t: ReturnType<typeof useTranslations> }) {
  const opts = [["instant", t("alerts.instant")], ["daily", t("alerts.daily")], ["weekly", t("alerts.weekly")]] as const;
  return <Sheet onClose={onClose}><div style={{ padding: "14px 18px 6px" }}><div className="jb-sheet-handle" style={sheetHandle} /><span style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 19, letterSpacing: "-.5px" }}>{t("alerts.new")}</span></div><div style={{ padding: "8px 18px 20px", display: "flex", flexDirection: "column", gap: 14 }}><Field label={t("alerts.name")} value={name} onChange={setName} placeholder={t("alerts.placeholder")} /><BoardField label={t("alerts.frequency")}><div style={{ display: "flex", gap: 7 }}>{opts.map(([key, label]) => <button key={key} onClick={() => setFreq(key)} className="jb-tap" style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: freq === key ? 700 : 600, fontSize: 13, borderRadius: 999, padding: "8px 14px", cursor: "pointer", border: `1.5px solid ${freq === key ? "#1A1A17" : "#E7E1D4"}`, background: freq === key ? "#DCEFE4" : "#FCFAF6", color: freq === key ? "#0E5C4A" : "#54504A" }}>{label}</button>)}</div></BoardField><HardButton onClick={onCreate} variant="brand" full>{t("account.createAlert")}</HardButton></div></Sheet>;
}

function SettingsSheet({ prefs, onPref, onClose, onLogout, t }: { prefs: { email: boolean; push: boolean; digest: boolean; visible: boolean }; onPref: (key: "email" | "push" | "digest" | "visible", next: boolean) => void; onClose: () => void; onLogout: () => void; t: ReturnType<typeof useTranslations> }) {
  const rows = [{ id: "email", label: t("account.emailNews"), desc: t("account.emailNewsDesc") }, { id: "push", label: t("account.pushNotifications"), desc: t("account.pushNotificationsDesc") }, { id: "digest", label: t("account.weeklyDigest"), desc: t("account.weeklyDigestDesc") }] as const;
  return <Sheet onClose={onClose}><div style={{ position: "sticky", top: 0, background: "var(--bg)", padding: "14px 18px 10px", borderBottom: "1px solid var(--line)" }}><div className="jb-sheet-handle" style={sheetHandle} /><span style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 19, letterSpacing: "-.5px" }}>{t("account.settings")}</span></div><div style={{ padding: "14px 18px 20px" }}><MonoLabel style={{ marginBottom: 10 }}>{t("account.notifications")}</MonoLabel><div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, overflow: "hidden", marginBottom: 18 }}>{rows.map((r) => <PrefRow key={r.id} label={r.label} desc={r.desc} on={prefs[r.id]} onClick={() => onPref(r.id, !prefs[r.id])} />)}</div><div style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, padding: "13px 14px", marginBottom: 18 }}><div style={{ flex: 1 }}><div style={{ fontSize: 13.5, fontWeight: 700 }}>{t("account.profileVisible")}</div><div style={{ fontFamily: MONO, fontSize: 9.5, color: "var(--soft)", marginTop: 2 }}>{t("account.profileVisibleDesc")}</div></div><Toggle on={prefs.visible} onClick={() => onPref("visible", !prefs.visible)} /></div><button onClick={onLogout} className="jb-tap" style={{ width: "100%", fontFamily: ARCHIVO, fontWeight: 700, fontSize: 14, color: "var(--accent)", background: "var(--surface)", border: "1.5px solid #F2C4B9", borderRadius: 12, padding: 12, cursor: "pointer" }}>{t("account.logout")}</button></div></Sheet>;
}

// Editor de un ítem (experiencia / educación / idioma / enlace). Campos por tipo; guarda
// el objeto completo → el padre lo persiste en su array del perfil.
function ItemEditor({ type, item, onClose, onSave, t }: { type: ItemType; item: Record<string, unknown> | null; onClose: () => void; onSave: (draft: Record<string, unknown>) => void; t: ReturnType<typeof useTranslations> }) {
  const [d, setD] = useState<Record<string, unknown>>(item ? { ...item } : defaultItem(type));
  const set = (k: string, v: unknown) => setD((prev) => ({ ...prev, [k]: v }));
  const str = (k: string) => (d[k] == null ? "" : String(d[k]));
  const title = t(`account.editor.${type}${item ? "Edit" : "New"}`);
  const langLevels = ["Básico", "Intermedio", "Avanzado", "Nativo"];
  const linkTypes = ["portfolio", "linkedin", "github", "behance", "website"];
  return <Sheet onClose={onClose}>
    <div style={{ position: "sticky", top: 0, background: "var(--bg)", padding: "14px 18px 10px", borderBottom: "1px solid var(--line)", zIndex: 1 }}><div className="jb-sheet-handle" style={sheetHandle} /><span style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 19, letterSpacing: "-.5px" }}>{title}</span></div>
    <div style={{ padding: "16px 18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
      {type === "exp" && <>
        <Field label={t("account.field.role")} value={str("title")} onChange={(v) => set("title", v)} />
        <Field label={t("account.field.company")} value={str("company")} onChange={(v) => set("company", v)} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}><Field label={t("account.field.start")} value={str("start_date")} onChange={(v) => set("start_date", v)} placeholder="2022" /><Field label={t("account.field.end")} value={str("end_date")} onChange={(v) => set("end_date", v)} placeholder="2024" /></div>
        <label style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13.5, cursor: "pointer" }}><input type="checkbox" checked={!!d.is_current} onChange={(e) => set("is_current", e.target.checked)} />{t("account.field.current")}</label>
      </>}
      {type === "edu" && <>
        <Field label={t("account.field.degree")} value={str("degree")} onChange={(v) => set("degree", v)} />
        <Field label={t("account.field.institution")} value={str("institution")} onChange={(v) => set("institution", v)} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}><Field label={t("account.field.startYear")} value={str("start_year")} onChange={(v) => set("start_year", v.replace(/[^0-9]/g, "") ? Number(v.replace(/[^0-9]/g, "")) : "")} placeholder="2018" /><Field label={t("account.field.endYear")} value={str("end_year")} onChange={(v) => set("end_year", v.replace(/[^0-9]/g, "") ? Number(v.replace(/[^0-9]/g, "")) : "")} placeholder="2022" /></div>
      </>}
      {type === "lang" && <>
        <Field label={t("account.field.language")} value={str("language")} onChange={(v) => set("language", v)} />
        <BoardField label={t("account.field.level")}><div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>{langLevels.map((lv) => <button key={lv} onClick={() => set("level", lv)} className="jb-tap" style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: str("level") === lv ? 700 : 600, fontSize: 13, borderRadius: 999, padding: "8px 14px", cursor: "pointer", border: `1.5px solid ${str("level") === lv ? "#1A1A17" : "#E7E1D4"}`, background: str("level") === lv ? "#DCEFE4" : "#FCFAF6", color: str("level") === lv ? "#0E5C4A" : "#54504A" }}>{lv}</button>)}</div></BoardField>
      </>}
      {type === "link" && <>
        <BoardField label={t("account.field.linkType")}><div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>{linkTypes.map((lt) => <button key={lt} onClick={() => set("type", lt)} className="jb-tap" style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: str("type") === lt ? 700 : 600, fontSize: 13, borderRadius: 999, padding: "8px 13px", cursor: "pointer", border: `1.5px solid ${str("type") === lt ? "#1A1A17" : "#E7E1D4"}`, background: str("type") === lt ? "#DCEFE4" : "#FCFAF6", color: str("type") === lt ? "#0E5C4A" : "#54504A" }}>{linkTypeLabel(lt)}</button>)}</div></BoardField>
        <Field label={t("account.field.url")} value={str("url")} onChange={(v) => set("url", v)} placeholder="https://…" />
        <Field label={t("account.field.linkLabel")} value={str("label")} onChange={(v) => set("label", v)} placeholder={linkTypeLabel(str("type") || "website")} />
      </>}
      <HardButton onClick={() => onSave(cleanItem(type, d))} variant="brand" full disabled={!itemValid(type, d)}>{t("account.save")}</HardButton>
    </div>
  </Sheet>;
}

function defaultItem(type: ItemType): Record<string, unknown> {
  if (type === "exp") return { title: "", company: "", start_date: "", end_date: "", is_current: false };
  if (type === "edu") return { degree: "", institution: "", start_year: "", end_year: "" };
  if (type === "lang") return { language: "", level: "Intermedio" };
  return { type: "website", url: "", label: "" };
}
function itemValid(type: ItemType, d: Record<string, unknown>) {
  if (type === "exp") return !!String(d.title || "").trim();
  if (type === "edu") return !!String(d.degree || d.institution || "").trim();
  if (type === "lang") return !!String(d.language || "").trim();
  return !!String(d.url || "").trim();
}
function cleanItem(type: ItemType, d: Record<string, unknown>): Record<string, unknown> {
  if (type === "edu") return { ...d, start_year: d.start_year ? Number(d.start_year) : null, end_year: d.end_year ? Number(d.end_year) : null };
  if (type === "link") return { type: d.type || "website", url: String(d.url || "").trim(), label: String(d.label || "").trim() || null };
  return d;
}
function linkTypeLabel(type: string) { const m: Record<string, string> = { portfolio: "Portafolio", linkedin: "LinkedIn", github: "GitHub", behance: "Behance", website: "Sitio web" }; return m[type] ?? type; }
function normalizeUrl(url: string) { const u = (url || "").trim(); return /^https?:\/\//i.test(u) ? u : `https://${u}`; }
function ExternalIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M7 17L17 7M9 7h8v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>; }

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) { return <BoardField label={label}><input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={inputStyle} /></BoardField>; }
// Mobile: bottom-sheet. Desktop (CSS .jb-sheet-*): modal centrado con borde tinta y
// sombra dura (mockup) — el mismo contenido, otra presentación.
function Sheet({ children, onClose }: { children: ReactNode; onClose: () => void }) { return <div onClick={onClose} className="jb-fade jb-sheet-overlay" style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(26,26,23,.42)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}><div onClick={(e) => e.stopPropagation()} className="jb-sheet jb-sheet-panel" style={{ width: "100%", maxWidth: 560, maxHeight: "88%", overflowY: "auto", background: "var(--bg)", borderRadius: "22px 22px 0 0", borderTop: "2px solid var(--ink)" }}>{children}</div></div>; }
function HeaderLine({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) { return <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 11 }}><MonoLabel>{title}</MonoLabel>{action && <button onClick={onAction} className="jb-tap" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: MONO, fontSize: 10, fontWeight: 700, color: "var(--brand)", padding: "2px 4px", background: "transparent", border: 0, cursor: "pointer" }}><PlusTiny />{action}</button>}</div>; }
function EmptyInline({ text }: { text: string }) { return <div style={{ ...cardStyle, color: "var(--soft)", fontSize: 13, lineHeight: 1.45 }}>{text}</div>; }
function EmptyPanel({ title, text, cta }: { title: string; text: string; cta?: string }) { return <div style={{ textAlign: "center", padding: "44px 20px", color: "var(--soft)" }}><span style={{ width: 52, height: 52, borderRadius: 15, background: "var(--surface)", border: "1px solid var(--line)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}><BookmarkIcon /></span><div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 16, color: "var(--ink)", marginBottom: 5 }}>{title}</div><div style={{ fontSize: 13, lineHeight: 1.5, marginBottom: cta ? 16 : 0 }}>{text}</div>{cta && <HardButton href="/empleos" variant="accent">{cta}</HardButton>}</div>; }
function PrefRow({ label, desc, on, onClick }: { label: string; desc: string; on: boolean; onClick: () => void }) { return <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 14px", borderBottom: "1px solid var(--line)" }}><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13.5, fontWeight: 700 }}>{label}</div><div style={{ fontFamily: MONO, fontSize: 9.5, color: "var(--soft)", marginTop: 2 }}>{desc}</div></div><Toggle on={on} onClick={onClick} /></div>; }
function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) { return <button onClick={onClick} className="jb-tap" style={{ flexShrink: 0, width: 42, height: 24, borderRadius: 999, background: on ? "#0E5C4A" : "#D8D1C2", position: "relative", border: 0, cursor: "pointer" }}><span style={{ position: "absolute", top: 2, left: on ? 20 : 2, width: 20, height: 20, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.3)", transition: "left .15s ease" }} /></button>; }
function Dots({ level }: { level?: string | null }) { const n = levelScore(level); return <div style={{ display: "flex", gap: 4 }}>{Array.from({ length: 5 }, (_, i) => <span key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: i < n ? "#0E5C4A" : "#E0DACC" }} />)}</div>; }

function buildDisplay(profile: Profile | null, sourced: Sourced, profileSkills: string[]) {
  const first = profile?.first_name ?? sourced.first_name ?? splitName(profile?.full_name).first;
  const last = profile?.last_name ?? sourced.last_name ?? splitName(profile?.full_name).last;
  const name = profile?.full_name || [first, last].filter(Boolean).join(" ");
  const skills = profileSkills.length ? profileSkills : (sourced.skills ?? []);
  return {
    name, headline: profile?.headline ?? "", about: profile?.about ?? "", location: [profile?.city ?? sourced.city, profile?.country_code ?? sourced.country_code].filter(Boolean).join(", "),
    salary: profile?.pref_salary_min ?? null, currency: profile?.pref_currency ?? "USD", modality: (profile?.pref_modality ?? []).join(" · "), prefLocation: (profile?.pref_locations ?? []).join(" · "),
    skills, experiences: sourced.experiences ?? [], education: sourced.education ?? [], languages: sourced.languages ?? [],
    cvUrl: sourced.cv_url ?? null,
    cvName: sourced.cv_url ? (sourced.cv_url.split("/").pop() ?? "").replace(/^\d+-/, "") : null,
    checks: [{ key: "cv", done: !!sourced.cv_url }, { key: "experience", done: (sourced.experiences?.length ?? 0) > 0 }, { key: "languages", done: (sourced.languages?.length ?? 0) > 0 }, { key: "about", done: !!profile?.about }],
  };
}
function normalizedPipeline(app: Application): AppStage[] {
  const rows = (app.pipeline ?? []).slice().sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  if (rows.length) return rows;
  return [{ name: "Aplicada", order_index: 0 }, { name: app.stage?.name || statusLabel(app.status), order_index: 1 }, { name: "Decisión", order_index: 2, is_terminal: true }];
}
function currentStageIndex(app: Application, pipeline = normalizedPipeline(app)) {
  if (app.status === "hired" || app.status === "rejected") return Math.max(0, pipeline.length - 1);
  const name = app.stage?.name;
  const idx = pipeline.findIndex((s) => s.name === name);
  return idx >= 0 ? idx : Math.min(1, pipeline.length - 1);
}
function statusLabel(status?: string | null) {
  if (status === "hired") return "Contratado";
  if (status === "rejected") return "No seleccionado";
  return "En revisión";
}
function statusStyle(app: Application) {
  if (app.status === "hired") return { kind: "good", label: statusLabel(app.status), color: "#0E5C4A", bg: "#DCEFE4", border: "#BEE0CE", feedbackBg: "#DCEFE4", feedbackBorder: "#BEE0CE", feedbackColor: "#0A4638", icon: <GoodIcon /> };
  if (app.status === "rejected") return { kind: "closed", label: statusLabel(app.status), color: "#79746B", bg: "#EEE9DD", border: "#E0DACC", feedbackBg: "#EEE9DD", feedbackBorder: "#E0DACC", feedbackColor: "#5A564E", icon: <ClosedIcon /> };
  if (app.feedback?.reason) return { kind: "action", label: app.stage?.name || statusLabel(app.status), color: "#C7402E", bg: "#FAE3DE", border: "#F2C4B9", feedbackBg: "#FAE3DE", feedbackBorder: "#F2C4B9", feedbackColor: "#8A3122", icon: <WarnIcon /> };
  return { kind: "info", label: app.stage?.name || statusLabel(app.status), color: "#946312", bg: "#F8E7C4", border: "#EBD4A0", feedbackBg: "#F4F0E8", feedbackBorder: "#E7E1D4", feedbackColor: "#54504A", icon: <InfoIcon /> };
}
function stageMove(row: ApplicationTimelineEvent) {
  if (row.from_stage && row.to_stage) return `${row.from_stage} → ${row.to_stage}`;
  return row.from_stage || row.to_stage || "";
}

function emptyForm(): FormState { return { first_name: "", last_name: "", headline: "", about: "", phone: "", city: "", country_code: "VE", pref_salary_min: "", pref_currency: "USD", pref_modality: "", pref_locations: "", pref_contract: "", skills: "" }; }
function splitList(v: string) { return v.split(",").map((x) => x.trim()).filter(Boolean); }
function splitName(v?: string | null) { const parts = (v ?? "").trim().split(/\s+/).filter(Boolean); return { first: parts[0] ?? "", last: parts.slice(1).join(" ") }; }
function initials(name?: string | null) { const n = (name || "?").trim(); return n.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?"; }
function defaultCountry(locale: string) { if (locale === "pt") return "BR"; if (locale === "en") return "US"; return "VE"; }
function period(start?: string | null, end?: string | null, current?: boolean | null, t?: ReturnType<typeof useTranslations>) { const s = start ? new Date(start).getUTCFullYear() : null; const e = current ? t?.("account.current") : (end ? new Date(end).getUTCFullYear() : null); return [s, e].filter(Boolean).join(" - ") || "-"; }
function yearPeriod(start?: number | null, end?: number | null) { return [start, end].filter(Boolean).join(" - ") || "-"; }
function levelScore(level?: string | null) { const key = (level ?? "").toLowerCase(); if (/native|nativo|c2/.test(key)) return 5; if (/c1|advanced|avanz/.test(key)) return 4; if (/b2|intermediate|intermedio/.test(key)) return 3; if (/b1|basic|basico|básico/.test(key)) return 2; return 1; }
function alertLabel(criteria: Record<string, unknown>, fallback: string) { return String((criteria as { q?: string }).q ?? (Object.values(criteria).filter(Boolean).join(" · ") || fallback)); }
function criteriaChips(criteria: Record<string, unknown>, fallback: string) { const chips = Object.values(criteria).filter((v) => v != null && v !== "").flatMap((v) => Array.isArray(v) ? v.map(String) : [String(v)]); return chips.length ? chips : [fallback]; }
const titleStyle: CSSProperties = { fontFamily: ARCHIVO, fontWeight: 900, fontSize: 24, letterSpacing: "-.8px", margin: "0 0 14px" };

function InfoIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#79746B" strokeWidth="2"/><path d="M12 11v5M12 8h.01" stroke="#79746B" strokeWidth="2" strokeLinecap="round"/></svg>; }
function WarnIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 3l9 16H3L12 3Z" stroke="#C7402E" strokeWidth="2" strokeLinejoin="round"/><path d="M12 10v4M12 17h.01" stroke="#C7402E" strokeWidth="2" strokeLinecap="round"/></svg>; }
function GoodIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#0E5C4A" strokeWidth="2"/><path d="M8 12.5l2.5 2.5 5-5.5" stroke="#0E5C4A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function ClosedIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#79746B" strokeWidth="2"/><path d="M15 9l-6 6M9 9l6 6" stroke="#79746B" strokeWidth="2" strokeLinecap="round"/></svg>; }

function IconButton({ children, onClick, label }: { children: ReactNode; onClick: () => void; label: string }) { return <button onClick={onClick} className="jb-tap" aria-label={label} style={{ width: 36, height: 36, borderRadius: 11, background: "var(--surface)", border: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer" }}>{children}</button>; }
function EditIcon() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M4 20h4L18.5 9.5a2.1 2.1 0 00-3-3L5 17v3Z" stroke="var(--ink)" strokeWidth="2" strokeLinejoin="round" /></svg>; }
function PinIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 21s7-6 7-12a7 7 0 10-14 0c0 6 7 12 7 12Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><circle cx="12" cy="9" r="2.4" stroke="currentColor" strokeWidth="2"/></svg>; }
function FileIcon() { return <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M7 3h7l4 4v14H7z" stroke="var(--brand)" strokeWidth="2" strokeLinejoin="round"/><path d="M14 3v4h4" stroke="var(--brand)" strokeWidth="2" strokeLinejoin="round"/></svg>; }
function BriefcaseIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="3" y="7" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" strokeWidth="2"/></svg>; }
function MoneyIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/><path d="M12 7v10M9.5 9.5a2.5 2.5 0 015 0c0 1.5-1.2 2-2.5 2.5s-2.5 1-2.5 2.5a2.5 2.5 0 005 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>; }
function ScreenIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M8 20h8M12 16v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>; }
function EducationIcon() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M12 4L2 9l10 5 10-5-10-5ZM6 11v5c0 1 3 3 6 3s6-2 6-3v-5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>; }
function SearchIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/><path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>; }
function SparkIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/></svg>; }
function BellIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 9a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><path d="M10 19a2 2 0 004 0" stroke="currentColor" strokeWidth="2"/></svg>; }
function BookmarkIcon() { return <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M6 4h12v17l-6-4-6 4V4Z" stroke="var(--soft)" strokeWidth="2" strokeLinejoin="round"/></svg>; }
function PlusTiny() { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/></svg>; }
function CheckTiny() { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5 9-11" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
