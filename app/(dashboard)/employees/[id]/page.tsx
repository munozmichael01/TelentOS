import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { OnboardingPanel } from "@/components/features/onboarding-panel";
import { DocumentUploader } from "@/components/features/document-uploader";
import { FileLink } from "@/components/features/file-link";
import { EmployeeForm } from "@/components/features/employee-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/server";
import { formatDate, initials } from "@/lib/utils";
import type { Employee, OnboardingTask, AbsenceRequest, TimeEntry, CompensationRecord } from "@/lib/types";

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
const contractLabel: Record<string, string> = {
  full_time: "Jornada completa", part_time: "Jornada parcial",
  contractor: "Contrato / freelance", internship: "Prácticas",
};

function fmt(min: number) {
  return `${Math.floor(min / 60)}h${min % 60 > 0 ? ` ${min % 60}m` : ""}`;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente", approved: "Aprobada", rejected: "Rechazada", cancelled: "Cancelada",
};
const STATUS_CLR: Record<string, { bg: string; color: string }> = {
  pending:   { bg: "#F8E7C4", color: "#946312" },
  approved:  { bg: "#DCEFE3", color: "#1B6B4F" },
  rejected:  { bg: "#F6D9D2", color: "#BD4332" },
  cancelled: { bg: "#F4F0E8", color: "#79746B" },
};

export default async function EmployeePage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: employee } = await supabase.from("employees").select("*").eq("id", params.id).maybeSingle();
  if (!employee) notFound();
  const emp = employee as Employee;

  const [
    { data: manager }, { data: all }, { data: tasks }, { data: docs },
    { data: entries }, { data: absences }, { data: allowances },
    { data: schedules }, { data: compRecords },
  ] = await Promise.all([
    emp.manager_id
      ? supabase.from("employees").select("id, name").eq("id", emp.manager_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("employees").select("id, name").eq("status", "active"),
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
      .select("*, absence_types(name, color, icon, deducts_from_allowance)")
      .eq("employee_id", params.id)
      .order("start_date", { ascending: false }),
    // Allowances with policies
    supabase.from("employee_allowances")
      .select("id, valid_from, valid_until, allowance_policies(name, amount, allowance_types(name, unit))")
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

  // ── Balance calculation (simplified) ──
  const totalGranted = (allowances ?? []).reduce((sum, a) => {
    const p = (a as any).allowance_policies;
    return sum + Number(p?.amount ?? 0);
  }, 0);
  const usedDays = (absences ?? [])
    .filter((r: any) => r.status === "approved" && r.absence_types?.deducts_from_allowance)
    .reduce((sum: number, r: any) => sum + Number(r.working_days_count ?? 0), 0);
  const pendingDays = (absences ?? [])
    .filter((r: any) => r.status === "pending" && r.absence_types?.deducts_from_allowance)
    .reduce((sum: number, r: any) => sum + Number(r.working_days_count ?? 0), 0);
  const availableDays = Math.max(0, totalGranted - usedDays - pendingDays);

  // ── Time entries totals ──
  const totalWorkedMin = (entries ?? []).reduce((sum, e) => sum + (e.duration_minutes ?? 0), 0);

  const av = avatarPalette(emp.name);

  return (
    <div>
      <Link href="/employees" style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 600, color: "#79746B", marginBottom: "14px", textDecoration: "none" }}>
        <ArrowLeft size={15} /> Empleados
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
                {emp.status === "active" ? "Activo" : "Inactivo"}
              </span>
            </div>
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "12px", color: "#79746B", marginTop: "8px" }}>
              {[emp.role_title, emp.department].filter(Boolean).join(" · ")}
            </div>
          </div>
        </div>
        <EmployeeForm employee={emp} managers={(all ?? []).map((e) => ({ id: e.id, name: e.name }))} trigger={
          <button style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "13px", color: "#fff", background: "#0E5C4A", border: "2px solid #1A1A17", borderRadius: "11px", padding: "9px 15px", boxShadow: "3px 3px 0 #1A1A17", cursor: "pointer" }}>
            Acciones ▾
          </button>
        } />
      </div>

      {/* Stat tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "20px" }}>
        {[
          { label: "Incorporación", value: formatDate(emp.start_date) },
          { label: "Contrato", value: contractLabel[emp.contract_type] ?? emp.contract_type },
          { label: "Reporta a", value: manager?.name ?? "—" },
          { label: "Permisos disp.", value: totalGranted > 0 ? `${availableDays} / ${totalGranted} días` : "Sin política" },
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
          <TabsTrigger value="info">Información</TabsTrigger>
          <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
          <TabsTrigger value="documents">Documentos ({(docs ?? []).length})</TabsTrigger>
          <TabsTrigger value="ausencias">Ausencias ({(absences ?? []).length})</TabsTrigger>
          <TabsTrigger value="horas">Horas</TabsTrigger>
          <TabsTrigger value="compensacion">Compensación</TabsTrigger>
          <TabsTrigger value="permisos">Permisos</TabsTrigger>
          <TabsTrigger value="horario">Horario</TabsTrigger>
        </TabsList>

        {/* ── Información ── */}
        <TabsContent value="info">
          <div style={{ background: "#FCFAF6", border: "1px solid #E7E1D4", borderRadius: "16px", padding: "22px", maxWidth: "760px" }}>
            <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "16px", marginBottom: "18px" }}>Datos del empleado</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              {[
                { label: "Nombre", value: emp.name },
                { label: "Email", value: emp.email ?? "—" },
                { label: "ID empleado", value: emp.id.slice(0, 8) + "…" },
                { label: "Incorporación", value: formatDate(emp.start_date) },
                { label: "Contrato", value: contractLabel[emp.contract_type] ?? emp.contract_type },
                { label: "Manager", value: manager?.name ?? "—" },
                { label: "Departamento", value: emp.department ?? "—" },
                { label: "Rol", value: emp.role_title ?? "—" },
              ].map(({ label, value }) => (
                <div key={label}>
                  <label style={fl}>{label}</label>
                  <div style={fv}>{value}</div>
                </div>
              ))}
            </div>
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
                <span style={{ width: "36px", height: "36px", borderRadius: "9px", background: "#F6E0D9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M6 2h8l4 4v16H6V2Z" stroke="#BD4332" strokeWidth="2" strokeLinejoin="round"/>
                    <path d="M14 2v4h4" stroke="#BD4332" strokeWidth="2"/>
                  </svg>
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "14px", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</div>
                  <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", color: "#79746B", marginTop: "2px" }}>{formatDate(d.created_at)}</div>
                </div>
                <FileLink bucket="documents" path={d.file_url} label="Descargar" />
              </div>
            ))}
            {!(docs ?? []).length && <p style={{ fontSize: "13px", color: "#79746B" }}>Sin documentos adjuntos.</p>}
            <DocumentUploader employeeId={emp.id} />
          </div>
        </TabsContent>

        {/* ── Ausencias ── */}
        <TabsContent value="ausencias">
          <div style={{ maxWidth: "760px" }}>
            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "14px", marginBottom: "20px" }}>
              {[
                { label: "Disponibles", value: availableDays, sub: `de ${totalGranted} concedidos` },
                { label: "Usados", value: usedDays, sub: "días aprobados" },
                { label: "Pendientes", value: pendingDays, sub: "por aprobar" },
              ].map(({ label, value, sub }) => (
                <div key={label} style={{ background: "#FCFAF6", border: "1px solid #E7E1D4", borderRadius: "14px", padding: "16px 18px" }}>
                  <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", textTransform: "uppercase", letterSpacing: ".5px", color: "#79746B" }}>{label}</div>
                  <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: "30px", letterSpacing: "-1px", marginTop: "6px" }}>{value}</div>
                  <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", color: "#79746B", marginTop: "2px" }}>{sub}</div>
                </div>
              ))}
            </div>

            {/* Link to manage */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px" }}>
              <Link href="/timeoff" style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "13px", color: "#fff", background: "#0E5C4A", border: "2px solid #1A1A17", borderRadius: "11px", padding: "8px 14px", boxShadow: "3px 3px 0 #1A1A17", textDecoration: "none" }}>
                + Nueva ausencia
              </Link>
            </div>

            {/* Absence list */}
            {!(absences ?? []).length ? (
              <div style={{ background: "#FCFAF6", border: "2px solid #1A1A17", borderRadius: "14px", padding: "36px 24px", textAlign: "center", boxShadow: "3px 3px 0 #1A1A17" }}>
                <div style={{ fontSize: "32px", marginBottom: "10px" }}>🌴</div>
                <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "15px" }}>Sin ausencias registradas</div>
              </div>
            ) : (
              <div style={{ border: "2px solid #1A1A17", boxShadow: "3px 3px 0 #1A1A17", borderRadius: "12px", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ background: "#F4F0E8", borderBottom: "2px solid #E7E1D4" }}>
                      {["Tipo", "Desde", "Hasta", "Días", "Estado"].map(h => (
                        <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontFamily: "'Space Mono',monospace", fontSize: "10px", letterSpacing: "1px", textTransform: "uppercase", color: "#79746B", fontWeight: 500 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(absences ?? []).map((r: any, i: number) => {
                      const atype = r.absence_types;
                      const sc = STATUS_CLR[r.status] ?? STATUS_CLR.pending;
                      return (
                        <tr key={r.id} style={{ background: i % 2 === 0 ? "#FCFAF6" : "#F4F0E8", borderBottom: i < (absences ?? []).length - 1 ? "1px solid #E7E1D4" : undefined }}>
                          <td style={{ padding: "12px 14px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                              {atype?.icon && <span style={{ fontSize: "16px" }}>{atype.icon}</span>}
                              <span style={{ fontWeight: 600 }}>{atype?.name ?? "—"}</span>
                            </div>
                          </td>
                          <td style={{ padding: "12px 14px", fontFamily: "'Space Mono',monospace", fontSize: "11px" }}>{formatDate(r.start_date)}</td>
                          <td style={{ padding: "12px 14px", fontFamily: "'Space Mono',monospace", fontSize: "11px" }}>{formatDate(r.end_date)}</td>
                          <td style={{ padding: "12px 14px", fontFamily: "'Archivo',sans-serif", fontWeight: 800 }}>{r.working_days_count}</td>
                          <td style={{ padding: "12px 14px" }}>
                            <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", letterSpacing: "1px", textTransform: "uppercase", color: sc.color, background: sc.bg, borderRadius: "6px", padding: "3px 8px" }}>
                              {STATUS_LABEL[r.status] ?? r.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Horas ── */}
        <TabsContent value="horas">
          <div style={{ maxWidth: "760px" }}>
            {/* Summary tiles */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "14px", marginBottom: "20px" }}>
              {[
                { label: "Total (últimos 30 registros)", value: fmt(totalWorkedMin) },
                { label: "Registros", value: String((entries ?? []).length) },
                { label: "Promedio/día", value: (entries ?? []).length > 0 ? fmt(Math.round(totalWorkedMin / (entries ?? []).length)) : "—" },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: "#FCFAF6", border: "1px solid #E7E1D4", borderRadius: "14px", padding: "16px 18px" }}>
                  <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: ".5px", color: "#79746B", marginBottom: "6px" }}>{label}</div>
                  <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: "26px", letterSpacing: "-1px" }}>{value}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px" }}>
              <Link href="/horas" style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "13px", color: "#fff", background: "#0E5C4A", border: "2px solid #1A1A17", borderRadius: "11px", padding: "8px 14px", boxShadow: "3px 3px 0 #1A1A17", textDecoration: "none" }}>
                Registrar horas
              </Link>
            </div>

            {!(entries ?? []).length ? (
              <div style={{ background: "#FCFAF6", border: "2px solid #1A1A17", borderRadius: "14px", padding: "36px 24px", textAlign: "center", boxShadow: "3px 3px 0 #1A1A17" }}>
                <div style={{ fontSize: "32px", marginBottom: "10px" }}>⏱️</div>
                <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "15px" }}>Sin horas registradas</div>
              </div>
            ) : (
              <div style={{ border: "2px solid #1A1A17", boxShadow: "3px 3px 0 #1A1A17", borderRadius: "12px", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ background: "#F4F0E8", borderBottom: "2px solid #E7E1D4" }}>
                      {["Fecha", "Entrada", "Salida", "Duración", "Notas"].map(h => (
                        <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontFamily: "'Space Mono',monospace", fontSize: "10px", letterSpacing: "1px", textTransform: "uppercase", color: "#79746B", fontWeight: 500 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(entries ?? []).map((e: any, i: number) => {
                      const fmtTime = (iso: string) => iso?.includes("T")
                        ? new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
                        : iso?.slice(0, 5) ?? "—";
                      return (
                        <tr key={e.id} style={{ background: i % 2 === 0 ? "#FCFAF6" : "#F4F0E8", borderBottom: i < (entries ?? []).length - 1 ? "1px solid #E7E1D4" : undefined }}>
                          <td style={{ padding: "12px 14px", fontFamily: "'Space Mono',monospace", fontSize: "11px" }}>{formatDate(e.date)}</td>
                          <td style={{ padding: "12px 14px", fontFamily: "'Space Mono',monospace", fontSize: "11px" }}>{fmtTime(e.start_time)}</td>
                          <td style={{ padding: "12px 14px", fontFamily: "'Space Mono',monospace", fontSize: "11px" }}>{e.end_time ? fmtTime(e.end_time) : <span style={{ color: "#79746B" }}>Activo</span>}</td>
                          <td style={{ padding: "12px 14px", fontFamily: "'Archivo',sans-serif", fontWeight: 800 }}>{e.duration_minutes != null ? fmt(e.duration_minutes) : "—"}</td>
                          <td style={{ padding: "12px 14px", color: "#79746B" }}>{e.comment ?? "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Compensación ── */}
        <TabsContent value="compensacion">
          <div style={{ maxWidth: "760px" }}>
            {(() => {
              const totalBal = (compRecords ?? []).reduce((sum: number, r: any) => sum + Number(r.balance_minutes ?? 0), 0);
              const totalComp = (compRecords ?? []).reduce((sum: number, r: any) => sum + Number(r.compensated_minutes ?? 0), 0);
              const pending = totalBal - totalComp;
              return (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "14px", marginBottom: "20px" }}>
                  {[
                    { label: "Balance total", value: (totalBal > 0 ? "+" : "") + fmt(totalBal), color: totalBal >= 0 ? "#0E5C4A" : "#BD4332" },
                    { label: "Compensado", value: fmt(totalComp), color: "#1A1A17" },
                    { label: "Pendiente", value: fmt(Math.abs(pending)), color: pending !== 0 ? "#946312" : "#79746B" },
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
              <Link href="/horas/compensacion" style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "13px", color: "#fff", background: "#0E5C4A", border: "2px solid #1A1A17", borderRadius: "11px", padding: "8px 14px", boxShadow: "3px 3px 0 #1A1A17", textDecoration: "none" }}>
                Gestionar compensaciones
              </Link>
            </div>

            {!(compRecords ?? []).length ? (
              <div style={{ background: "#FCFAF6", border: "2px solid #1A1A17", borderRadius: "14px", padding: "36px 24px", textAlign: "center", boxShadow: "3px 3px 0 #1A1A17" }}>
                <div style={{ fontSize: "32px", marginBottom: "10px" }}>📊</div>
                <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "15px" }}>Sin registros de compensación</div>
              </div>
            ) : (
              <div style={{ border: "2px solid #1A1A17", boxShadow: "3px 3px 0 #1A1A17", borderRadius: "12px", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ background: "#F4F0E8", borderBottom: "2px solid #E7E1D4" }}>
                      {["Período", "Programadas", "Trabajadas", "Balance", "Tipo"].map(h => (
                        <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontFamily: "'Space Mono',monospace", fontSize: "10px", letterSpacing: "1px", textTransform: "uppercase", color: "#79746B", fontWeight: 500 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(compRecords ?? []).map((r: any, i: number) => {
                      const bal = Number(r.balance_minutes ?? 0);
                      const balColor = bal > 0 ? "#1B6B4F" : bal < 0 ? "#BD4332" : "#79746B";
                      const balBg = bal > 0 ? "#DCEFE3" : bal < 0 ? "#F6D9D2" : "#F4F0E8";
                      return (
                        <tr key={r.id} style={{ background: i % 2 === 0 ? "#FCFAF6" : "#F4F0E8", borderBottom: i < (compRecords ?? []).length - 1 ? "1px solid #E7E1D4" : undefined }}>
                          <td style={{ padding: "12px 14px" }}>
                            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "11px" }}>{formatDate(r.period_start)}</div>
                            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", color: "#79746B" }}>→ {formatDate(r.period_end)}</div>
                          </td>
                          <td style={{ padding: "12px 14px", fontFamily: "'Space Mono',monospace", fontSize: "11px" }}>{fmt(r.scheduled_minutes)}</td>
                          <td style={{ padding: "12px 14px", fontFamily: "'Space Mono',monospace", fontSize: "11px" }}>{fmt(r.worked_minutes)}</td>
                          <td style={{ padding: "12px 14px" }}>
                            <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "11px", fontWeight: 700, color: balColor, background: balBg, borderRadius: "6px", padding: "3px 8px" }}>
                              {bal > 0 ? "+" : ""}{fmt(bal)}
                            </span>
                          </td>
                          <td style={{ padding: "12px 14px", fontFamily: "'Space Mono',monospace", fontSize: "10px", textTransform: "uppercase", color: "#79746B" }}>
                            {r.compensation_type === "time_off" ? "Tiempo libre" : "Pago"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Permisos ── */}
        <TabsContent value="permisos">
          <div style={{ maxWidth: "680px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "16px" }}>Permisos y ausencias</div>
              <Link href="/settings/absences" style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "13px", color: "#fff", background: "#0E5C4A", border: "2px solid #1A1A17", borderRadius: "11px", padding: "8px 14px", boxShadow: "3px 3px 0 #1A1A17", textDecoration: "none", display: "inline-block" }}>
                Asignar permiso
              </Link>
            </div>

            {!(allowances ?? []).length ? (
              <div style={{ background: "#FCFAF6", border: "2px solid #1A1A17", borderRadius: "14px", padding: "36px 24px", textAlign: "center", boxShadow: "3px 3px 0 #1A1A17" }}>
                <div style={{ fontSize: "32px", marginBottom: "10px" }}>📋</div>
                <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "15px", marginBottom: "6px" }}>Sin permisos asignados</div>
                <div style={{ fontSize: "13px", color: "#79746B", marginBottom: "16px" }}>Los nuevos empleados reciben la política por defecto automáticamente.</div>
                <Link href="/settings/absences" style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 700, fontSize: "13px", color: "#0E5C4A", textDecoration: "underline" }}>
                  Ir a Políticas de ausencias →
                </Link>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {(allowances ?? []).map((a: any) => {
                  const policy = a.allowance_policies as any;
                  const atype = policy?.allowance_types as any;
                  const granted = Number(policy?.amount ?? 0);
                  // Compute used for this specific policy's allowance_type
                  const policyUsed = usedDays; // simplified — fine for single policy
                  const policyPending = pendingDays;
                  const policyAvail = Math.max(0, granted - policyUsed - policyPending);
                  const pct = granted > 0 ? Math.min(100, Math.round((policyUsed / granted) * 100)) : 0;
                  return (
                    <div key={a.id} style={{ background: "#FCFAF6", border: "2px solid #1A1A17", borderRadius: "14px", padding: "18px 20px", boxShadow: "3px 3px 0 #1A1A17" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                        <div>
                          <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "15px", marginBottom: "4px" }}>{policy?.name ?? "—"}</div>
                          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", textTransform: "uppercase", letterSpacing: ".5px", color: "#79746B" }}>
                            {atype?.name ?? "—"} · {atype?.unit ?? "—"}
                          </div>
                        </div>
                        <div style={{ background: "#EAF7C4", border: "1.5px solid #1A1A17", borderRadius: "999px", padding: "4px 12px", fontSize: "12px", fontWeight: 700, color: "#0E5C4A", whiteSpace: "nowrap" }}>
                          {policyAvail} / {granted} {atype?.unit ?? ""}
                        </div>
                      </div>

                      {/* Real progress bar */}
                      <div style={{ marginTop: "14px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                          <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", color: "#79746B" }}>{policyUsed} usados · {policyPending} pendientes</span>
                          <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", color: "#79746B" }}>{pct}%</span>
                        </div>
                        <div style={{ height: "8px", background: "#E7E1D4", borderRadius: "999px", overflow: "hidden", border: "1px solid #1A1A17" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: pct > 80 ? "#F1543F" : "#0E5C4A", borderRadius: "999px", transition: "width .3s" }} />
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: "8px", marginTop: "12px", flexWrap: "wrap" }}>
                        <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", color: "#79746B", background: "#F4F0E8", border: "1px solid #E7E1D4", borderRadius: "6px", padding: "3px 8px" }}>
                          Desde: {a.valid_from ? formatDate(a.valid_from) : "—"}
                        </span>
                        <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", color: "#79746B", background: "#F4F0E8", border: "1px solid #E7E1D4", borderRadius: "6px", padding: "3px 8px" }}>
                          Hasta: {a.valid_until ? formatDate(a.valid_until) : "Sin fecha de fin"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Horario ── */}
        <TabsContent value="horario">
          <div style={{ maxWidth: "760px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "16px" }}>Horario de trabajo</div>
              <Link href="/settings/schedules" style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "13px", color: "#fff", background: "#0E5C4A", border: "2px solid #1A1A17", borderRadius: "11px", padding: "8px 14px", boxShadow: "3px 3px 0 #1A1A17", textDecoration: "none", display: "inline-block" }}>
                Asignar horario
              </Link>
            </div>

            {!(schedules ?? []).length ? (
              <div style={{ background: "#FCFAF6", border: "2px solid #1A1A17", borderRadius: "14px", padding: "36px 24px", textAlign: "center", boxShadow: "3px 3px 0 #1A1A17" }}>
                <div style={{ fontSize: "32px", marginBottom: "10px" }}>🗓️</div>
                <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "15px", marginBottom: "6px" }}>Sin horario asignado</div>
                <div style={{ fontSize: "13px", color: "#79746B", marginBottom: "16px" }}>Los nuevos empleados reciben el horario por defecto automáticamente.</div>
                <Link href="/settings/schedules" style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 700, fontSize: "13px", color: "#0E5C4A", textDecoration: "underline" }}>
                  Ir a Horarios →
                </Link>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {(schedules ?? []).map((s: any) => {
                  const tpl = s.work_schedule_templates as any;
                  const DAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"];
                  const weeks: any[] = tpl?.weeks
                    ? [...tpl.weeks].sort((a: any, b: any) => a.week_index - b.week_index)
                    : [];
                  const weekTypeLabel = tpl?.week_type === "single" ? "Semana fija" : tpl?.week_type === "rotating" ? "Semanas rotativas" : tpl?.week_type ?? "—";
                  return (
                    <div key={s.id} style={{ background: "#FCFAF6", border: "2px solid #1A1A17", borderRadius: "14px", padding: "20px", boxShadow: "3px 3px 0 #1A1A17" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", marginBottom: "16px" }}>
                        <div>
                          <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "15px", marginBottom: "4px" }}>{tpl?.name ?? "—"}</div>
                          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", textTransform: "uppercase", letterSpacing: ".5px", color: "#79746B" }}>{weekTypeLabel}</div>
                        </div>
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", color: "#79746B", background: "#F4F0E8", border: "1px solid #E7E1D4", borderRadius: "6px", padding: "3px 8px" }}>
                            Desde: {s.valid_from ? formatDate(s.valid_from) : "—"}
                          </span>
                          <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", color: "#79746B", background: "#F4F0E8", border: "1px solid #E7E1D4", borderRadius: "6px", padding: "3px 8px" }}>
                            Hasta: {s.valid_until ? formatDate(s.valid_until) : "Sin fecha de fin"}
                          </span>
                        </div>
                      </div>
                      {weeks.map((week: any) => {
                        const sortedDays = [...(week.days ?? [])].sort((a: any, b: any) => a.day_of_week - b.day_of_week);
                        const weekTotalMin = sortedDays.reduce((sum: number, d: any) => sum + (d.is_working_day ? Number(d.total_minutes ?? 0) : 0), 0);
                        return (
                          <div key={week.week_index} style={{ marginBottom: "14px" }}>
                            {weeks.length > 1 && (
                              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", textTransform: "uppercase", letterSpacing: ".5px", color: "#79746B", marginBottom: "8px" }}>
                                {week.week_label ?? `Semana ${week.week_index + 1}`}
                              </div>
                            )}
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "6px" }}>
                              {DAY_LABELS.map((label, idx) => {
                                const day = sortedDays.find((d: any) => d.day_of_week === idx);
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
                              Total semana: {(weekTotalMin / 60).toFixed(1).replace(/\.0$/, "")}h
                            </div>
                          </div>
                        );
                      })}
                      {weeks.length === 0 && <p style={{ fontSize: "13px", color: "#79746B", margin: 0 }}>Sin semanas configuradas.</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
