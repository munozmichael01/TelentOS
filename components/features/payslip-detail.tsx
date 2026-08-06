"use client";

import { useTranslations } from "next-intl";

/**
 * El recibo de nómina en sí: cabecera, desglose de conceptos y totales.
 *
 * Lo pintan RR.HH. (modal del perfil salarial) y el empleado (su portal, en versión imprimible).
 * Antes solo existía dentro del modal del admin, con los textos en duro; sacarlo aquí evita que
 * el empleado vea un recibo distinto del que ve quien lo emitió.
 */

export type PayslipDetailData = {
  payslip: { id: string; slip_number: string; generated_at: string };
  line: {
    id: string; gross: number | null; net: number | null;
    employees: { id: string; name: string; role_title: string | null; department: string | null } | null;
  };
  run: { period_label: string | null; period_month: string | null; currency: string | null; entity_name: string | null };
  items: { id: string; category: string; label: string; amount: number }[];
};

const T = { ink: "#1A1A17", soft: "#79746B", line: "#E7E1D4", bg: "#F4F0E8", brand: "#0E5C4A", accent: "#BD4332" };

function money(n: number | null, currency: string | null, locale: string) {
  if (n == null) return "—";
  return `${new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)} ${currency ?? ""}`.trim();
}

export function PayslipDetail({ data, locale }: { data: PayslipDetailData; locale: string }) {
  const t = useTranslations("Portal.payroll.slip");
  const emp = data.line.employees;
  const cur = data.run.currency;

  return (
    <div>
      <div style={{ background: T.bg, borderRadius: "12px", padding: "12px 16px", marginBottom: "18px" }}>
        <div style={{ fontWeight: 700, fontSize: "14px" }}>{emp?.name ?? "—"}</div>
        <div style={{ fontSize: "12.5px", color: T.soft, marginTop: "2px" }}>
          {emp?.role_title}{emp?.department ? ` · ${emp.department}` : ""}
        </div>
        {data.run.entity_name && (
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "11px", color: T.soft, marginTop: "4px" }}>{data.run.entity_name}</div>
        )}
      </div>

      {data.items.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "18px" }}>
          {data.items.map((item) => {
            const isDeduction = item.category === "deduction";
            return (
              <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13.5px" }}>
                <span style={{ color: isDeduction ? T.accent : T.ink }}>{item.label}</span>
                <span style={{ fontFamily: "'Space Mono',monospace", fontWeight: 700, color: isDeduction ? T.accent : T.brand }}>
                  {isDeduction ? "−" : "+"}{money(item.amount, cur, locale)}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        // Sin desglose la corrida solo trae el bruto: se dice, en vez de dejar la sección vacía.
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px", padding: "10px 14px", background: T.bg, borderRadius: "10px" }}>
          <span style={{ fontSize: "13.5px" }}>{t("gross")}</span>
          <span style={{ fontFamily: "'Space Mono',monospace", fontWeight: 700, color: T.brand }}>
            +{money(data.line.gross, cur, locale)}
          </span>
        </div>
      )}

      <div style={{ borderTop: `1.5px solid ${T.line}`, paddingTop: "14px", display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
          <span style={{ color: T.soft }}>{t("gross")}</span>
          <span style={{ fontFamily: "'Space Mono',monospace", fontWeight: 700 }}>{money(data.line.gross, cur, locale)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "14px" }}>{t("net")}</span>
          <span style={{ fontFamily: "'Space Mono',monospace", fontWeight: 700, fontSize: "15px" }}>{money(data.line.net, cur, locale)}</span>
        </div>
      </div>

      <div style={{ marginTop: "14px", fontFamily: "'Space Mono',monospace", fontSize: "11px", color: T.soft }}>
        {t("generated", { date: new Date(data.payslip.generated_at).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" }) })}
      </div>
    </div>
  );
}
