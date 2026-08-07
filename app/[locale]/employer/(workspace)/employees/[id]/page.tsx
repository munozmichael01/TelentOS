import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { OnboardingPanel } from "@/components/features/onboarding-panel";
import { DocumentUploader } from "@/components/features/document-uploader";
import { FileLink } from "@/components/features/file-link";
import { EmployeeForm } from "@/components/features/employee-form";
import { RoleCompetencies } from "@/components/features/role-competencies";
import { getRoleCompetencies } from "@/lib/performance/competencies";
import { EmployeeTimeline } from "@/components/features/employee-timeline";
import { InviteToPortal } from "@/components/features/invite-to-portal";
import { computeBalances, type AllowanceRow } from "@/lib/absences/balance";
import { AllowanceBalanceCard } from "@/components/features/allowance-balance-card";
import { getEmployeeEvents } from "@/lib/performance/events";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/server";
import { formatDate, initials } from "@/lib/utils";
import type { Employee, OnboardingTask, AbsenceRequest, TimeEntry, CompensationRecord, AllowanceAdjustmentLog } from "@/lib/types";
import { HairlineTable, HairlineRow } from "@/components/hairline-table";
import { setRequestLocale, getTranslations } from "next-intl/server";


const AVATAR_PALETTES = [
  { bg: "#DCEFE4", color: "#0E5C4A" },
  { bg: "#F6D9D2", color: "#BD4332" },
  { bg: "#E7E0F2", color: "#5A4C86" },
  { bg: "#F8E7C4", color: "#946312" },
  { bg: "#D6E4F2", color: "#2B5E8A" },
  { bg: "#E9F0D2", color: "#52610F" },
];
function avatarPalette(name: string) {
  const code = name.charCodeAt(0) + (name.charCodeAt(1) || 0);
  return AVATAR_PALETTES[code % AVATAR_PALETTES.length];
}

const fl: React.CSSProperties = {
  fontFamily: "'Space Mono',monospace", fontSize: "10.5px",
  textTransform: "uppercase", letterSpacing: ".5px", color: "#79746B",
};
const fv: React.CSSProperties = {
  background: "#F4F0E8", border: "1px solid #E7E1D4", borderRadius: "10px",
  padding: "10px 13px", fontSize: "14px", fontWeight: 600, marginTop: "7px", color: "#1A1A17",
};
const contractLabelKeys: Record<string, string> = {
  full_time: "contracts.full_time",
  part_time: "contracts.part_time",
  contractor: "contracts.contractor",
  internship: "contracts.internship",
};


type OrgNode = { id: string; name: string; role_title?: string | null; manager_id?: string | null };

function OrgAvatar({ name, size = 32 }: { name: string; size?: number }) {
  const pal = avatarPalette(name);
  return (
    <span style={{ width: size, height: size, borderRadius: "50%", background: pal.bg, color: pal.color, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: size * 0.34, flexShrink: 0 }}>
      {initials(name)}
    </span>
  );
}

function MiniOrgChart({ emp, manager, reports, t }: { emp: { id: string; name: string; role_title?: string | null }; manager: OrgNode | null; reports: OrgNode[]; t: any }) {
  const MAX_VISIBLE = 4;
  const visible = reports.slice(0, MAX_VISIBLE);
  const overflow = reports.length - MAX_VISIBLE;

  const connectorLine = (
    <div style={{ display: "flex", justifyContent: "flex-start", paddingLeft: "20px", height: "24px" }}>
      <div style={{ width: "2px", height: "100%", background: "#E7E1D4" }} />
    </div>
  );

  return (
    <div style={{ background: "#FCFAF6", border: "1px solid #E7E1D4", borderRadius: "16px", padding: "22px" }}>
      <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "16px", marginBottom: "18px" }}>{t("detail.info.teamPosition")}</div>

      {/* Manager */}
      {manager && (
        <>
          <Link href={`/employer/employees/${manager.id}`} style={{ display: "inline-flex", alignItems: "center", gap: "10px", background: "#F4F0E8", border: "1px solid #E7E1D4", borderRadius: "12px", padding: "10px 14px", textDecoration: "none", maxWidth: "340px" }}>
            <OrgAvatar name={manager.name} size={32} />
            <div>
              <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 700, fontSize: "13px", color: "#1A1A17" }}>{manager.name}</div>
              {manager.role_title && <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", color: "#79746B", marginTop: "2px" }}>{manager.role_title}</div>}
            </div>
          </Link>
          {connectorLine}
        </>
      )}

      {/* Current employee */}
      <div style={{ display: "inline-flex", alignItems: "center", gap: "10px", background: "#DCEFE4", border: "1.5px solid #0E5C4A", borderRadius: "12px", padding: "10px 14px", maxWidth: "340px" }}>
        <OrgAvatar name={emp.name} size={34} />
        <div>
          <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "13px", color: "#1A1A17" }}>{emp.name}</div>
          {emp.role_title && <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", color: "#0E5C4A", marginTop: "2px" }}>{emp.role_title}</div>}
        </div>
        <span style={{ marginLeft: "4px", fontFamily: "'Space Mono',monospace", fontSize: "9px", color: "#0E5C4A", background: "#C8EAD6", borderRadius: "999px", padding: "2px 8px", whiteSpace: "nowrap" }}>{t("detail.info.you")}</span>
      </div>

      {/* Reports */}
      {reports.length > 0 && (
        <>
          {connectorLine}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {visible.map((r) => (
              <Link key={r.id} href={`/employer/employees/${r.id}`} style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "#FCFAF6", border: "1px solid #E7E1D4", borderRadius: "11px", padding: "8px 12px", textDecoration: "none", transition: "background .12s" }}>
                <OrgAvatar name={r.name} size={26} />
                <div>
                  <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 700, fontSize: "12.5px", color: "#1A1A17" }}>{r.name}</div>
                  {r.role_title && <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "9.5px", color: "#79746B" }}>{r.role_title}</div>}
                </div>
              </Link>
            ))}
            {overflow > 0 && (
              <div style={{ display: "inline-flex", alignItems: "center", background: "#F4F0E8", border: "1px solid #E7E1D4", borderRadius: "11px", padding: "8px 14px", fontFamily: "'Space Mono',monospace", fontSize: "11px", color: "#79746B" }}>
                {t("detail.info.moreReports", { count: overflow })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function fmt(min: number) {
  return `${Math.floor(min / 60)}h${min % 60 > 0 ? ` ${min % 60}m` : ""}`;
}

const statusLabelKeys: Record<string, string> = {
  pending: "detail.absences.history.statusLabels.pending",
  approved: "detail.absences.history.statusLabels.approved",
  rejected: "detail.absences.history.statusLabels.rejected",
  cancelled: "detail.absences.history.statusLabels.cancelled",
};

const STATUS_CLR: Record<string, { bg: string; color: string }> = {
  pending:   { bg: "#F8E7C4", color: "#946312" },
  approved:  { bg: "#DCEFE3", color: "#1B6B4F" },
  rejected:  { bg: "#F6D9D2", color: "#BD4332" },
  cancelled: { bg: "#F4F0E8", color: "#79746B" },
};

export default async function EmployeePage({ params }: { params: { id: string; locale: string } }) {
  setRequestLocale(params.locale);
  const t = await getTranslations({ locale: params.locale, namespace: "People" });
  const supabase = createClient();


  const { data: employee } = await supabase.from("employees").select("*").eq("id", params.id).maybeSingle();
  if (!employee) notFound();
  const emp = employee as Employee;
  // Competencias evaluables del puesto (Desempeño, bloque 1): salen de la taxonomía vía el
  // cargo canónico de la ficha, con herencia del ancla ESCO si el cargo es de mercado.
  const competencies = await getRoleCompetencies(supabase, emp.job_title_id, params.locale);
  // Expediente: historial append-only de la persona (ciclos, resultados, planes, promociones).
  const timeline = await getEmployeeEvents(supabase, params.id);

  const [
    { data: manager }, { data: all }, { data: tasks }, { data: docs },
    { data: entries }, { data: absences }, { data: allowances },
    { data: schedules }, { data: compRecords },
  ] = await Promise.all([
    emp.manager_id
      ? supabase.from("employees").select("id, name, role_title").eq("id", emp.manager_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("employees").select("id, name, role_title, manager_id").eq("status", "active"),
    supabase.from("onboarding_tasks").select("*").eq("employee_id", params.id).order("order_index"),
    supabase.from("employee_documents").select("*").eq("employee_id", params.id).order("created_at", { ascending: false }),
    // New time tracking system
    supabase.from("time_entries")
      .select("*")
      .eq("employee_id", params.id)
      .eq("entry_type", "work")
      .order("date", { ascending: false })
      .limit(30),
    // New absence system
    supabase.from("absence_requests")
      .select("*, absence_types(name, color, icon, deducts_from_allowance, allowance_type_id)")
      .eq("employee_id", params.id)
      .order("start_date", { ascending: false }),
    // Allowances with policies (full fields for balance computation)
    supabase.from("employee_allowances")
      .select("id, valid_from, valid_until, allowance_policies(id, name, amount, cycle_type, cycle_start_month, expiry_rule, expiry_period_months, carryover_limit, allowance_type_id, allowance_types(id, name, unit))")
      .eq("employee_id", params.id)
      .order("valid_from", { ascending: false }),
    // Schedules
    supabase.from("employee_schedules")
      .select("*, work_schedule_templates(name, week_type, weeks:work_schedule_weeks(week_label, week_index, days:work_schedule_days(day_of_week, is_working_day, total_minutes)))")
      .eq("employee_id", params.id)
      .order("valid_from", { ascending: false }),
    // Compensation records
    supabase.from("compensation_records")
      .select("*")
      .eq("employee_id", params.id)
      .order("period_start", { ascending: false })
      .limit(12),
  ]);

  // ── Tipos-fila de los selects de arriba (cast único en la frontera de Supabase) ──
  type AbsenceRow = AbsenceRequest & {
    absence_types: { name: string; color: string | null; icon: string | null; deducts_from_allowance: boolean; allowance_type_id: string | null } | null;
  };
  type ScheduleDay = { day_of_week: number; is_working_day: boolean; total_minutes: number | null };
  type ScheduleWeek = { week_label: string | null; week_index: number; days: ScheduleDay[] | null };
  type ScheduleRow = {
    id: string; valid_from: string | null; valid_until: string | null;
    work_schedule_templates: { name: string; week_type: string; weeks: ScheduleWeek[] | null } | null;
  };
  const scheduleRows = (schedules ?? []) as unknown as ScheduleRow[];
  const timeEntries = (entries ?? []) as TimeEntry[];
  const compensationRows = (compRecords ?? []) as CompensationRecord[];

  const allowanceRows = (allowances ?? []) as unknown as AllowanceRow[];
  const absenceRows = (absences ?? []) as unknown as AbsenceRow[];

  // ── Adjustment logs (sequential — needs allowance IDs) ──
  const allowanceIds = allowanceRows.map((a) => a.id);
  const { data: rawAdjLogs } = await (
    allowanceIds.length > 0
      ? supabase.from("allowance_adjustment_log").select("*").in("employee_allowance_id", allowanceIds)
      : Promise.resolve({ data: [] as AllowanceAdjustmentLog[] })
  );
  const adjustmentLogs = (rawAdjLogs ?? []) as AllowanceAdjustmentLog[];

  // ── Saldo por bolsa ──
  // El cálculo es compartido con el portal del empleado (`lib/absences/balance.ts`): los dos
  // lados tienen que ver exactamente el mismo número de días disponibles.
  const policyBalances = computeBalances(allowanceRows, absenceRows, adjustmentLogs);


  const totalGranted  = policyBalances.reduce((s, b) => s + b.granted, 0);
  const usedDays      = policyBalances.reduce((s, b) => s + b.usedApproved, 0);
  const pendingDays   = policyBalances.reduce((s, b) => s + b.usedPending, 0);
  const availableDays = policyBalances.reduce((s, b) => s + b.available, 0);

  // ── Time entries totals ──
  const totalWorkedMin = (entries ?? []).reduce((sum, e) => sum + (e.duration_minutes ?? 0), 0);

  const av = avatarPalette(emp.name);
  const reports = ((all ?? []) as OrgNode[]).filter((e) => e.manager_id === emp.id);
  const mgr = manager as (typeof manager & { role_title?: string | null }) | null;

  return (
    <div>
      <Link href="/employer/employees" style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 600, color: "#79746B", marginBottom: "14px", textDecoration: "none" }}>
        <ArrowLeft size={15} /> {t("detail.backBtn")}
      </Link>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", flexWrap: "wrap", marginBottom: "20px" }}>
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <span style={{ width: "58px", height: "58px", flexShrink: 0, borderRadius: "50%", background: av.bg, color: av.color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "18px" }}>
            {initials(emp.name)}
          </span>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <h2 style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: "28px", letterSpacing: "-.8px", lineHeight: 1, margin: 0 }}>{emp.name}</h2>
              <span style={{ fontSize: "11.5px", fontWeight: 700, borderRadius: "999px", padding: "3px 10px", background: emp.status === "active" ? "#DCEFE3" : "#F6D9D2", color: emp.status === "active" ? "#1B6B4F" : "#BD4332" }}>
                {emp.status === "active" ? t("detail.status.active") : t("detail.status.inactive")}
              </span>
            </div>
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "12px", color: "#79746B", marginTop: "8px" }}>
              {[emp.role_title, emp.department].filter(Boolean).join(" · ")}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", flexWrap: "wrap" }}>
          {/* Acceso al portal del empleado (crea/vincula su cuenta) */}
          <InviteToPortal employeeId={emp.id} hasAccess={!!emp.user_id} hasEmail={!!emp.email} />
          <EmployeeForm employee={emp} managers={(all ?? []).map((e) => ({ id: e.id, name: e.name }))} trigger={
            <button style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "13px", color: "#fff", background: "#0E5C4A", border: "2px solid #1A1A17", borderRadius: "11px", padding: "9px 15px", boxShadow: "3px 3px 0 #1A1A17", cursor: "pointer" }}>
              {t("detail.actionsBtn")}
            </button>
          } />
        </div>
      </div>

      {/* Stat tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "20px" }}>
        {[
          { label: t("detail.stats.joined"), value: formatDate(emp.start_date) },
          { label: t("detail.stats.contract"), value: contractLabelKeys[emp.contract_type] ? t(contractLabelKeys[emp.contract_type] as any) : emp.contract_type },
          { label: t("detail.stats.reportsTo"), value: manager?.name ?? "—" },
          { label: t("detail.stats.timeoffDisp"), value: totalGranted > 0 ? `${availableDays} / ${totalGranted} ${t("detail.absences.balanceCard.daysUnit")}` : t("detail.stats.noPolicy") },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: "#FCFAF6", border: "1px solid #E7E1D4", borderRadius: "14px", padding: "16px 18px" }}>
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", textTransform: "uppercase", letterSpacing: ".5px", color: "#79746B" }}>{label}</div>
            <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "18px", marginTop: "6px", letterSpacing: "-.2px" }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">{t("detail.tabs.info")}</TabsTrigger>
          <TabsTrigger value="onboarding">{t("detail.tabs.onboarding")}</TabsTrigger>
          <TabsTrigger value="documents">{t("detail.tabs.documents", { count: (docs ?? []).length })}</TabsTrigger>
          <TabsTrigger value="ausencias">{t("detail.tabs.ausencias", { count: (absences ?? []).length })}</TabsTrigger>
          <TabsTrigger value="horas">{t("detail.tabs.horas")}</TabsTrigger>
          <TabsTrigger value="compensacion">{t("detail.tabs.compensacion")}</TabsTrigger>
          <TabsTrigger value="horario">{t("detail.tabs.horario")}</TabsTrigger>
          <TabsTrigger value="expediente">{t("detail.tabs.expediente")}</TabsTrigger>
        </TabsList>

        {/* ── Información ── */}
        <TabsContent value="info">
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "760px" }}>
            {/* Datos */}
            <div style={{ background: "#FCFAF6", border: "1px solid #E7E1D4", borderRadius: "16px", padding: "22px" }}>
              <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "16px", marginBottom: "18px" }}>{t("detail.info.title")}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                {[
                  { label: t("detail.info.name"), value: emp.name },
                  { label: t("detail.info.email"), value: emp.email ?? "—" },
                  { label: t("detail.info.id"), value: emp.id.slice(0, 8) + "…" },
                  { label: t("detail.info.joined"), value: formatDate(emp.start_date) },
                  { label: t("detail.info.contract"), value: contractLabelKeys[emp.contract_type] ? t(contractLabelKeys[emp.contract_type] as any) : emp.contract_type },
                  { label: t("detail.info.reportsTo"), value: mgr?.name ?? "—" },
                  { label: t("detail.info.dept"), value: emp.department ?? "—" },
                  { label: t("detail.info.role"), value: emp.role_title ?? "—" },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <label style={fl}>{label}</label>
                    <div style={fv}>{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Competencias del puesto (taxonomía) */}
            <RoleCompetencies data={competencies} locale={params.locale} roleTitle={emp.role_title} />

            {/* Mini org chart */}
            {(mgr || reports.length > 0) && (
              <MiniOrgChart emp={emp} manager={mgr} reports={reports} t={t} />
            )}
          </div>
        </TabsContent>

        {/* ── Onboarding ── */}
        <TabsContent value="onboarding">
          <OnboardingPanel employeeId={emp.id} tasks={(tasks ?? []) as OnboardingTask[]} />
        </TabsContent>

        {/* ── Documentos ── */}
        <TabsContent value="documents">
          <div style={{ maxWidth: "680px", display: "flex", flexDirection: "column", gap: "10px" }}>
            {(docs ?? []).map((d) => (
              <div key={d.id} style={{ display: "flex", alignItems: "center", gap: "13px", background: "#FCFAF6", border: "1px solid #E7E1D4", borderRadius: "13px", padding: "13px 16px" }}>
                <span style={{ width: "36px", height: "36px", borderRadius: "999px", background: "#F6E0D9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M6 2h8l4 4v16H6V2Z" stroke="#BD4332" strokeWidth="2" strokeLinejoin="round"/>
                    <path d="M14 2v4h4" stroke="#BD4332" strokeWidth="2"/>
                  </svg>
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "14px", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</div>
                  <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", color: "#79746B", marginTop: "2px" }}>{formatDate(d.created_at)}</div>
                </div>
                <FileLink bucket="documents" resourceId={d.id} label={t("detail.documents.download")} />
              </div>
            ))}
            {!(docs ?? []).length && <p style={{ fontSize: "13px", color: "#79746B" }}>{t("detail.documents.empty")}</p>}
            <DocumentUploader employeeId={emp.id} />
          </div>
        </TabsContent>

        {/* ── Ausencias (balances + historial) ── */}
        <TabsContent value="ausencias">
          <div style={{ maxWidth: "760px" }}>

            {/* ── Balances ── */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "16px" }}>{t("detail.absences.title")}</div>
              <Link href="/employer/settings/absences" style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "13px", color: "#fff", background: "#0E5C4A", border: "2px solid #1A1A17", borderRadius: "11px", padding: "8px 14px", boxShadow: "3px 3px 0 #1A1A17", textDecoration: "none", display: "inline-block" }}>
                {t("detail.absences.assignBtn")}
              </Link>
            </div>

            {!(allowances ?? []).length ? (
              <div style={{ background: "#FCFAF6", border: "2px solid #1A1A17", borderRadius: "14px", padding: "36px 24px", textAlign: "center", boxShadow: "3px 3px 0 #1A1A17", marginBottom: "32px" }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#CFC7B5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: "10px", display: "block", margin: "0 auto 10px" }}><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><line x1="9" y1="11" x2="15" y2="11"/><line x1="9" y1="15" x2="13" y2="15"/></svg>
                <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "15px", marginBottom: "6px" }}>{t("detail.absences.empty.title")}</div>
                <div style={{ fontSize: "13px", color: "#79746B", marginBottom: "16px" }}>{t("detail.absences.empty.desc")}</div>
                <Link href="/employer/settings/absences" style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 700, fontSize: "13px", color: "#0E5C4A", textDecoration: "underline" }}>
                  {t("detail.absences.empty.link")}
                </Link>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "36px" }}>
                {policyBalances.map((bal) => (
                  <AllowanceBalanceCard key={bal.allowanceId} bal={bal} />
                ))}
              </div>
            )}

            {/* ── Historial ── */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "16px" }}>{t("detail.absences.history.title")}</div>
              <Link href="/employer/timeoff" style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "13px", color: "#fff", background: "#0E5C4A", border: "2px solid #1A1A17", borderRadius: "11px", padding: "8px 14px", boxShadow: "3px 3px 0 #1A1A17", textDecoration: "none" }}>
                {t("detail.absences.history.newBtn")}
              </Link>
            </div>

            {(() => {
              const allAbs = absences ?? [];
              if (!allAbs.length) {
                return (
                  <div style={{ background: "#FCFAF6", border: "2px solid #1A1A17", borderRadius: "14px", padding: "36px 24px", textAlign: "center", boxShadow: "3px 3px 0 #1A1A17" }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#CFC7B5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", margin: "0 auto 10px" }}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "15px" }}>{t("detail.absences.history.empty")}</div>
                  </div>
                );
              }
              const byYear = new Map<number, typeof allAbs>();
              for (const r of allAbs) {
                const yr = new Date(r.start_date + "T12:00:00").getFullYear();
                if (!byYear.has(yr)) byYear.set(yr, []);
                byYear.get(yr)!.push(r);
              }
              const years = Array.from(byYear.keys()).sort((a, b) => b - a).slice(0, 3);
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                  {years.map((yr) => {
                    const rows = byYear.get(yr)!;
                    return (
                      <div key={yr}>
                        <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", textTransform: "uppercase", letterSpacing: ".6px", color: "#79746B", marginBottom: "10px", paddingLeft: "2px" }}>
                          {yr}
                        </div>
                        <HairlineTable
                          cols="2fr 1fr 1fr 0.5fr 1fr"
                          headers={[t("detail.absences.history.table.type"), t("detail.absences.history.table.since"), t("detail.absences.history.table.until"), t("detail.absences.history.table.days"), t("detail.absences.history.table.status")]}
                          align={["left", "left", "left", "right", "left"]}
                        >
                          {rows.map((r) => {
                            const atype = r.absence_types;
                            const sc = STATUS_CLR[r.status] ?? STATUS_CLR.pending;
                            return (
                              <HairlineRow key={r.id} align={["left", "left", "left", "right", "left"]}>
                                <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                                  {atype?.icon && <span style={{ fontSize: "16px" }}>{atype.icon}</span>}
                                  <span style={{ fontWeight: 600 }}>{atype?.name ?? "—"}</span>
                                </div>
                                <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "11px" }}>{formatDate(r.start_date)}</span>
                                <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "11px" }}>{formatDate(r.end_date)}</span>
                                <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800 }}>{r.working_days_count}</span>
                                <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", letterSpacing: "1px", textTransform: "uppercase", color: sc.color, background: sc.bg, borderRadius: "6px", padding: "3px 8px" }}>
                                  {statusLabelKeys[r.status] ? t(statusLabelKeys[r.status] as any) : r.status}
                                </span>
                              </HairlineRow>
                            );
                          })}
                        </HairlineTable>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </TabsContent>

        {/* ── Horas ── */}
        <TabsContent value="horas">
          <div style={{ maxWidth: "760px" }}>
            {/* Summary tiles */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "14px", marginBottom: "20px" }}>
              {[
                { label: t("detail.hours.tiles.total"), value: fmt(totalWorkedMin) },
                { label: t("detail.hours.tiles.count"), value: String((entries ?? []).length) },
                { label: t("detail.hours.tiles.avg"), value: (entries ?? []).length > 0 ? fmt(Math.round(totalWorkedMin / (entries ?? []).length)) : "—" },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: "#FCFAF6", border: "1px solid #E7E1D4", borderRadius: "14px", padding: "16px 18px" }}>
                  <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: ".5px", color: "#79746B", marginBottom: "6px" }}>{label}</div>
                  <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: "26px", letterSpacing: "-1px" }}>{value}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px" }}>
              <Link href="/employer/hours" style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "13px", color: "#fff", background: "#0E5C4A", border: "2px solid #1A1A17", borderRadius: "11px", padding: "8px 14px", boxShadow: "3px 3px 0 #1A1A17", textDecoration: "none" }}>
                {t("detail.hours.logBtn")}
              </Link>
            </div>

            {!(entries ?? []).length ? (
              <div style={{ background: "#FCFAF6", border: "2px solid #1A1A17", borderRadius: "14px", padding: "36px 24px", textAlign: "center", boxShadow: "3px 3px 0 #1A1A17" }}>
                <div style={{ fontSize: "32px", marginBottom: "10px" }}>⏱️</div>
                <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "15px" }}>{t("detail.hours.empty")}</div>
              </div>
            ) : (
              <HairlineTable
                cols="1fr 0.8fr 0.8fr 0.8fr 2fr"
                headers={[t("detail.hours.table.date"), t("detail.hours.table.checkin"), t("detail.hours.table.checkout"), t("detail.hours.table.duration"), t("detail.hours.table.notes")]}
                align={["left", "left", "left", "right", "left"]}
              >
                {timeEntries.map((e) => {
                  const fmtTime = (iso: string) => iso?.includes("T")
                    ? new Date(iso).toLocaleTimeString(params.locale, { hour: "2-digit", minute: "2-digit" })
                    : iso?.slice(0, 5) ?? "—";
                  return (
                    <HairlineRow key={e.id} align={["left", "left", "left", "right", "left"]}>
                      <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "11px" }}>{formatDate(e.date)}</span>
                      <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "11px" }}>{fmtTime(e.start_time)}</span>
                      <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "11px" }}>{e.end_time ? fmtTime(e.end_time) : <span style={{ color: "#79746B" }}>{t("detail.hours.activeStatus")}</span>}</span>
                      <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800 }}>{e.duration_minutes != null ? fmt(e.duration_minutes) : "—"}</span>
                      <span style={{ color: "#79746B" }}>{e.comment ?? "—"}</span>
                    </HairlineRow>
                  );
                })}
              </HairlineTable>
            )}
          </div>
        </TabsContent>

        {/* ── Compensación ── */}
        <TabsContent value="compensacion">
          <div style={{ maxWidth: "760px" }}>
            {(() => {
              const totalBal = compensationRows.reduce((sum, r) => sum + Number(r.balance_minutes ?? 0), 0);
              const totalComp = compensationRows.reduce((sum, r) => sum + Number(r.compensated_minutes ?? 0), 0);
              const pending = totalBal - totalComp;
              return (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "14px", marginBottom: "20px" }}>
                  {[
                    { label: t("detail.compensation.tiles.balance"), value: (totalBal > 0 ? "+" : "") + fmt(totalBal), color: totalBal >= 0 ? "#0E5C4A" : "#BD4332" },
                    { label: t("detail.compensation.tiles.compensated"), value: fmt(totalComp), color: "#1A1A17" },
                    { label: t("detail.compensation.tiles.pending"), value: fmt(Math.abs(pending)), color: pending !== 0 ? "#946312" : "#79746B" },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ background: "#FCFAF6", border: "1px solid #E7E1D4", borderRadius: "14px", padding: "16px 18px" }}>
                      <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: ".5px", color: "#79746B", marginBottom: "6px" }}>{label}</div>
                      <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: "26px", letterSpacing: "-1px", color }}>{value}</div>
                    </div>
                  ))}
                </div>
              );
            })()}

            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px" }}>
              <Link href="/employer/hours/compensation" style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "13px", color: "#fff", background: "#0E5C4A", border: "2px solid #1A1A17", borderRadius: "11px", padding: "8px 14px", boxShadow: "3px 3px 0 #1A1A17", textDecoration: "none" }}>
                {t("detail.compensation.manageBtn")}
              </Link>
            </div>

            {!(compRecords ?? []).length ? (
              <div style={{ background: "#FCFAF6", border: "2px solid #1A1A17", borderRadius: "14px", padding: "36px 24px", textAlign: "center", boxShadow: "3px 3px 0 #1A1A17" }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#CFC7B5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", margin: "0 auto 10px" }}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="3" y1="20" x2="21" y2="20"/></svg>
                <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "15px" }}>{t("detail.compensation.empty")}</div>
              </div>
            ) : (
              <HairlineTable
                cols="1.5fr 1fr 1fr 1fr 1fr"
                headers={[t("detail.compensation.table.period"), t("detail.compensation.table.scheduled"), t("detail.compensation.table.worked"), t("detail.compensation.table.balance"), t("detail.compensation.table.type")]}
                align={["left", "right", "right", "right", "left"]}
              >
                {compensationRows.map((r) => {
                  const bal = Number(r.balance_minutes ?? 0);
                  const balColor = bal > 0 ? "#1B6B4F" : bal < 0 ? "#BD4332" : "#79746B";
                  const balBg = bal > 0 ? "#DCEFE3" : bal < 0 ? "#F6D9D2" : "#F4F0E8";
                  return (
                    <HairlineRow key={r.id} align={["left", "right", "right", "right", "left"]}>
                      <div>
                        <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "11px" }}>{formatDate(r.period_start)}</div>
                        <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", color: "#79746B" }}>→ {formatDate(r.period_end)}</div>
                      </div>
                      <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "11px" }}>{fmt(r.scheduled_minutes)}</span>
                      <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "11px" }}>{fmt(r.worked_minutes)}</span>
                      <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "11px", fontWeight: 700, color: balColor, background: balBg, borderRadius: "6px", padding: "3px 8px" }}>
                        {bal > 0 ? "+" : ""}{fmt(bal)}
                      </span>
                      <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", textTransform: "uppercase", color: "#79746B" }}>
                        {r.compensation_type === "time_off" ? t("detail.compensation.types.time_off") : t("detail.compensation.types.payout")}
                      </span>
                    </HairlineRow>
                  );
                })}
              </HairlineTable>
            )}
          </div>
        </TabsContent>

        {/* ── Horario ── */}
        <TabsContent value="horario">
          <div style={{ maxWidth: "760px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "16px" }}>{t("detail.schedule.title")}</div>
              <Link href="/employer/settings/schedules" style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "13px", color: "#fff", background: "#0E5C4A", border: "2px solid #1A1A17", borderRadius: "11px", padding: "8px 14px", boxShadow: "3px 3px 0 #1A1A17", textDecoration: "none", display: "inline-block" }}>
                {t("detail.schedule.assignBtn")}
              </Link>
            </div>

            {!(schedules ?? []).length ? (
              <div style={{ background: "#FCFAF6", border: "2px solid #1A1A17", borderRadius: "14px", padding: "36px 24px", textAlign: "center", boxShadow: "3px 3px 0 #1A1A17" }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#CFC7B5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", margin: "0 auto 10px" }}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "15px", marginBottom: "6px" }}>{t("detail.schedule.empty.title")}</div>
                <div style={{ fontSize: "13px", color: "#79746B", marginBottom: "16px" }}>{t("detail.schedule.empty.desc")}</div>
                <Link href="/employer/settings/schedules" style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 700, fontSize: "13px", color: "#0E5C4A", textDecoration: "underline" }}>
                  {t("detail.schedule.empty.link")}
                </Link>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {scheduleRows.map((s) => {
                  const tpl = s.work_schedule_templates;
                  const DAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"];
                  const weeks: ScheduleWeek[] = tpl?.weeks
                    ? [...tpl.weeks].sort((a, b) => a.week_index - b.week_index)
                    : [];
                  const weekTypeLabel = tpl?.week_type === "single" ? t("detail.schedule.card.types.single") : tpl?.week_type === "rotating" ? t("detail.schedule.card.types.rotating") : tpl?.week_type ?? "—";
                  return (
                    <div key={s.id} style={{ background: "#FCFAF6", border: "2px solid #1A1A17", borderRadius: "14px", padding: "20px", boxShadow: "3px 3px 0 #1A1A17" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", marginBottom: "16px" }}>
                        <div>
                          <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "15px", marginBottom: "4px" }}>{tpl?.name ?? "—"}</div>
                          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", textTransform: "uppercase", letterSpacing: ".5px", color: "#79746B" }}>{weekTypeLabel}</div>
                        </div>
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", color: "#79746B", background: "#F4F0E8", border: "1px solid #E7E1D4", borderRadius: "6px", padding: "3px 8px" }}>
                            {s.valid_from ? t("detail.schedule.card.since", { date: formatDate(s.valid_from) }) : "—"}
                          </span>
                          <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", color: "#79746B", background: "#F4F0E8", border: "1px solid #E7E1D4", borderRadius: "6px", padding: "3px 8px" }}>
                            {s.valid_until ? t("detail.schedule.card.until", { date: formatDate(s.valid_until) }) : t("detail.schedule.card.noUntil")}
                          </span>
                        </div>
                      </div>
                      {weeks.map((week) => {
                        const sortedDays = [...(week.days ?? [])].sort((a, b) => a.day_of_week - b.day_of_week);
                        const weekTotalMin = sortedDays.reduce((sum, d) => sum + (d.is_working_day ? Number(d.total_minutes ?? 0) : 0), 0);
                        return (
                          <div key={week.week_index} style={{ marginBottom: "14px" }}>
                            {weeks.length > 1 && (
                              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", textTransform: "uppercase", letterSpacing: ".5px", color: "#79746B", marginBottom: "8px" }}>
                                {week.week_label ?? t("detail.schedule.card.weekLabel", { index: week.week_index + 1 })}
                              </div>
                            )}
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "6px" }}>
                              {DAY_LABELS.map((label, idx) => {
                                const day = sortedDays.find((d) => d.day_of_week === idx);
                                const isWorking = day?.is_working_day ?? false;
                                const h = isWorking && day?.total_minutes ? `${(Number(day.total_minutes) / 60).toFixed(1).replace(/\.0$/, "")}h` : "—";
                                return (
                                  <div key={idx} style={{ background: isWorking ? "#0E5C4A" : "#E7E1D4", border: "1.5px solid #1A1A17", borderRadius: "10px", padding: "10px 6px", textAlign: "center" }}>
                                    <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "11px", fontWeight: 700, color: isWorking ? "#EAF7C4" : "#79746B", marginBottom: "4px" }}>{label}</div>
                                    <div style={{ fontFamily: "'Archivo',sans-serif", fontSize: "12px", fontWeight: 800, color: isWorking ? "#fff" : "#79746B" }}>{h}</div>
                                  </div>
                                );
                              })}
                            </div>
                            <div style={{ marginTop: "8px", textAlign: "right", fontFamily: "'Space Mono',monospace", fontSize: "11px", color: "#0E5C4A", fontWeight: 700 }}>
                              {t("detail.schedule.card.totalWeek", { hours: (weekTotalMin / 60).toFixed(1).replace(/\.0$/, "") })}
                            </div>
                          </div>
                        );
                      })}
                      {weeks.length === 0 && <p style={{ fontSize: "13px", color: "#79746B", margin: 0 }}>{t("detail.schedule.card.emptyWeeks")}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Expediente — historial append-only de la persona (Desempeño, bloque 1) */}
        <TabsContent value="expediente">
          <div style={{ maxWidth: "760px" }}>
            <EmployeeTimeline events={timeline} locale={params.locale} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
