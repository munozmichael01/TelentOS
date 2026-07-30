import { setRequestLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { HairlineTable, HairlineRow } from "@/components/hairline-table";
import { getMyEmployee } from "@/lib/performance/me";
import { formatDate } from "@/lib/utils";

const STATUS_TONE: Record<string, { bg: string; color: string }> = {
  approved: { bg: "#DCEFE4", color: "#0E5C4A" },
  pending: { bg: "#F8E7C4", color: "#946312" },
  rejected: { bg: "#F6E0D9", color: "#C7402E" },
  cancelled: { bg: "#F4F0E8", color: "#79746B" },
};

/** Portal del empleado — sus ausencias, en solo lectura. Solicitarlas llega después. */
export default async function MisAusenciasPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const t = await getTranslations({ locale: params.locale, namespace: "Portal" });
  const { supabase, employee: emp } = await getMyEmployee(params.locale);

  const { data } = await supabase
    .from("absence_requests")
    .select("id, start_date, end_date, working_days_count, status, absence_types(name)")
    .eq("employee_id", emp.id)
    .order("start_date", { ascending: false })
    .limit(50);
  const rows = (data ?? []) as unknown as {
    id: string; start_date: string; end_date: string; working_days_count: number | null;
    status: string; absence_types: { name: string } | null;
  }[];

  return (
    <div>
      <PageHeader eyebrow={t("eyebrow")} title={t("absences.title")} description={t("absences.description")} />
      <div style={{ maxWidth: "760px" }}>
        {rows.length === 0 ? (
          <div style={{ background: "#FCFAF6", border: "1px solid #E7E1D4", borderRadius: "16px", padding: "22px", fontSize: "13.5px", color: "#79746B" }}>
            {t("absences.empty")}
          </div>
        ) : (
          <HairlineTable
            cols="1.4fr 1fr 1fr 0.7fr 0.9fr"
            headers={[t("absences.type"), t("absences.from"), t("absences.to"), t("absences.days"), t("absences.status")]}
            align={["left", "left", "left", "right", "left"]}
          >
            {rows.map((r) => {
              const tone = STATUS_TONE[r.status] ?? STATUS_TONE.cancelled;
              return (
                <HairlineRow key={r.id} align={["left", "left", "left", "right", "left"]}>
                  <span style={{ fontSize: "13.5px", fontWeight: 600 }}>{r.absence_types?.name ?? "—"}</span>
                  <span style={{ fontSize: "13px", color: "#54504A" }}>{formatDate(r.start_date)}</span>
                  <span style={{ fontSize: "13px", color: "#54504A" }}>{formatDate(r.end_date)}</span>
                  <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "12.5px" }}>{r.working_days_count ?? "—"}</span>
                  <span style={{ display: "inline-block", fontSize: "11.5px", fontWeight: 700, borderRadius: "999px", padding: "3px 9px", background: tone.bg, color: tone.color }}>
                    {t.has(`absences.statusLabel.${r.status}`) ? t(`absences.statusLabel.${r.status}`) : r.status}
                  </span>
                </HairlineRow>
              );
            })}
          </HairlineTable>
        )}
      </div>
    </div>
  );
}
