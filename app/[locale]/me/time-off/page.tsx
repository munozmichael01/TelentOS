import { setRequestLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { getMyEmployee } from "@/lib/performance/me";
import { loadEmployeeBalances } from "@/lib/absences/balance";
import { AllowanceBalanceCard } from "@/components/features/allowance-balance-card";
import { MyAbsences, type MyAbsenceRow } from "@/components/features/my-absences";
import type { AbsenceType } from "@/lib/types";

/**
 * Portal del empleado — sus ausencias: saldo, solicitud y estado.
 *
 * El saldo sale del mismo cálculo que ve RR.HH. en la ficha (`lib/absences/balance.ts`) y con la
 * sesión del propio empleado, así que la RLS ya limita lo que puede leer.
 */
export default async function MisAusenciasPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const t = await getTranslations({ locale: params.locale, namespace: "Portal" });
  const { supabase, employee: emp } = await getMyEmployee(params.locale);

  const [balances, { data: absences }, { data: types }] = await Promise.all([
    loadEmployeeBalances(supabase, emp.id),
    supabase
      .from("absence_requests")
      .select("id, start_date, end_date, working_days_count, status, absence_types(name)")
      .eq("employee_id", emp.id)
      .order("start_date", { ascending: false })
      .limit(50),
    // `is_public` marca los tipos que el empleado puede pedir por su cuenta.
    supabase
      .from("absence_types")
      .select("id, name, icon, color, requires_approval, requires_document")
      .eq("company_id", emp.company_id)
      .eq("is_active", true)
      .eq("is_public", true)
      .order("name"),
  ]);

  const rows = (absences ?? []) as unknown as MyAbsenceRow[];
  const absenceTypes = (types ?? []) as Pick<
    AbsenceType, "id" | "name" | "icon" | "color" | "requires_approval" | "requires_document"
  >[];

  return (
    <div>
      <PageHeader eyebrow={t("eyebrow")} title={t("absences.title")} description={t("absences.description")} />
      <div style={{ maxWidth: "760px" }}>
        <h2 style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", textTransform: "uppercase", letterSpacing: "1px", color: "#79746B", margin: "0 0 12px" }}>
          {t("absences.balanceTitle")}
        </h2>
        {balances.length === 0 ? (
          <div style={{ background: "#FCFAF6", border: "1px solid #E7E1D4", borderRadius: "16px", padding: "18px 22px", fontSize: "13.5px", color: "#79746B", marginBottom: "28px" }}>
            {t("absences.noBalance")}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "28px" }}>
            {balances.map((bal) => (
              <AllowanceBalanceCard key={bal.allowanceId} bal={bal} compact />
            ))}
          </div>
        )}

        <h2 style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", textTransform: "uppercase", letterSpacing: "1px", color: "#79746B", margin: "0 0 12px" }}>
          {t("absences.historyTitle")}
        </h2>
        <MyAbsences rows={rows} absenceTypes={absenceTypes} />
      </div>
    </div>
  );
}
