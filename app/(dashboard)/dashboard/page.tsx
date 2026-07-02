import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { FitBadge } from "@/components/fit-badge";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime, initials } from "@/lib/utils";

const AVATAR_PALETTES = [
  { bg: "#DCEFE4", color: "#0E5C4A" },
  { bg: "#F6D9D2", color: "#BD4332" },
  { bg: "#E7E0F2", color: "#5A4C86" },
  { bg: "#F8E7C4", color: "#946312" },
  { bg: "#D6E4F2", color: "#2B5E8A" },
];
function avatarPalette(name: string) {
  const code = name.charCodeAt(0) + (name.charCodeAt(1) || 0);
  return AVATAR_PALETTES[code % AVATAR_PALETTES.length];
}

export default async function DashboardPage() {
  const supabase = createClient();

  const [jobs, applications, employees, timeoff, recent] = await Promise.all([
    supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("applications").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("employees").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("absence_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase
      .from("applications")
      .select("id, fit_score, created_at, source, utm, candidates(name), jobs(title)")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  return (
    <div>
      <PageHeader title="Dashboard" description="" />
      <div className="grid gap-[14px] sm:grid-cols-2 lg:grid-cols-4 mb-[18px]">
        <StatCard label="Ofertas activas" value={jobs.count ?? 0} />
        <StatCard label="Candidaturas abiertas" value={applications.count ?? 0} />
        <StatCard label="Empleados" value={employees.count ?? 0} />
        <StatCard label="Ausencias pendientes" value={timeoff.count ?? 0} />
      </div>

      <div style={{ marginTop: "24px", border: "1px solid #E7E1D4", borderRadius: "14px", background: "#FCFAF6", overflow: "hidden" }}>
        <div style={{ padding: "16px 18px", borderBottom: "1px solid #E7E1D4", fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "16px" }}>
          Últimas candidaturas
        </div>
        <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: "8px" }}>
          {(recent.data ?? []).map((app) => {
            const candidate = app.candidates as unknown as { name: string } | null;
            const job = app.jobs as unknown as { title: string } | null;
            const utm = app.utm as Record<string, string>;
            const name = candidate?.name ?? "—";
            const pal = avatarPalette(name);
            const source = utm?.utm_source === "career_site" ? "career site" : utm?.utm_source || app.source;
            return (
              <Link
                key={app.id}
                href={`/applications/${app.id}`}
                style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  border: "1px solid #E7E1D4", borderRadius: "11px", padding: "9px 12px",
                  background: "#F4F0E8", textDecoration: "none",
                  transition: "border-color .12s, box-shadow .12s",
                }}
                className="hover:[border-color:#1A1A17] hover:[box-shadow:3px_3px_0_#1A1A17]"
              >
                <span style={{ width: "34px", height: "34px", borderRadius: "50%", background: pal.bg, color: pal.color, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "11px", flexShrink: 0 }}>
                  {initials(name)}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "13.5px", color: "#1A1A17" }}>{name}</div>
                  <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", color: "#79746B", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{job?.title}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                  <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", color: "#79746B", background: "#F4F0E8", border: "1px solid #E7E1D4", borderRadius: "999px", padding: "2px 8px" }}>{source}</span>
                  <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", color: "#79746B", whiteSpace: "nowrap" }}>{formatDateTime(app.created_at)}</span>
                  <FitBadge score={app.fit_score} />
                </div>
              </Link>
            );
          })}
          {(recent.data ?? []).length === 0 && (
            <p style={{ padding: "24px 0", textAlign: "center", fontSize: "13px", color: "#79746B" }}>
              Aún no hay candidaturas. Publica una oferta y distribúyela para empezar.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
