"use client";

import { useTranslations } from "next-intl";
import { HairlineTable, HairlineRow } from "@/components/hairline-table";
import { formatDate } from "@/lib/utils";
import type { PolicyBalance } from "@/lib/absences/balance";

/**
 * Tarjeta de saldo de una bolsa (vacaciones, asuntos propios…): cuánto se concedió, de dónde sale
 * y cuánto queda.
 *
 * Estaba escrita dentro de la ficha del empleado del admin. El portal muestra exactamente lo
 * mismo, así que el diseño vive aquí y las dos pantallas lo componen. Las claves siguen en
 * `People.detail.absences.balanceCard` para no partir las traducciones ya revisadas.
 */
export function AllowanceBalanceCard({ bal, compact = false }: { bal: PolicyBalance; compact?: boolean }) {
  const t = useTranslations("People.detail.absences.balanceCard");

  const pct = bal.granted > 0 ? Math.min(100, Math.round((bal.usedApproved / bal.granted) * 100)) : 0;
  const typeUnitLabel =
    bal.typeUnit === "days" || bal.typeUnit === "días" ? t("daysUnit")
    : bal.typeUnit === "hours" || bal.typeUnit === "horas" ? t("hoursUnit")
    : bal.typeUnit;

  const breakdownRows: { label: string; value: number; sign: "+" | "-" | "" }[] = [
    { label: bal.isProrated ? t("breakdown.policyProrated") : t("breakdown.policy"), value: bal.granted, sign: "+" },
    { label: t("breakdown.carryover"), value: bal.carryover, sign: bal.carryover >= 0 ? "+" : "" },
    { label: t("breakdown.manual"), value: bal.manual, sign: bal.manual >= 0 ? "+" : "" },
    { label: t("breakdown.usedApproved"), value: bal.usedApproved, sign: "-" },
    { label: t("breakdown.usedPending"), value: bal.usedPending, sign: "-" },
    { label: t("breakdown.holidays"), value: Math.abs(bal.holidayDeductions), sign: "-" },
    { label: t("breakdown.expired"), value: Math.abs(bal.expired), sign: "-" },
  ];

  return (
    <div style={{ background: "#FCFAF6", border: "2px solid #1A1A17", borderRadius: "14px", padding: "18px 20px", boxShadow: "3px 3px 0 #1A1A17" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", marginBottom: "14px" }}>
        <div>
          <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "15px", marginBottom: "4px" }}>{bal.policyName}</div>
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", textTransform: "uppercase", letterSpacing: ".5px", color: "#79746B" }}>
            {bal.typeName} · {typeUnitLabel}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          {bal.expiryDate && (
            <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", letterSpacing: ".5px", color: "#946312", background: "#F8E7C4", border: "1px solid #E8C97A", borderRadius: "999px", padding: "3px 10px", whiteSpace: "nowrap" }}>
              {t("expires", { date: formatDate(bal.expiryDate) })}
            </span>
          )}
          <span style={{ background: "#EAF7C4", border: "1.5px solid #1A1A17", borderRadius: "999px", padding: "4px 12px", fontSize: "12px", fontWeight: 700, fontFamily: "'Archivo',sans-serif", color: "#0E5C4A", whiteSpace: "nowrap" }}>
            {bal.available} / {bal.granted} {typeUnitLabel}
          </span>
        </div>
      </div>

      <div style={{ marginBottom: compact ? 0 : "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
          <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", color: "#79746B" }}>
            {t("detailLabel", { usedApproved: bal.usedApproved, usedPending: bal.usedPending })}
          </span>
          <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", color: "#79746B" }}>{pct}%</span>
        </div>
        <div style={{ height: "8px", background: "#E7E1D4", borderRadius: "999px", overflow: "hidden", border: "1px solid #1A1A17" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: pct > 80 ? "#F1543F" : "#0E5C4A", borderRadius: "999px", transition: "width .3s" }} />
        </div>
      </div>

      {/* El desglose es para entender de dónde sale el número; en el portal la tarjeta se queda
          en el titular y el empleado no necesita el detalle contable de RR.HH. */}
      {!compact && (
        <>
          <div style={{ marginBottom: "12px" }}>
            <HairlineTable
              cols="2fr 1fr"
              headers={[t("breakdown.title"), t("breakdown.qty")]}
              align={["left", "right"]}
            >
              {breakdownRows.map((row) => {
                const isNeg = row.sign === "-" && row.value > 0;
                const isPos = row.sign === "+" && row.value > 0;
                const valColor = isNeg ? "#BD4332" : isPos ? "#1B6B4F" : "#79746B";
                return (
                  <HairlineRow key={row.label} align={["left", "right"]}>
                    <span style={{ color: row.value === 0 ? "#B0AB9F" : "#1A1A17" }}>{row.label}</span>
                    <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "11px", fontWeight: 700, color: row.value === 0 ? "#B0AB9F" : valColor }}>
                      {row.value === 0 ? "0" : `${row.sign}${row.value}`}
                    </span>
                  </HairlineRow>
                );
              })}
              <HairlineRow align={["left", "right"]} style={{ background: "#F4F0E8", borderBottom: "none" }}>
                <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: "13px" }}>{t("available")}</span>
                <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: "14px", color: bal.available > 0 ? "#1B6B4F" : "#79746B" }}>
                  {bal.available} {typeUnitLabel}
                </span>
              </HairlineRow>
            </HairlineTable>
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", color: "#79746B", background: "#F4F0E8", border: "1px solid #E7E1D4", borderRadius: "6px", padding: "3px 8px" }}>
              {t("since", { date: formatDate(bal.validFrom) })}
            </span>
            <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", color: "#79746B", background: "#F4F0E8", border: "1px solid #E7E1D4", borderRadius: "6px", padding: "3px 8px" }}>
              {bal.validUntil ? t("until", { date: formatDate(bal.validUntil) }) : t("noUntil")}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
