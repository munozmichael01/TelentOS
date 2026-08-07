import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/page-header";
import { getMyEmployee } from "@/lib/performance/me";
import { PayslipDetail, type PayslipDetailData } from "@/components/features/payslip-detail";
import { PrintButton } from "@/components/features/print-button";

/**
 * Portal del empleado — un recibo concreto, en versión imprimible.
 *
 * No hay generador de PDF todavía (el export masivo del admin sigue en "Próximamente"), así que
 * la descarga es el diálogo de impresión del navegador sobre una hoja preparada para ello: el
 * empleado obtiene su PDF hoy y sin depender de nada más. Cuando exista el generador, esta misma
 * página es la plantilla.
 *
 * La lectura va con la sesión del empleado: la RLS (migr. 0073 y 0077) limita a recibos suyos de
 * corridas cerradas. Si el id no le corresponde, la consulta vuelve vacía y esto es un 404.
 */
export default async function MiReciboPage({ params }: { params: { locale: string; id: string } }) {
  setRequestLocale(params.locale);
  const t = await getTranslations({ locale: params.locale, namespace: "Portal" });
  const { supabase } = await getMyEmployee(params.locale);

  const { data: payslip } = await supabase
    .from("payslips")
    .select("id, slip_number, generated_at, pay_run_line_id")
    .eq("id", params.id)
    .maybeSingle();
  if (!payslip) notFound();

  const { data: line } = await supabase
    .from("pay_run_lines")
    .select("id, gross, net, pay_run_id, employees(id, name, role_title, department)")
    .eq("id", payslip.pay_run_line_id)
    .maybeSingle();
  if (!line) notFound();

  const [{ data: run }, { data: items }] = await Promise.all([
    supabase.from("pay_runs")
      .select("period_label, period_month, currency, entity_name")
      .eq("id", (line as unknown as { pay_run_id: string }).pay_run_id).maybeSingle(),
    supabase.from("pay_run_line_items")
      .select("id, category, label, amount")
      .eq("line_id", payslip.pay_run_line_id).order("order_index"),
  ]);
  if (!run) notFound();

  const data = { payslip, line, run, items: items ?? [] } as unknown as PayslipDetailData;
  const period = data.run.period_label ?? data.run.period_month ?? "";

  return (
    <div>
      {/* La navegación y los botones no van en el papel. */}
      <div className="no-print">
        <Link href="/employee/payslips" style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontFamily: "'Space Mono',monospace", fontSize: "11px", color: "#79746B", textDecoration: "none", marginBottom: "12px" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          {t("payroll.slip.back")}
        </Link>
        <PageHeader
          eyebrow={t("eyebrow")}
          title={`${t("payroll.slip.title")} · ${period}`}
          description={payslip.slip_number}
        />
      </div>

      <div style={{ maxWidth: "560px" }}>
        <div style={{ background: "#FCFAF6", border: "1.5px solid #1A1A17", borderRadius: "18px", padding: "26px" }}>
          <PayslipDetail data={data} locale={params.locale} />
        </div>
        <div className="no-print" style={{ marginTop: "16px" }}>
          <PrintButton label={t("payroll.slip.download")} />
        </div>
      </div>
    </div>
  );
}
