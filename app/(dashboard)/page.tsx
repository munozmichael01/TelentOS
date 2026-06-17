import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { FitBadge } from "@/components/fit-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils";

export default async function DashboardPage() {
  const supabase = createClient();

  const [jobs, applications, employees, timeoff, recent] = await Promise.all([
    supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("applications").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("employees").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("time_off_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
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

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            Últimas candidaturas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(recent.data ?? []).map((app) => {
            const candidate = app.candidates as unknown as { name: string } | null;
            const job = app.jobs as unknown as { title: string } | null;
            const utm = app.utm as Record<string, string>;
            return (
              <Link
                key={app.id}
                href={`/applications/${app.id}`}
                className="flex items-center justify-between gap-3 rounded-md border p-3 transition-colors hover:bg-accent"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{candidate?.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{job?.title}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Badge variant="outline">
                    {utm?.utm_source === "career_site" ? "career site" : utm?.utm_source || app.source}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{formatDateTime(app.created_at)}</span>
                  <FitBadge score={app.fit_score} />
                </div>
              </Link>
            );
          })}
          {(recent.data ?? []).length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Aún no hay candidaturas. Publica una oferta y distribúyela para empezar.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
