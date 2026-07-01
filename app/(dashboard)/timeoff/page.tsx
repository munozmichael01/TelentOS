import { PageHeader } from "@/components/page-header";
import { AbsencePanel } from "@/components/features/absence-panel";
import { createClient } from "@/lib/supabase/server";
import type { AbsenceRequest, AbsenceType, Employee } from "@/lib/types";
import Link from "next/link";

export default async function TimeOffPage() {
  const supabase = createClient();

  // Fetch company
  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (!company) {
    return (
      <div>
        <PageHeader title="Ausencias" description="Solicitudes de ausencia del equipo" />
        <p style={{ color: "#79746B", fontSize: "14px" }}>No se encontró una empresa configurada.</p>
      </div>
    );
  }

  // Fetch all data in parallel
  const today = new Date().toISOString().slice(0, 10);
  const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10);

  const [
    { data: requests },
    { data: employees },
    { data: absenceTypes },
  ] = await Promise.all([
    supabase
      .from("absence_requests")
      .select("*, employees(name, role_title, department), absence_types(name, color, icon)")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("employees")
      .select("id, name")
      .eq("status", "active")
      .order("name"),
    supabase
      .from("absence_types")
      .select("id, name, color, icon, requires_approval, allow_half_day, deducts_from_allowance, allowance_type_id, is_public, requires_document, is_active, company_id, created_at, updated_at")
      .eq("company_id", company.id)
      .eq("is_active", true),
  ]);

  const allRequests = (requests ?? []) as unknown as AbsenceRequest[];

  // Compute stats server-side
  const pending = allRequests.filter((r) => r.status === "pending").length;
  const approvedThisMonth = allRequests.filter(
    (r) => r.status === "approved" && r.start_date >= monthStart && r.start_date <= monthEnd
  ).length;
  const totalThisYear = allRequests.filter((r) => r.start_date >= yearStart).length;
  const onLeaveToday = allRequests.filter(
    (r) => r.status === "approved" && r.start_date <= today && r.end_date >= today
  ).length;

  return (
    <div>
      <PageHeader title="Ausencias" description="Solicitudes de ausencia del equipo">
        <Link
          href="/timeoff/calendar"
          style={{
            fontFamily: "'Archivo', sans-serif",
            fontWeight: 700,
            fontSize: "13px",
            color: "#1A1A17",
            background: "#FCFAF6",
            border: "2px solid #1A1A17",
            boxShadow: "3px 3px 0 #1A1A17",
            borderRadius: "11px",
            padding: "9px 18px",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: "7px",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
            <path d="M16 2v4M8 2v4M3 10h18M8 15h.01M12 15h.01M16 15h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Ver calendario
        </Link>
      </PageHeader>

      <AbsencePanel
        requests={allRequests}
        employees={employees ?? []}
        absenceTypes={(absenceTypes ?? []) as AbsenceType[]}
        stats={{ pending, approvedThisMonth, totalThisYear, onLeaveToday }}
      />
    </div>
  );
}
