"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { AbsenceType } from "@/lib/types";
import { HairlineTable, HairlineRow } from "@/components/hairline-table";
import { AbsenceRequestForm } from "@/components/features/absence-request-form";
import { formatDate } from "@/lib/utils";

/**
 * Las ausencias del empleado en su portal: solicitar, ver el estado y cancelar lo suyo.
 *
 * El formulario es el mismo que usa RR.HH. en el admin; aquí va sin selector de empleado, así que
 * no manda `employee_id` y el servidor resuelve sobre quién actúa.
 */

const STATUS_TONE: Record<string, { bg: string; color: string }> = {
  approved: { bg: "#DCEFE4", color: "#0E5C4A" },
  pending: { bg: "#F8E7C4", color: "#946312" },
  rejected: { bg: "#F6E0D9", color: "#C7402E" },
  cancelled: { bg: "#F4F0E8", color: "#79746B" },
};

export type MyAbsenceRow = {
  id: string; start_date: string; end_date: string;
  working_days_count: number | null; status: string;
  absence_types: { name: string } | null;
};

export function MyAbsences({
  rows,
  absenceTypes,
}: {
  rows: MyAbsenceRow[];
  absenceTypes: Pick<AbsenceType, "id" | "name" | "icon" | "color" | "requires_approval" | "requires_document">[];
}) {
  const t = useTranslations("Portal.absences");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function cancel(id: string) {
    if (!window.confirm(t("cancelConfirm"))) return;
    setCancelling(id);
    setError("");
    const res = await fetch(`/api/absence-requests/${id}/cancel`, { method: "POST" }).catch(() => null);
    setCancelling(null);
    if (!res?.ok) {
      const d = await res?.json().catch(() => null);
      setError(d?.error ?? t("cancelFailed"));
      return;
    }
    router.refresh();
  }

  const cols = "1.3fr 0.95fr 0.95fr 0.6fr 0.85fr 0.7fr";
  const align: ("left" | "right")[] = ["left", "left", "left", "right", "left", "right"];

  return (
    <div>
      <div style={{ marginBottom: "18px" }}>
        {absenceTypes.length === 0 ? (
          <div style={{ background: "#FCFAF6", border: "1px solid #E7E1D4", borderRadius: "16px", padding: "18px 22px", fontSize: "13.5px", color: "#79746B" }}>
            {t("noTypes")}
          </div>
        ) : open ? (
          <div style={{ background: "#FCFAF6", border: "2px solid #1A1A17", borderRadius: "16px", boxShadow: "3px 3px 0 #1A1A17", padding: "22px" }}>
            <h2 style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: "17px", letterSpacing: "-.4px", margin: "0 0 18px" }}>
              {t("requestTitle")}
            </h2>
            <AbsenceRequestForm
              absenceTypes={absenceTypes}
              onDone={() => setOpen(false)}
              onCancel={() => setOpen(false)}
            />
          </div>
        ) : (
          <button
            onClick={() => setOpen(true)}
            style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "13px", color: "#fff", background: "#0E5C4A", border: "2px solid #1A1A17", boxShadow: "3px 3px 0 #1A1A17", borderRadius: "11px", padding: "10px 20px", cursor: "pointer" }}
          >
            {t("requestBtn")}
          </button>
        )}
      </div>

      {error && (
        <div style={{ background: "#F6D9D2", border: "1px solid #F0A89E", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", color: "#BD4332", marginBottom: "14px" }}>
          {error}
        </div>
      )}

      {rows.length === 0 ? (
        <div style={{ background: "#FCFAF6", border: "1px solid #E7E1D4", borderRadius: "16px", padding: "22px", fontSize: "13.5px", color: "#79746B" }}>
          {t("empty")}
        </div>
      ) : (
        <HairlineTable
          cols={cols}
          headers={[t("type"), t("from"), t("to"), t("days"), t("status"), t("actions")]}
          align={align}
        >
          {rows.map((r) => {
            const tone = STATUS_TONE[r.status] ?? STATUS_TONE.cancelled;
            const canCancel = r.status === "pending" || r.status === "approved";
            return (
              <HairlineRow key={r.id} align={align}>
                <span style={{ fontSize: "13.5px", fontWeight: 600 }}>{r.absence_types?.name ?? "—"}</span>
                <span style={{ fontSize: "13px", color: "#54504A" }}>{formatDate(r.start_date)}</span>
                <span style={{ fontSize: "13px", color: "#54504A" }}>{formatDate(r.end_date)}</span>
                <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "12.5px" }}>{r.working_days_count ?? "—"}</span>
                <span style={{ display: "inline-block", fontSize: "11.5px", fontWeight: 700, borderRadius: "999px", padding: "3px 9px", background: tone.bg, color: tone.color }}>
                  {t.has(`statusLabel.${r.status}`) ? t(`statusLabel.${r.status}`) : r.status}
                </span>
                <span>
                  {canCancel && (
                    <button
                      onClick={() => cancel(r.id)}
                      disabled={cancelling === r.id}
                      style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 700, fontSize: "12px", color: "#BD4332", background: "transparent", border: "none", padding: 0, cursor: "pointer", opacity: cancelling === r.id ? .6 : 1 }}
                    >
                      {cancelling === r.id ? t("cancelling") : t("cancelBtn")}
                    </button>
                  )}
                </span>
              </HairlineRow>
            );
          })}
        </HairlineTable>
      )}
    </div>
  );
}
