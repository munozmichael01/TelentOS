export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { HairlineTable, HairlineRow } from "@/components/hairline-table";
import Link from "next/link";
import type { PayRun } from "@/lib/types";

const STATUS_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  draft:     { label: "Borrador",    bg: "#EEE9DD",   color: "#79746B" },
  in_review: { label: "En revisión", bg: "#F8E7C4",   color: "#946312" },
  approved:  { label: "Aprobado",    bg: "#DCEFE4",   color: "#0E5C4A" },
  exported:  { label: "Exportado",   bg: "#E4E1DA",   color: "#54504A" },
  paid:      { label: "Pagado",      bg: "#0E5C4A",   color: "#fff" },
};

export default async function PayRunsPage() {
  const supabase = createClient();
  const { data: runs } = await supabase
    .from("pay_runs")
    .select("*")
    .order("period_month", { ascending: false });

  const list = (runs ?? []) as PayRun[];

  return (
    <div>
      <PageHeader title="Pay Runs" description="Payroll">
        {null}
      </PageHeader>

      {list.length === 0 ? (
        <EmptyState
          title="Sin corridas"
          description="Las corridas de nómina aparecerán aquí una vez que proceses el primer periodo."
        />
      ) : (
        <HairlineTable
          cols="1.4fr 1.3fr 0.7fr 1fr 1fr 0.6fr"
          headers={["Periodo", "Entidad", "Empleados", "Gross", "Status", ""]}
          align={["left", "left", "right", "right", "left", "right"]}
        >
          {list.map((r) => {
            const badge = STATUS_LABELS[r.status] ?? STATUS_LABELS.draft;
            return (
              <HairlineRow key={r.id} align={["left", "left", "right", "right", "left", "right"]}>
                <Link href={`/payroll/runs/${r.id}`} style={{ fontWeight: 700, color: "#1A1A17", textDecoration: "none" }}>{r.period_label}</Link>
                <span style={{ color: "#54504A" }}>{r.entity_name}</span>
                <span style={{ fontFamily: "'Space Mono',monospace" }}>{r.employee_count}</span>
                <span style={{ fontFamily: "'Space Mono',monospace", fontWeight: 700 }}>
                  ${r.gross.toLocaleString("en-US")}
                </span>
                <span>
                  <span style={{ fontSize: "11px", fontWeight: 700, borderRadius: "999px", padding: "3px 10px", background: badge.bg, color: badge.color }}>
                    {badge.label}
                  </span>
                </span>
                <Link href={`/payroll/runs/${r.id}`} style={{ fontFamily: "'Space Mono',monospace", fontSize: "11px", fontWeight: 700, color: "#0E5C4A", textDecoration: "none" }}>
                  Ver →
                </Link>
              </HairlineRow>
            );
          })}
        </HairlineTable>
      )}
    </div>
  );
}
