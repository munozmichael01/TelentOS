import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { OnboardingPanel } from "@/components/features/onboarding-panel";
import { TimesheetForm } from "@/components/features/timesheet-form";
import { TimeOffPanel } from "@/components/features/timeoff-panel";
import { DocumentUploader } from "@/components/features/document-uploader";
import { FileLink } from "@/components/features/file-link";
import { EmployeeForm } from "@/components/features/employee-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/server";
import { formatDate, initials } from "@/lib/utils";
import type { Employee, OnboardingTask, TimeOffRequest } from "@/lib/types";

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

const fieldLabel: React.CSSProperties = {
  fontFamily: "'Space Mono',monospace",
  fontSize: "10.5px",
  textTransform: "uppercase",
  letterSpacing: ".5px",
  color: "#79746B",
};

const fieldValue: React.CSSProperties = {
  background: "#F4F0E8",
  border: "1px solid #E7E1D4",
  borderRadius: "10px",
  padding: "10px 13px",
  fontSize: "14px",
  fontWeight: 600,
  marginTop: "7px",
  color: "#1A1A17",
};

const contractLabel: Record<string, string> = {
  full_time: "Jornada completa",
  part_time: "Jornada parcial",
  contractor: "Contrato / freelance",
  internship: "Prácticas",
};

export default async function EmployeePage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: employee } = await supabase.from("employees").select("*").eq("id", params.id).maybeSingle();
  if (!employee) notFound();
  const emp = employee as Employee;

  const [{ data: manager }, { data: all }, { data: tasks }, { data: docs }, { data: hours }, { data: timeoff }] =
    await Promise.all([
      emp.manager_id
        ? supabase.from("employees").select("id, name").eq("id", emp.manager_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from("employees").select("id, name").eq("status", "active"),
      supabase.from("onboarding_tasks").select("*").eq("employee_id", params.id).order("order_index"),
      supabase.from("employee_documents").select("*").eq("employee_id", params.id).order("created_at", { ascending: false }),
      supabase.from("timesheets").select("*").eq("employee_id", params.id).order("work_date", { ascending: false }).limit(30),
      supabase.from("time_off_requests").select("*").eq("employee_id", params.id).order("created_at", { ascending: false }),
    ]);

  const approvedDays = (timeoff ?? [])
    .filter((r) => r.type === "vacation" && r.status === "approved")
    .reduce((acc, r) => acc + Number(r.days), 0);
  const balance = emp.vacation_days_total - approvedDays;
  const av = avatarPalette(emp.name);
  const ini = initials(emp.name);

  const totalHours = (hours ?? []).reduce((sum, h) => sum + Number(h.hours), 0);

  return (
    <div>
      {/* back link */}
      <Link
        href="/employees"
        style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 600, color: "#79746B", marginBottom: "14px", textDecoration: "none" }}
      >
        <ArrowLeft size={15} />
        Empleados
      </Link>

      {/* header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", flexWrap: "wrap", marginBottom: "20px" }}>
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <span style={{ width: "58px", height: "58px", flexShrink: 0, borderRadius: "50%", background: av.bg, color: av.color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "18px" }}>
            {ini}
          </span>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <h2 style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: "28px", letterSpacing: "-.8px", lineHeight: 1, margin: 0 }}>
                {emp.name}
              </h2>
              <span style={{ fontSize: "11.5px", fontWeight: 700, borderRadius: "999px", padding: "3px 10px", background: emp.status === "active" ? "#DCEFE3" : "#F6D9D2", color: emp.status === "active" ? "#1B6B4F" : "#BD4332" }}>
                {emp.status === "active" ? "Activo" : "Inactivo"}
              </span>
            </div>
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "12px", color: "#79746B", marginTop: "8px" }}>
              {[emp.role_title, emp.department].filter(Boolean).join(" · ")}
            </div>
          </div>
        </div>

        <EmployeeForm
          employee={emp}
          managers={(all ?? []).map((e) => ({ id: e.id, name: e.name }))}
          trigger={
            <button
              style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "13px", color: "#fff", background: "#0E5C4A", border: "2px solid #1A1A17", borderRadius: "11px", padding: "9px 15px", boxShadow: "3px 3px 0 #1A1A17", cursor: "pointer" }}
            >
              Acciones ▾
            </button>
          }
        />
      </div>

      {/* stat tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "20px" }}>
        {[
          { label: "Incorporación", value: formatDate(emp.start_date) },
          { label: "Contrato", value: contractLabel[emp.contract_type] ?? emp.contract_type },
          { label: "Reporta a", value: manager?.name ?? "—" },
          { label: "Vacaciones disp.", value: `${balance} / ${emp.vacation_days_total} días` },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: "#FCFAF6", border: "1px solid #E7E1D4", borderRadius: "14px", padding: "16px 18px" }}>
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", textTransform: "uppercase", letterSpacing: ".5px", color: "#79746B" }}>
              {label}
            </div>
            <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "18px", marginTop: "6px", letterSpacing: "-.2px" }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* tabs */}
      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Información</TabsTrigger>
          <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
          <TabsTrigger value="documents">Documentos ({(docs ?? []).length})</TabsTrigger>
          <TabsTrigger value="timeoff">Vacaciones</TabsTrigger>
          <TabsTrigger value="timesheets">Horas</TabsTrigger>
        </TabsList>

        {/* ── Información ── */}
        <TabsContent value="info">
          <div style={{ background: "#FCFAF6", border: "1px solid #E7E1D4", borderRadius: "16px", padding: "22px", maxWidth: "760px" }}>
            <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "16px", marginBottom: "18px" }}>Datos del empleado</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              {[
                { label: "Nombre", value: emp.name },
                { label: "Email", value: emp.email },
                { label: "ID empleado", value: emp.id.slice(0, 8) + "…" },
                { label: "Incorporación", value: formatDate(emp.start_date) },
                { label: "Contrato", value: contractLabel[emp.contract_type] ?? emp.contract_type },
                { label: "Manager", value: manager?.name ?? "—" },
                { label: "Departamento", value: emp.department ?? "—" },
                { label: "Rol", value: emp.role_title ?? "—" },
              ].map(({ label, value }) => (
                <div key={label}>
                  <label style={fieldLabel}>{label}</label>
                  <div style={fieldValue}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ── Onboarding ── */}
        <TabsContent value="onboarding">
          <OnboardingPanel employeeId={emp.id} tasks={(tasks ?? []) as OnboardingTask[]} />
        </TabsContent>

        {/* ── Documents ── */}
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
                  <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", color: "#79746B", marginTop: "2px" }}>
                    {formatDate(d.created_at)}
                  </div>
                </div>
                <FileLink bucket="documents" path={d.file_url} label="Descargar" />
              </div>
            ))}
            {(docs ?? []).length === 0 && (
              <p style={{ fontSize: "13px", color: "#79746B" }}>Sin documentos adjuntos.</p>
            )}
            <DocumentUploader employeeId={emp.id} />
          </div>
        </TabsContent>

        {/* ── Vacaciones ── */}
        <TabsContent value="timeoff">
          <div style={{ maxWidth: "680px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "14px", marginBottom: "14px" }}>
              {[
                { label: "Disponibles", value: balance, accent: false },
                { label: "Disfrutados", value: approvedDays, accent: false },
                { label: "Pendientes", value: (timeoff ?? []).filter((r) => r.status === "pending").length, accent: true },
              ].map(({ label, value, accent }) => (
                <div key={label} style={{ background: "#FCFAF6", border: "1px solid #E7E1D4", borderRadius: "14px", padding: "16px 18px" }}>
                  <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", textTransform: "uppercase", letterSpacing: ".5px", color: "#79746B" }}>
                    {label}
                  </div>
                  <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: "30px", letterSpacing: "-1px", marginTop: "6px", color: accent && value > 0 ? "#F1543F" : "#1A1A17" }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>
            <TimeOffPanel
              requests={(timeoff ?? []) as TimeOffRequest[]}
              employees={[]}
              fixedEmployeeId={emp.id}
            />
          </div>
        </TabsContent>

        {/* ── Horas ── */}
        <TabsContent value="timesheets">
          <div style={{ maxWidth: "680px" }}>
            <div style={{ marginBottom: "14px" }}>
              <TimesheetForm employees={[]} fixedEmployeeId={emp.id} />
            </div>
            <div style={{ background: "#FCFAF6", border: "1px solid #E7E1D4", borderRadius: "16px", overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid #E7E1D4" }}>
                <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "15px" }}>Registros recientes</span>
                <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "12px", color: "#0E5C4A", fontWeight: 700 }}>
                  {totalHours} h total
                </span>
              </div>
              {(hours ?? []).length === 0 ? (
                <p style={{ textAlign: "center", fontSize: "13px", color: "#79746B", padding: "28px 18px" }}>Sin registros.</p>
              ) : (hours ?? []).map((h) => (
                <div key={h.id} style={{ display: "flex", alignItems: "center", gap: "14px", padding: "13px 18px", borderBottom: "1px solid #E7E1D4" }}>
                  <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "12px", color: "#79746B", width: "90px", flexShrink: 0 }}>
                    {formatDate(h.work_date)}
                  </span>
                  <span style={{ flex: 1, fontSize: "13.5px" }}>{h.notes ?? "—"}</span>
                  <span style={{ fontSize: "13.5px", fontWeight: 700, whiteSpace: "nowrap" }}>{Number(h.hours)} h</span>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
