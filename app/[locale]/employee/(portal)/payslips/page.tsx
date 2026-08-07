import { setRequestLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { HairlineTable, HairlineRow } from "@/components/hairline-table";
import { getMyEmployee } from "@/lib/performance/me";
import { Link } from "@/i18n/navigation";

/**
 * Portal del empleado — sus recibos de nómina.
 * Solo se listan las nóminas ya CERRADAS: un borrador o una nómina en cálculo no es un recibo
 * y enseñarla al empleado sería mostrarle una cifra que aún puede cambiar.
 */
// Estados reales de pay_run_status: draft · in_review · approved · exported · paid.
// El empleado ve solo las cerradas: `draft` e `in_review` son cifras que aún pueden cambiar.
const VISIBLE_STATUSES = ["approved", "exported", "paid"];

export default async function MiNominaPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const t = await getTranslations({ locale: params.locale, namespace: "Portal" });
  const { supabase, employee: emp } = await getMyEmployee(params.locale);

  // `payslips(id)` es el recibo emitido: sin él no hay nada que abrir, y eso pasa con corridas
  // cerradas antes de que existiera la emisión de recibos.
  const { data } = await supabase
    .from("pay_run_lines")
    .select("id, gross, net, payslips(id), pay_runs(period_label, status, currency, period_month)")
    .eq("employee_id", emp.id)
    .order("created_at", { ascending: false })
    .limit(24);

  const rows = ((data ?? []) as unknown as {
    id: string; gross: number | null; net: number | null;
    payslips: { id: string }[] | null;
    pay_runs: { period_label: string | null; status: string; currency: string | null; period_month: string | null } | null;
  }[]).filter((r) => r.pay_runs && VISIBLE_STATUSES.includes(r.pay_runs.status));

  const money = (n: number | null, cur: string | null) =>
    n == null ? "—" : `${new Intl.NumberFormat(params.locale).format(n)} ${cur ?? ""}`.trim();

  return (
    <div>
      <PageHeader eyebrow={t("eyebrow")} title={t("payroll.title")} description={t("payroll.description")} />
      <div style={{ maxWidth: "760px" }}>
        {rows.length === 0 ? (
          <div style={{ background: "#FCFAF6", border: "1px solid #E7E1D4", borderRadius: "16px", padding: "22px", fontSize: "13.5px", color: "#79746B" }}>
            {t("payroll.empty")}
          </div>
        ) : (
          <HairlineTable
            cols="1.4fr 1fr 1fr 0.8fr"
            headers={[t("payroll.period"), t("payroll.gross"), t("payroll.net"), ""]}
            align={["left", "right", "right", "right"]}
          >
            {rows.map((r) => {
              const slipId = r.payslips?.[0]?.id ?? null;
              return (
                <HairlineRow key={r.id} align={["left", "right", "right", "right"]}>
                  <span style={{ fontSize: "13.5px", fontWeight: 600 }}>{r.pay_runs?.period_label ?? r.pay_runs?.period_month ?? "—"}</span>
                  <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "12.5px", color: "#54504A" }}>{money(r.gross, r.pay_runs?.currency ?? null)}</span>
                  <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "12.5px", fontWeight: 700 }}>{money(r.net, r.pay_runs?.currency ?? null)}</span>
                  <span>
                    {slipId ? (
                      <Link href={{ pathname: "/employee/payslips/[id]", params: { id: slipId } }} style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 700, fontSize: "12px", color: "#0E5C4A" }}>
                        {t("payroll.slip.view")}
                      </Link>
                    ) : (
                      <span style={{ fontSize: "12px", color: "#B0AB9F" }}>{t("payroll.slip.noSlip")}</span>
                    )}
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
