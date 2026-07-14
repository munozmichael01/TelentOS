"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/format";
import { apiFetch, notifySuccess } from "@/lib/api-client";
import { AgentActionButton } from "@/components/ui/agent-action-button";
import { AgentPanelShell } from "@/components/ui/agent-panel-shell";
import type { ReviewFinding } from "@/lib/payroll/copilot";
import type { PayRun, PayRunLine, PayRunLineItem, PayRunAuditLog, PayrollExport } from "@/lib/types";

// ── Design tokens ────────────────────────────────────────────────────────────
const T = {
  surface: "#FCFAF6", bg: "#F4F0E8", surface2: "#F8F4EB",
  ink: "#1A1A17", soft: "#79746B", line: "#E7E1D4",
  brand: "#0E5C4A", brandSoft: "#DCEFE4",
  accent: "#F1543F", accentSoft: "#FAE3DE",
  amber: "#946312", amberSoft: "#F8E7C4",
};

const STATUS: Record<string, { label: string; bg: string; color: string }> = {
  draft:     { label: "Borrador",    bg: "#EEE9DD",   color: "#79746B" },
  in_review: { label: "En revisión", bg: T.amberSoft, color: T.amber },
  approved:  { label: "Aprobado",    bg: T.brandSoft, color: T.brand },
  exported:  { label: "Exportado",   bg: "#E4E1DA",   color: "#54504A" },
  paid:      { label: "Pagado",      bg: T.brand,     color: "#fff" },
};

const LINE_STATUS: Record<string, { label: string; bg: string; color: string }> = {
  draft:    { label: "Borrador",  bg: "#EEE9DD",   color: "#79746B" },
  reviewed: { label: "Revisado",  bg: "#DCE9F5",   color: "#2A5A8E" },
  approved: { label: "Aprobado",  bg: T.brandSoft, color: T.brand },
};

const AVATAR_PALETTES = [
  { bg: "#DCE9F5", color: "#2A5A8E" }, { bg: "#E3D3F5", color: "#5B2D8E" },
  { bg: T.brandSoft, color: T.brand }, { bg: T.accentSoft, color: "#BD4332" },
  { bg: "#F6E9C8", color: "#8A6410" }, { bg: "#D8ECEA", color: "#1F6E62" },
  { bg: "#F1E0D0", color: "#8A5A2B" }, { bg: "#E7EAD0", color: "#5A6B24" },
];
function avatarPal(idx: number) { return AVATAR_PALETTES[idx % AVATAR_PALETTES.length]; }
function initials(name: string) { return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase(); }

type RunData = {
  run: PayRun;
  lines: (PayRunLine & { employees: { id: string; name: string; role_title: string | null; department: string | null } })[];
  itemsByLine: Record<string, PayRunLineItem[]>;
  audit: PayRunAuditLog[];
  exportLog: PayrollExport[];
  withoutLine: { id: string; name: string }[];
};

// ── Alert icons ───────────────────────────────────────────────────────────────
function AlertIcon({ type }: { type: string }) {
  const isAmber = type === "salary";
  const bg = isAmber ? T.amberSoft : T.accentSoft;
  const stroke = isAmber ? T.amber : T.accent;
  const title: Record<string, string> = {
    bank: "Sin cuenta bancaria", adjust: "Ajuste manual pendiente",
    salary: "Cambio de salario en el periodo", input: "Input sin confirmar",
  };
  return (
    <span title={title[type]} style={{ display: "inline-flex", width: "20px", height: "20px", borderRadius: "6px", background: bg, alignItems: "center", justifyContent: "center" }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
        <path d="M12 3l9 16H3l9-16Z" stroke={stroke} strokeWidth="2.2" strokeLinejoin="round"/>
        <path d="M12 10v3.5M12 16.5h.01" stroke={stroke} strokeWidth="2.2" strokeLinecap="round"/>
      </svg>
    </span>
  );
}

// ── Employee Breakdown Sheet ──────────────────────────────────────────────────
function EmployeeSheet({
  line, employee, items, avIdx, currency, runId, userRole, onClose, onOpenPayslip, onRefresh,
}: {
  line: RunData["lines"][0];
  employee: RunData["lines"][0]["employees"];
  items: PayRunLineItem[];
  avIdx: number;
  currency: string;
  runId: string;
  userRole: "owner" | "hr_admin";
  onClose: () => void;
  onOpenPayslip: () => void;
  onRefresh: () => void;
}) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showAdjust, setShowAdjust] = useState(false);
  const [adjLabel, setAdjLabel] = useState("");
  const [adjAmount, setAdjAmount] = useState("");
  const [adjCategory, setAdjCategory] = useState<"earning" | "deduction">("earning");

  const av = avatarPal(avIdx);
  const badge = LINE_STATUS[line.status] ?? LINE_STATUS.draft;
  const earnings = items.filter((i) => i.category === "earning").sort((a, b) => a.order_index - b.order_index);
  const deductions = items.filter((i) => i.category === "deduction").sort((a, b) => a.order_index - b.order_index);
  const employer = items.filter((i) => i.category === "employer").sort((a, b) => a.order_index - b.order_index);

  const totalEarnings = earnings.reduce((s, i) => s + i.amount, 0);
  const totalDeductions = deductions.reduce((s, i) => s + i.amount, 0);
  const totalEmployer = employer.reduce((s, i) => s + i.amount, 0);

  async function handleApprove() {
    setActionLoading("approve");
    setActionError(null);
    try {
      await apiFetch(`/api/payroll/runs/${runId}/lines/${line.id}`, {
        method: "PATCH",
        json: { action: "approve" },
      });
      notifySuccess("Empleado aprobado");
      onRefresh();
      onClose();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Error al aprobar");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRequestChanges() {
    setActionLoading("request_changes");
    setActionError(null);
    try {
      await apiFetch(`/api/payroll/runs/${runId}/lines/${line.id}`, {
        method: "PATCH",
        json: { action: "request_changes" },
      });
      onRefresh();
      onClose();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Error al solicitar cambios");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleAddAdjust(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(adjAmount);
    if (!adjLabel.trim() || isNaN(amt) || amt <= 0) return;
    setActionLoading("adjust");
    setActionError(null);
    try {
      await apiFetch(`/api/payroll/runs/${runId}/lines/${line.id}/items`, {
        method: "POST",
        json: { label: adjLabel.trim(), amount: amt, category: adjCategory },
      });
      setShowAdjust(false);
      setAdjLabel("");
      setAdjAmount("");
      setAdjCategory("earning");
      notifySuccess("Ajuste añadido · total recalculado");
      onRefresh();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Error al añadir ajuste");
    } finally {
      setActionLoading(null);
    }
  }

  const busy = actionLoading !== null;

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 70, background: "rgba(26,26,23,.42)", display: "flex", justifyContent: "flex-end" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "460px", maxWidth: "94vw", height: "100%", overflowY: "auto", background: T.surface, borderLeft: `1.5px solid ${T.ink}`, boxShadow: "-12px 0 40px -20px rgba(26,26,23,.5)", animation: "prSlide .22s cubic-bezier(.2,.7,.3,1)" }}
      >
        <style>{`@keyframes prSlide { from { transform: translateX(30px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
        {/* Sticky header */}
        <div style={{ position: "sticky", top: 0, background: T.surface, borderBottom: `1px solid ${T.line}`, padding: "20px 22px", zIndex: 2 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "13px" }}>
            <span style={{ width: "44px", height: "44px", flexShrink: 0, borderRadius: "50%", background: av.bg, color: av.color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "15px" }}>
              {initials(employee.name)}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: "18px", letterSpacing: "-.4px" }}>{employee.name}</div>
              <div style={{ fontSize: "12.5px", color: T.soft, marginTop: "2px" }}>{employee.role_title} · {employee.department}</div>
            </div>
            <span onClick={onClose} style={{ width: "30px", height: "30px", flexShrink: 0, borderRadius: "8px", border: `1px solid ${T.line}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke={T.soft} strokeWidth="2" strokeLinecap="round"/></svg>
            </span>
          </div>
          <div style={{ marginTop: "12px" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, borderRadius: "999px", padding: "4px 11px", background: badge.bg, color: badge.color }}>{badge.label}</span>
          </div>
        </div>

        <div style={{ padding: "20px 22px" }}>
          {/* Earnings */}
          <SheetSection label="Asignaciones">
            {earnings.length === 0 ? (
              <div style={{ padding: "11px 15px", fontSize: "13px", color: T.soft }}>Sin asignaciones configuradas</div>
            ) : (
              earnings.map((e) => (
                <div key={e.id} style={{ display: "flex", alignItems: "center", padding: "11px 15px", borderBottom: `1px solid ${T.line}` }}>
                  <span style={{ flex: 1, fontSize: "13px" }}>{e.label}</span>
                  {e.quantity_label && <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", color: T.soft, marginRight: "10px" }}>{e.quantity_label}</span>}
                  <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "13px", fontWeight: 700 }}>{formatMoney(e.amount, currency)}</span>
                </div>
              ))
            )}
            <div style={{ display: "flex", alignItems: "center", padding: "12px 15px", background: T.surface2 }}>
              <span style={{ flex: 1, fontSize: "13px", fontWeight: 700 }}>Total asignaciones</span>
              <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "14px", fontWeight: 800 }}>{formatMoney(totalEarnings || line.gross, currency)}</span>
            </div>
          </SheetSection>

          {/* Deductions */}
          <SheetSection label="Deducciones">
            {deductions.length === 0 ? (
              <div style={{ padding: "11px 15px", fontSize: "13px", color: T.soft }}>Sin deducciones</div>
            ) : (
              deductions.map((d) => (
                <div key={d.id} style={{ display: "flex", alignItems: "center", padding: "11px 15px", borderBottom: `1px solid ${T.line}` }}>
                  <span style={{ flex: 1, fontSize: "13px" }}>{d.label}</span>
                  <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "13px", fontWeight: 700, color: T.accent }}>−{formatMoney(Math.abs(d.amount), currency)}</span>
                </div>
              ))
            )}
            <div style={{ display: "flex", alignItems: "center", padding: "12px 15px", background: T.surface2 }}>
              <span style={{ flex: 1, fontSize: "13px", fontWeight: 700 }}>Total deducciones</span>
              <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "14px", fontWeight: 800, color: T.accent }}>−{formatMoney(Math.abs(totalDeductions), currency)}</span>
            </div>
          </SheetSection>

          {/* Net */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: T.brand, color: "#fff", borderRadius: "13px", padding: "16px 18px", marginBottom: "18px" }}>
            <div>
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: ".5px", opacity: .8 }}>Neto a pagar</div>
              <div style={{ fontSize: "11px", opacity: .75, marginTop: "3px" }}>Transferencia</div>
            </div>
            <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: "26px", letterSpacing: "-1px", fontVariantNumeric: "tabular-nums" }}>
              {formatMoney(line.net, currency)}
            </span>
          </div>

          {/* Employer cost */}
          {employer.length > 0 && (
            <SheetSection label="Coste empresa (cargas patronales)">
              {employer.map((c) => (
                <div key={c.id} style={{ display: "flex", alignItems: "center", padding: "11px 15px", borderBottom: `1px solid ${T.line}` }}>
                  <span style={{ flex: 1, fontSize: "13px" }}>{c.label}</span>
                  <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "13px", fontWeight: 700 }}>{formatMoney(c.amount, currency)}</span>
                </div>
              ))}
              <div style={{ display: "flex", alignItems: "center", padding: "12px 15px", background: T.surface2 }}>
                <span style={{ flex: 1, fontSize: "13px", fontWeight: 700 }}>Coste total empresa</span>
                <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "14px", fontWeight: 800 }}>{formatMoney(totalEmployer || line.employer_cost, currency)}</span>
              </div>
            </SheetSection>
          )}

          {/* Adjustment form (inline) */}
          {showAdjust && (
            <form
              onSubmit={handleAddAdjust}
              style={{ background: T.bg, border: `1.5px solid ${T.line}`, borderRadius: "13px", padding: "16px 18px", marginBottom: "14px", display: "flex", flexDirection: "column", gap: "12px" }}
            >
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: ".5px", color: T.soft }}>Nuevo ajuste manual</div>
              <label style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                <span style={{ fontSize: "12px", color: T.soft }}>Concepto</span>
                <input
                  type="text"
                  value={adjLabel}
                  onChange={(e) => setAdjLabel(e.target.value)}
                  placeholder="Ej. Bono de desempeño"
                  required
                  disabled={busy}
                  style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: "13px", color: T.ink, background: T.surface, border: `1.5px solid ${T.line}`, borderRadius: "9px", padding: "9px 12px", outline: "none", width: "100%", boxSizing: "border-box" }}
                />
              </label>
              <div style={{ display: "flex", gap: "10px" }}>
                <label style={{ flex: 1, display: "flex", flexDirection: "column", gap: "5px" }}>
                  <span style={{ fontSize: "12px", color: T.soft }}>Monto</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={adjAmount}
                    onChange={(e) => setAdjAmount(e.target.value)}
                    placeholder="0.00"
                    required
                    disabled={busy}
                    style={{ fontFamily: "'Space Mono',monospace", fontSize: "13px", color: T.ink, background: T.surface, border: `1.5px solid ${T.line}`, borderRadius: "9px", padding: "9px 12px", outline: "none", width: "100%", boxSizing: "border-box" }}
                  />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                  <span style={{ fontSize: "12px", color: T.soft }}>Tipo</span>
                  <select
                    value={adjCategory}
                    onChange={(e) => setAdjCategory(e.target.value as "earning" | "deduction")}
                    disabled={busy}
                    style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: "13px", color: T.ink, background: T.surface, border: `1.5px solid ${T.line}`, borderRadius: "9px", padding: "9px 12px", outline: "none", boxSizing: "border-box" }}
                  >
                    <option value="earning">Asignación (+)</option>
                    <option value="deduction">Deducción (−)</option>
                  </select>
                </label>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => { setShowAdjust(false); setAdjLabel(""); setAdjAmount(""); setAdjCategory("earning"); }}
                  disabled={busy}
                  style={{ flex: 1, fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 600, fontSize: "12.5px", color: T.soft, background: "transparent", border: `1.5px solid ${T.line}`, borderRadius: "9px", padding: "9px", cursor: "pointer" }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={busy || !adjLabel.trim() || !adjAmount}
                  style={{ flex: 2, fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "12.5px", color: "#fff", background: busy ? "#B7C9A8" : T.brand, border: `2px solid ${busy ? "#A9BD97" : T.ink}`, borderRadius: "9px", padding: "9px", boxShadow: busy ? "none" : `2px 2px 0 ${T.ink}`, cursor: busy ? "not-allowed" : "pointer" }}
                >
                  {actionLoading === "adjust" ? "Guardando…" : "Guardar ajuste"}
                </button>
              </div>
            </form>
          )}

          {actionError && (
            <div style={{ background: T.amberSoft, border: "1px solid #EBD9A8", borderRadius: "10px", padding: "10px 13px", fontSize: "12.5px", color: T.amber, marginBottom: "12px" }}>
              {actionError}
            </div>
          )}

          {/* CTAs */}
          <div style={{ display: "flex", flexDirection: "column", gap: "9px", marginTop: "4px" }}>
            <button
              onClick={handleApprove}
              disabled={busy}
              style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "13px", color: "#fff", background: busy ? "#B7C9A8" : T.brand, border: `2px solid ${busy ? "#A9BD97" : T.ink}`, borderRadius: "11px", padding: "11px", boxShadow: busy ? "none" : `3px 3px 0 ${T.ink}`, cursor: busy ? "not-allowed" : "pointer" }}
            >
              {actionLoading === "approve" ? "Aprobando…" : "Aprobar empleado"}
            </button>
            <div style={{ display: "flex", gap: "9px" }}>
              <button
                onClick={handleRequestChanges}
                disabled={busy}
                style={{ flex: 1, fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 700, fontSize: "12.5px", color: busy ? T.soft : T.ink, background: T.surface, border: `1.5px solid ${T.line}`, borderRadius: "11px", padding: "10px", cursor: busy ? "not-allowed" : "pointer" }}
              >
                {actionLoading === "request_changes" ? "Enviando…" : "Solicitar cambios"}
              </button>
              <button
                onClick={() => setShowAdjust((v) => !v)}
                disabled={busy}
                style={{ flex: 1, fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 700, fontSize: "12.5px", color: busy ? T.soft : T.ink, background: showAdjust ? T.bg : T.surface, border: `1.5px solid ${showAdjust ? T.ink : T.line}`, borderRadius: "11px", padding: "10px", cursor: busy ? "not-allowed" : "pointer" }}
              >
                Añadir ajuste
              </button>
            </div>
            <button
              onClick={onOpenPayslip}
              style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 600, fontSize: "12.5px", color: T.brand, background: "transparent", border: "none", padding: "6px", cursor: "pointer" }}
            >
              Ver recibo de pago →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SheetSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: ".5px", color: T.soft, marginBottom: "9px" }}>{label}</div>
      <div style={{ background: T.bg, border: `1px solid ${T.line}`, borderRadius: "12px", overflow: "hidden", marginBottom: "18px" }}>
        {children}
      </div>
    </>
  );
}

// ── Payslip Modal ─────────────────────────────────────────────────────────────
function PayslipModal({
  line, employee, items, company, currency, onClose,
}: {
  line: RunData["lines"][0];
  employee: RunData["lines"][0]["employees"];
  items: PayRunLineItem[];
  company: { name: string };
  currency: string;
  onClose: () => void;
}) {
  const earnings = items.filter((i) => i.category === "earning").sort((a, b) => a.order_index - b.order_index);
  const deductions = items.filter((i) => i.category === "deduction").sort((a, b) => a.order_index - b.order_index);

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(26,26,23,.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "26px" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: "600px", maxHeight: "90vh", overflowY: "auto", background: "#fff", border: `1.5px solid ${T.ink}`, borderRadius: "16px", boxShadow: "10px 10px 0 rgba(26,26,23,.25)" }}
      >
        {/* Doc header */}
        <div style={{ padding: "26px 30px", borderBottom: `2px solid ${T.ink}`, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "11px" }}>
            <span style={{ width: "34px", height: "34px", borderRadius: "9px", background: T.brand, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                <path d="M4 7l8 4 8-4M4 7l8-4 8 4M4 7v10l8 4 8-4V7M12 11v10" stroke="#C6F24E" strokeWidth="2" strokeLinejoin="round"/>
              </svg>
            </span>
            <div>
              <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: "16px" }}>{company.name}</div>
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", color: T.soft }}>TalentOS Payroll</div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: ".5px", color: T.soft }}>Recibo de pago</div>
          </div>
        </div>

        {/* Employee block */}
        <div style={{ padding: "18px 30px", borderBottom: `1px solid ${T.line}`, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 20px" }}>
          {[
            ["Empleado", employee.name],
            ["Cargo", employee.role_title ?? "—"],
            ["Departamento", employee.department ?? "—"],
          ].map(([label, val]) => (
            <div key={label}>
              <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "9.5px", textTransform: "uppercase", color: T.soft }}>{label}</span>
              <div style={{ fontSize: "13.5px", fontWeight: 600, marginTop: "2px" }}>{val}</div>
            </div>
          ))}
        </div>

        {/* Earnings / Deductions */}
        <div style={{ padding: "20px 30px" }}>
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: ".5px", color: T.brand, marginBottom: "8px" }}>
            Asignaciones
          </div>
          {earnings.length === 0 ? (
            <div style={{ padding: "7px 0", fontSize: "13px", color: T.soft }}>Sin asignaciones</div>
          ) : (
            earnings.map((e) => (
              <div key={e.id} style={{ display: "flex", padding: "7px 0", borderBottom: "1px solid #F0ECE2" }}>
                <span style={{ flex: 1, fontSize: "13px" }}>{e.label}</span>
                {e.quantity_label && <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "11px", color: T.soft, width: "90px" }}>{e.quantity_label}</span>}
                <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "13px", fontWeight: 700, width: "80px", textAlign: "right" }}>{formatMoney(e.amount, currency)}</span>
              </div>
            ))
          )}

          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: ".5px", color: T.accent, margin: "18px 0 8px" }}>
            Deducciones
          </div>
          {deductions.length === 0 ? (
            <div style={{ padding: "7px 0", fontSize: "13px", color: T.soft }}>Sin deducciones</div>
          ) : (
            deductions.map((d) => (
              <div key={d.id} style={{ display: "flex", padding: "7px 0", borderBottom: "1px solid #F0ECE2" }}>
                <span style={{ flex: 1, fontSize: "13px" }}>{d.label}</span>
                <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "13px", fontWeight: 700, color: T.accent, width: "80px", textAlign: "right" }}>−{formatMoney(Math.abs(d.amount), currency)}</span>
              </div>
            ))
          )}
        </div>

        {/* Net */}
        <div style={{ margin: "0 30px", display: "flex", alignItems: "center", justifyContent: "space-between", background: T.brand, color: "#fff", borderRadius: "12px", padding: "16px 20px" }}>
          <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "15px" }}>Neto a pagar</span>
          <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: "26px", letterSpacing: "-1px", fontVariantNumeric: "tabular-nums" }}>{formatMoney(line.net, currency)}</span>
        </div>

        {/* Signature area */}
        <div style={{ padding: "16px 30px 24px", borderTop: `1px solid ${T.line}`, marginTop: "18px", display: "flex", alignItems: "center", gap: "20px" }}>
          {["Firma digital · empleador", "Recibí conforme · empleado"].map((l) => (
            <div key={l} style={{ flex: 1 }}>
              <div style={{ height: "1px", background: T.ink, marginBottom: "5px" }}/>
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "9.5px", color: T.soft }}>{l}</div>
            </div>
          ))}
        </div>

        {/* Actions bar */}
        <div style={{ position: "sticky", bottom: 0, background: T.surface, borderTop: `1px solid ${T.line}`, padding: "14px 30px", display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 600, fontSize: "13px", color: T.soft, background: "transparent", border: "none", padding: "10px 14px", cursor: "pointer" }}>
            Cerrar
          </button>
          <button style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 700, fontSize: "13px", color: T.ink, background: T.surface, border: `1.5px solid ${T.line}`, borderRadius: "11px", padding: "10px 15px", cursor: "pointer" }}>
            Enviar al empleado
          </button>
          <button style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "13px", color: "#fff", background: T.brand, border: `2px solid ${T.ink}`, borderRadius: "11px", padding: "10px 18px", boxShadow: `3px 3px 0 ${T.ink}`, cursor: "pointer" }}>
            Descargar PDF
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export function PayRunDetail({ id, companyName, companyPack, role }: { id: string; companyName: string; companyPack: string; role: "owner" | "hr_admin" }) {
  const router = useRouter();
  const [data, setData] = useState<RunData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [transitionError, setTransitionError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);
  const [tab, setTab] = useState<"empleados" | "aprobacion" | "exportar">("empleados");
  const [sheetLineId, setSheetLineId] = useState<string | null>(null);
  const [payslipLineId, setPayslipLineId] = useState<string | null>(null);
  // Copilot de nómina (S1→S2): anota la corrida antes de aprobar; solo señala.
  const [review, setReview] = useState<{
    findings: ReviewFinding[];
    summary: string;
    summary_source: "ok" | "fallback";
    compared_to: { period_label: string } | null;
  } | null>(null);
  const [reviewing, setReviewing] = useState(false);
  // Ciclo de vida §4.6: los paneles invocados se COLAPSAN, no se cierran (AgentPanelShell).
  // reviewNonce remonta el shell al re-invocar, para que datos frescos arranquen expandidos.
  const [reviewNonce, setReviewNonce] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  const loadData = useCallback(() => {
    setLoading(true);
    fetch(`/api/payroll/runs/${id}`)
      .then((r) => r.json())
      .then((d) => { if (mountedRef.current) setData(d); })
      .finally(() => { if (mountedRef.current) setLoading(false); });
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleAnnotate() {
    setReviewing(true);
    try {
      const res = await apiFetch<NonNullable<typeof review>>(`/api/payroll/runs/${id}/review`);
      if (mountedRef.current) {
        setReview(res);
        // Re-invocar (§4.6) = datos frescos + panel expandido: el nonce remonta el shell
        // (que gestiona su propio colapso) para que arranque en "Ver menos".
        setReviewNonce((n) => n + 1);
      }
    } catch {
      // apiFetch ya notifica; el botón vuelve a reposo
    } finally {
      if (mountedRef.current) setReviewing(false);
    }
  }

  async function handleRegenerate() {
    if (generating) return;
    setGenerating(true);
    try {
      await apiFetch(`/api/payroll/runs/${id}/generate`, { method: "POST" });
      loadData();
    } finally {
      if (mountedRef.current) setGenerating(false);
    }
  }

  async function handleExport(type: string, periodMonth: string) {
    if (exporting) return;
    setExporting(type);
    setTransitionError(null);
    try {
      const resp = await fetch(`/api/payroll/runs/${id}/export?type=${type}`);
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({})) as { error?: string };
        if (mountedRef.current) setTransitionError(body.error ?? "Error al exportar");
        return;
      }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type}-${periodMonth}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      notifySuccess("CSV exportado");
      loadData(); // refrescar log de exports
    } finally {
      if (mountedRef.current) setExporting(null);
    }
  }

  async function handleTransitionStatus(newStatus: string) {
    if (transitioning) return;
    setTransitioning(true);
    setTransitionError(null);
    try {
      await apiFetch(`/api/payroll/runs/${id}`, { method: "PATCH", json: { status: newStatus } });
      const STATUS_MSGS: Record<string, string> = {
        in_review: "Corrida enviada a revisión",
        approved: "Corrida aprobada",
        exported: "Corrida marcada como exportada",
        paid: "Corrida marcada como pagada",
      };
      notifySuccess(STATUS_MSGS[newStatus] ?? "Estado actualizado");
      loadData();
    } catch (e) {
      if (mountedRef.current) setTransitionError(e instanceof Error ? e.message : "Error al cambiar estado");
    } finally {
      if (mountedRef.current) setTransitioning(false);
    }
  }

  if (loading) {
    return <div style={{ padding: "40px", textAlign: "center", color: T.soft, fontFamily: "'Space Mono',monospace", fontSize: "11px" }}>Cargando corrida…</div>;
  }
  if (!data?.run) {
    return <div style={{ padding: "40px", textAlign: "center", color: T.soft }}>Corrida no encontrada</div>;
  }

  const { run, lines, itemsByLine, audit, exportLog } = data;
  const withoutLine = data.withoutLine ?? [];
  const runBadge = STATUS[run.status] ?? STATUS.draft;

  const sheetLine = sheetLineId ? lines.find((l) => l.id === sheetLineId) ?? null : null;
  const payslipLine = payslipLineId ? lines.find((l) => l.id === payslipLineId) ?? null : null;

  const summaryStrip = [
    { label: "Gross",          value: formatMoney(run.gross, run.currency),         color: T.ink },
    { label: "Net",            value: formatMoney(run.net, run.currency),           color: T.ink },
    { label: "Coste empresa",  value: formatMoney(run.employer_cost, run.currency), color: T.ink },
    { label: "Empleados",      value: String(run.employee_count),                   color: T.ink },
    { label: "Incidencias",    value: String(lines.filter((l) => l.has_bank_issue || l.has_adjustment_issue || l.has_salary_change).length), color: T.accent },
    { label: "Status",         value: runBadge.label,                               color: runBadge.color },
  ];

  const issueLines = lines.filter((l) => l.has_bank_issue || l.has_adjustment_issue || l.has_salary_change);

  const isExportable = ["approved", "exported", "paid"].includes(run.status);

  const EXPORT_TYPES = [
    { type: "payslips_pdf",   title: "Payslips PDF",          desc: "Un PDF por empleado, descarga en ZIP.", cta: "Descargar recibos", available: false, badge: "Próximamente" },
    { type: "payroll_csv",    title: "Payroll Summary CSV",   desc: "Resumen tabular de toda la corrida.", cta: "Exportar CSV", available: true, badge: null },
    { type: "accounting_csv", title: "Accounting Export",     desc: "CSV estructurado para contabilidad externa.", cta: "Exportar", available: true, badge: null },
    { type: "bank_file",      title: "Bank Payment File",     desc: "Archivo para cargar en el banco (formato local).", cta: "Generar", available: false, badge: "Solo Pack País" },
    { type: "compliance",     title: "Local Compliance (VE)", desc: "Declaraciones y planillas por país.", cta: "Generar", available: false, badge: "Solo Pack País" },
  ];

  return (
    <>
      <div>
        {/* Back */}
        <button
          onClick={() => router.push("/payroll")}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontFamily: "'Space Mono',monospace", fontSize: "11px", color: T.soft, background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: "12px" }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Pay Runs
        </button>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", flexWrap: "wrap", marginBottom: "20px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <h2 style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: "26px", letterSpacing: "-.9px", margin: 0 }}>{run.period_label}</h2>
              <span style={{ fontSize: "11.5px", fontWeight: 700, borderRadius: "999px", padding: "4px 12px", background: runBadge.bg, color: runBadge.color }}>
                {runBadge.label}
              </span>
            </div>
            <div style={{ fontSize: "13.5px", color: T.soft, marginTop: "5px" }}>
              {run.entity_name} · {run.run_type === "monthly" ? "corrida mensual" : run.run_type} · <span style={{ fontFamily: "'Space Mono',monospace" }}>{run.employee_count} empleados</span>
            </div>
            {companyPack === "generic" && (
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", color: T.soft, marginTop: "5px" }}>
                Pack genérico · sin retenciones legales aplicadas
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: "10px", flexDirection: "column", alignItems: "flex-end" }}>
            <div style={{ display: "flex", gap: "10px" }}>
              <AgentActionButton
                idleLabel="Anotar corrida"
                busyLabel="Anotando…"
                busy={reviewing}
                onClick={handleAnnotate}
              />
              {run.status === "draft" && (
                <button
                  onClick={handleRegenerate}
                  disabled={generating}
                  style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 700, fontSize: "13px", color: generating ? T.soft : T.ink, background: T.surface, border: `1.5px solid ${T.line}`, borderRadius: "11px", padding: "10px 15px", cursor: generating ? "not-allowed" : "pointer" }}
                >
                  {generating ? "Recalculando…" : "Recalcular"}
                </button>
              )}
              {run.status === "draft" && (
                <button
                  onClick={() => handleTransitionStatus("in_review")}
                  disabled={transitioning}
                  style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "13px", color: "#fff", background: transitioning ? "#B7C9A8" : T.brand, border: `2px solid ${transitioning ? "#A9BD97" : T.ink}`, borderRadius: "11px", padding: "10px 18px", boxShadow: transitioning ? "none" : `3px 3px 0 ${T.ink}`, cursor: transitioning ? "not-allowed" : "pointer" }}
                >
                  {transitioning ? "Enviando…" : "Enviar a revisión"}
                </button>
              )}
              {run.status === "in_review" && (
                <span style={{ fontSize: "12.5px", color: T.amber, fontWeight: 700, padding: "10px 14px", background: T.amberSoft, borderRadius: "11px" }}>
                  Pendiente de aprobación
                </span>
              )}
              {(run.status === "approved" || run.status === "exported" || run.status === "paid") && (
                <span style={{ fontSize: "12.5px", color: T.brand, fontWeight: 700, padding: "10px 14px", background: T.brandSoft, borderRadius: "11px" }}>
                  ✓ {STATUS[run.status]?.label ?? run.status}
                </span>
              )}
            </div>
            {transitionError && (
              <div style={{ fontSize: "12px", color: T.accent, background: T.accentSoft, borderRadius: "8px", padding: "6px 12px" }}>
                {transitionError}
              </div>
            )}
          </div>
        </div>

        {/* Revisión de la corrida (P6, blueprint B-5) — regla anti-redundancia:
            solo lo comparativo-temporal (lo que la tabla no puede mostrar); los
            flags ya visibles en la tabla se colapsan en una línea de enlace. */}
        {review && (() => {
          const COMPARATIVE = new Set(["variation", "new_in_run", "missing_from_run"]);
          const comparative = review.findings.filter((f) => COMPARATIVE.has(f.kind));
          const inTable = review.findings.length - comparative.length;
          return (
            <AgentPanelShell
              key={reviewNonce}
              className="mb-5"
              title="Revisión de la corrida"
              provenance={review.summary_source === "ok" ? "ia" : "heuristica"}
              count={`${comparative.length} aviso${comparative.length !== 1 ? "s" : ""} · ${inTable} en tabla`}
            >
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", letterSpacing: ".5px", color: "#8C877E", marginBottom: "10px" }}>
                {review.compared_to ? `vs ${review.compared_to.period_label}` : "sin corrida anterior comparable"}
              </div>
              <p style={{ fontSize: "13.5px", lineHeight: 1.55, margin: comparative.length || inTable ? "0 0 12px" : 0 }}>{review.summary}</p>
              {comparative.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                  {comparative.map((f, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                      <span
                        style={{
                          width: "6px", height: "6px", borderRadius: "50%", marginTop: "6px", flexShrink: 0,
                          background: f.severity === "warning" ? "#E0A23C" : "#8C877E",
                        }}
                      />
                      <span style={{ fontSize: "12.5px", lineHeight: 1.5, color: "#D8D3C8" }}>{f.text}</span>
                    </div>
                  ))}
                </div>
              )}
              {inTable > 0 && (
                <button
                  onClick={() => {
                    setTab("empleados");
                    setTimeout(() => document.getElementById("run-lines-table")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
                  }}
                  style={{ marginTop: comparative.length ? "10px" : 0, background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "'Space Mono',monospace", fontSize: "11px", color: "#C6F24E", textDecoration: "underline", textUnderlineOffset: "3px" }}
                >
                  {inTable} incidencia{inTable !== 1 ? "s" : ""} marcada{inTable !== 1 ? "s" : ""} en la tabla ↓
                </button>
              )}
            </AgentPanelShell>
          );
        })()}

        {/* Summary strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: "10px", marginBottom: "20px" }}>
          {summaryStrip.map((s) => (
            <div key={s.label} style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: "13px", padding: "13px 14px" }}>
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "9.5px", textTransform: "uppercase", letterSpacing: ".5px", color: T.soft }}>{s.label}</div>
              <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: "18px", letterSpacing: "-.5px", marginTop: "7px", color: s.color, fontVariantNumeric: "tabular-nums" }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "4px", borderBottom: `1.5px solid ${T.line}`, marginBottom: "20px" }}>
          {(["empleados", "aprobacion", "exportar"] as const).map((t) => {
            const labels = { empleados: "Empleados", aprobacion: "Aprobación", exportar: "Exportar" };
            const active = tab === t;
            return (
              <span
                key={t}
                onClick={() => setTab(t)}
                style={active
                  ? { fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "13.5px", color: T.ink, padding: "11px 15px", borderBottom: `2.5px solid ${T.brand}`, marginBottom: "-1.5px", cursor: "pointer" }
                  : { fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 600, fontSize: "13.5px", color: T.soft, padding: "11px 15px", cursor: "pointer" }
                }
              >
                {labels[t]}
              </span>
            );
          })}
        </div>

        {/* ── TAB: EMPLEADOS ── */}
        {tab === "empleados" && (
          <div id="run-lines-table" style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: "16px", overflow: "hidden", scrollMarginTop: "16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1.1fr 1fr 0.9fr 0.8fr", padding: "12px 20px", borderBottom: `1px solid ${T.line}`, fontFamily: "'Space Mono',monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: ".5px", color: T.soft }}>
              <span>Empleado</span><span>Departamento</span>
              <span style={{ textAlign: "right" }}>Neto</span>
              <span>Status</span>
              <span style={{ textAlign: "right" }}>Alertas</span>
            </div>
            {lines.length === 0 ? (
              <div style={{ padding: "32px 20px", textAlign: "center", color: T.soft, fontSize: "13px" }}>
                Sin empleados en esta corrida
              </div>
            ) : (
              lines.map((line, idx) => {
                const av = avatarPal(idx);
                const badge = LINE_STATUS[line.status] ?? LINE_STATUS.draft;
                const alerts: string[] = [];
                if (line.has_bank_issue) alerts.push("bank");
                if (line.has_adjustment_issue) alerts.push("adjust");
                if (line.has_salary_change) alerts.push("salary");
                if (line.has_unconfirmed_input) alerts.push("input");
                return (
                  <div
                    key={line.id}
                    onClick={() => setSheetLineId(line.id)}
                    style={{ display: "grid", gridTemplateColumns: "1.7fr 1.1fr 1fr 0.9fr 0.8fr", alignItems: "center", padding: "13px 20px", borderBottom: `1px solid ${T.line}`, cursor: "pointer", transition: "background .1s" }}
                    onMouseOver={(e) => { e.currentTarget.style.background = "#F8F4EB"; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = ""; }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: "11px", minWidth: 0 }}>
                      <span style={{ width: "32px", height: "32px", flexShrink: 0, borderRadius: "50%", background: av.bg, color: av.color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "12px" }}>
                        {initials(line.employees.name)}
                      </span>
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: "block", fontSize: "13.5px", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{line.employees.name}</span>
                        <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", color: T.soft }}>{line.employees.role_title}</span>
                      </span>
                    </span>
                    <span style={{ fontSize: "13px", color: "#54504A" }}>{line.employees.department}</span>
                    <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "14px", fontWeight: 700, textAlign: "right" }}>{formatMoney(line.net, run.currency)}</span>
                    <span>
                      <span style={{ fontSize: "11px", fontWeight: 700, borderRadius: "999px", padding: "3px 10px", background: badge.bg, color: badge.color }}>{badge.label}</span>
                    </span>
                    <span style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "5px" }}>
                      {alerts.length > 0 ? alerts.map((a) => <AlertIcon key={a} type={a}/>) : <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "11px", color: "#B7C0AE" }}>—</span>}
                    </span>
                  </div>
                );
              })
            )}

            {/* Employees without a line */}
            {withoutLine.length > 0 && (
              <div style={{ borderTop: `1px solid ${T.line}`, padding: "14px 20px" }}>
                <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: ".5px", color: T.soft, marginBottom: "10px" }}>
                  Sin línea en esta corrida ({withoutLine.length})
                </div>
                {withoutLine.map((emp) => (
                  <div key={emp.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 0", borderBottom: `1px solid ${T.line}` }}>
                    <span style={{ width: "28px", height: "28px", flexShrink: 0, borderRadius: "50%", background: "#EEE9DD", color: T.soft, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "11px" }}>
                      {initials(emp.name)}
                    </span>
                    <span style={{ flex: 1, fontSize: "13px", fontWeight: 600, color: T.soft }}>{emp.name}</span>
                    <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "11px", color: T.accent }}>sin perfil vigente o moneda/frecuencia incompatible</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "16px 20px", fontFamily: "'Space Mono',monospace", fontSize: "11px", color: T.soft }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/><path d="M12 8v5M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              Clic en un empleado para ver el desglose completo.
            </div>
          </div>
        )}

        {/* ── TAB: APROBACIÓN ── */}
        {tab === "aprobacion" && (
          <div style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: "16px", alignItems: "start" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Checklist */}
              <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: "16px", padding: "20px" }}>
                <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "15px", marginBottom: "16px" }}>Checklist de cierre</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "11px" }}>
                  {[
                    { ok: lines.filter((l) => l.has_bank_issue).length === 0, label: `${lines.filter((l) => l.has_bank_issue).length === 0 ? "Todos los" : `${lines.filter((l) => l.has_bank_issue).length}`} empleado${lines.filter((l) => l.has_bank_issue).length !== 1 ? "s" : ""} con cuenta bancaria configurada` },
                    { ok: lines.filter((l) => l.has_adjustment_issue).length === 0, label: `${lines.filter((l) => l.has_adjustment_issue).length === 0 ? "Sin" : lines.filter((l) => l.has_adjustment_issue).length} ajuste${lines.filter((l) => l.has_adjustment_issue).length !== 1 ? "s" : ""} manual${lines.filter((l) => l.has_adjustment_issue).length !== 1 ? "es" : ""} pendiente${lines.filter((l) => l.has_adjustment_issue).length !== 1 ? "s" : ""} de revisión` },
                    { ok: lines.filter((l) => l.has_salary_change).length === 0, label: "Sin cambios de salario sin propagar" },
                    { ok: lines.filter((l) => l.has_unconfirmed_input).length === 0, label: "Todos los inputs del periodo confirmados" },
                    { ok: lines.filter((l) => l.status === "draft").length === 0, label: `${lines.filter((l) => l.status !== "draft").length} de ${lines.length} empleados revisados` },
                  ].map((c, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "11px" }}>
                      <span style={{ width: "20px", height: "20px", flexShrink: 0, borderRadius: "6px", background: c.ok ? T.brandSoft : T.amberSoft, display: "flex", alignItems: "center", justifyContent: "center", marginTop: "1px" }}>
                        {c.ok
                          ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5 9-11" stroke={T.brand} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          : <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 8v5M12 16.5h.01" stroke={T.amber} strokeWidth="2.6" strokeLinecap="round"/></svg>
                        }
                      </span>
                      <span style={{ fontSize: "13.5px", lineHeight: 1.4, color: c.ok ? "#3A3833" : "#7A5310" }}>{c.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Issues */}
              {issueLines.length > 0 && (
                <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: "16px", overflow: "hidden" }}>
                  <div style={{ padding: "15px 20px 12px", fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "15px" }}>Empleados con incidencia</div>
                  {issueLines.map((l) => {
                    const av = avatarPal(lines.indexOf(l));
                    const issues: string[] = [];
                    if (l.has_bank_issue) issues.push("Sin cuenta bancaria registrada");
                    if (l.has_adjustment_issue) issues.push("Ajuste manual pendiente");
                    if (l.has_salary_change) issues.push("Cambio de salario en el periodo");
                    return (
                      <div key={l.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "13px 20px", borderTop: `1px solid ${T.line}` }}>
                        <span style={{ width: "30px", height: "30px", flexShrink: 0, borderRadius: "50%", background: av.bg, color: av.color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "11px" }}>
                          {initials(l.employees.name)}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "13px", fontWeight: 700 }}>{l.employees.name}</div>
                          <div style={{ fontSize: "12px", color: T.accent, marginTop: "1px" }}>{issues[0]}</div>
                        </div>
                        <button
                          onClick={() => setSheetLineId(l.id)}
                          style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 700, fontSize: "12px", color: T.ink, background: T.surface, border: `1.5px solid ${T.ink}`, borderRadius: "9px", padding: "7px 14px", cursor: "pointer" }}
                        >
                          Resolver
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Audit log */}
              <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: "16px", padding: "20px" }}>
                <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", textTransform: "uppercase", letterSpacing: ".5px", color: T.soft, marginBottom: "14px" }}>Historial de la corrida</div>
                {audit.length === 0 ? (
                  <div style={{ fontSize: "13px", color: T.soft }}>Sin historial aún</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                    {audit.map((a) => (
                      <div key={a.id} style={{ display: "flex", gap: "12px", paddingBottom: "16px" }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                          <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: T.brand, marginTop: "3px" }}/>
                          <span style={{ flex: 1, width: "1.5px", background: T.line, marginTop: "3px" }}/>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: "13px", lineHeight: 1.4 }}>{a.text}</div>
                          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", color: T.soft, marginTop: "3px" }}>
                            {a.who} · {new Date(a.created_at).toLocaleDateString("es-VE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Approve panel */}
              <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: "16px", padding: "20px" }}>
                {issueLines.length > 0 && (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", background: T.amberSoft, border: "1px solid #EBD9A8", borderRadius: "12px", padding: "12px 14px", marginBottom: "16px" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: "1px" }}>
                      <path d="M12 3l9 16H3l9-16Z" stroke={T.amber} strokeWidth="2" strokeLinejoin="round"/>
                      <path d="M12 10v4M12 17h.01" stroke={T.amber} strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    <span style={{ fontSize: "12.5px", lineHeight: 1.45, color: "#7A5310" }}>
                      No se puede aprobar mientras haya <b>{issueLines.length} incidencia{issueLines.length !== 1 ? "s" : ""}</b> sin resolver.
                    </span>
                  </div>
                )}
                {(() => {
                  const allLinesApproved = lines.filter((l) => l.status !== "approved").length === 0;
                  const canApproveNomina = role === "owner" && run.status === "in_review" && issueLines.length === 0 && allLinesApproved;
                  const approveDisabled = !canApproveNomina || transitioning;
                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      <button
                        onClick={canApproveNomina ? () => handleTransitionStatus("approved") : undefined}
                        disabled={approveDisabled}
                        style={{
                          fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "13.5px",
                          color: "#fff", background: approveDisabled ? "#B7C9A8" : T.brand,
                          border: `2px solid ${approveDisabled ? "#A9BD97" : T.ink}`,
                          borderRadius: "11px", padding: "12px",
                          cursor: approveDisabled ? "not-allowed" : "pointer", width: "100%",
                        }}
                      >
                        {transitioning ? "Aprobando…" : "Aprobar nómina"}
                      </button>
                      {role !== "owner" && run.status === "in_review" && (
                        <div style={{ fontSize: "12px", color: T.amber, textAlign: "center" }}>
                          Solo el propietario puede aprobar la nómina.
                        </div>
                      )}
                      {role === "owner" && run.status === "in_review" && !allLinesApproved && issueLines.length === 0 && (
                        <div style={{ fontSize: "12px", color: T.soft, textAlign: "center" }}>
                          {lines.filter((l) => l.status !== "approved").length} línea(s) aún sin aprobar.
                        </div>
                      )}
                      {run.status !== "in_review" && run.status !== "approved" && run.status !== "exported" && run.status !== "paid" && (
                        <div style={{ fontSize: "12px", color: T.soft, textAlign: "center" }}>
                          Envía la corrida a revisión primero.
                        </div>
                      )}
                      <div style={{ display: "flex", gap: "10px" }}>
                        <button style={{ flex: 1, fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 700, fontSize: "12.5px", color: T.accent, background: T.surface, border: `1.5px solid ${T.accentSoft}`, borderRadius: "11px", padding: "10px", cursor: "not-allowed", opacity: 0.5 }}>
                          Rechazar con notas
                        </button>
                        <button style={{ flex: 1, fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 700, fontSize: "12.5px", color: T.soft, background: T.surface, border: `1.5px solid ${T.line}`, borderRadius: "11px", padding: "10px", cursor: "not-allowed" }}>
                          Bloquear corrida
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: EXPORTAR ── */}
        {tab === "exportar" && (
          <div>
            {!isExportable && (
              <div style={{ background: T.amberSoft, border: `1px solid #E5C97A`, borderRadius: "12px", padding: "10px 16px", marginBottom: "14px", fontSize: "12.5px", color: "#5A3A00" }}>
                Los exports se habilitan cuando la corrida esté aprobada.
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "14px" }}>
              {EXPORT_TYPES.map((x) => {
                const enabled = x.available && isExportable;
                const isLoading = exporting === x.type;
                return (
                  <div key={x.type} style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: "15px", padding: "18px 20px", opacity: enabled ? 1 : 0.62 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "11px", marginBottom: "10px" }}>
                      <span style={{ width: "36px", height: "36px", flexShrink: 0, borderRadius: "10px", background: enabled ? T.brandSoft : T.surface2, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <path d="M6 2h9l4 4v16H6zM14 2v5h5" stroke={enabled ? T.brand : T.soft} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
                        </svg>
                      </span>
                      <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "14.5px" }}>{x.title}</span>
                      {x.badge && (
                        <span style={{ marginLeft: "auto", fontSize: "10px", fontWeight: 700, borderRadius: "999px", padding: "3px 9px", background: T.surface2, color: T.soft, border: `1px dashed #CFC7B5`, whiteSpace: "nowrap" }}>
                          {x.badge}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: "12.5px", lineHeight: 1.5, color: T.soft, margin: "0 0 14px" }}>{x.desc}</p>
                    <button
                      disabled={!enabled || !!exporting}
                      onClick={enabled ? () => handleExport(x.type, run.period_month) : undefined}
                      style={{
                        fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "12.5px",
                        color: enabled ? T.ink : T.soft,
                        background: enabled ? T.surface : T.surface2,
                        border: enabled ? `1.5px solid ${T.ink}` : "1.5px dashed #CFC7B5",
                        borderRadius: "10px", padding: "9px 15px",
                        cursor: enabled && !exporting ? "pointer" : "not-allowed",
                        opacity: isLoading ? 0.7 : 1,
                      }}
                    >
                      {isLoading ? "Generando…" : x.cta}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Export log */}
            <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: "16px", overflow: "hidden", marginTop: "16px" }}>
              <div style={{ padding: "14px 20px", borderBottom: `1px solid ${T.line}`, fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "14.5px" }}>Exports anteriores</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr 1.2fr 0.8fr", padding: "11px 20px", borderBottom: `1px solid ${T.line}`, fontFamily: "'Space Mono',monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: ".5px", color: T.soft }}>
                <span>Fecha</span><span>Tipo</span><span>Generado por</span><span style={{ textAlign: "right" }}>Archivo</span>
              </div>
              {exportLog.length === 0 ? (
                <div style={{ padding: "20px", fontSize: "13px", color: T.soft }}>Sin exportaciones previas</div>
              ) : (
                exportLog.map((l) => (
                  <div key={l.id} style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr 1.2fr 0.8fr", alignItems: "center", padding: "12px 20px", borderBottom: `1px solid ${T.line}` }}>
                    <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "12px", color: "#54504A" }}>{new Date(l.created_at).toLocaleDateString("es-VE")}</span>
                    <span style={{ fontSize: "13px", fontWeight: 600 }}>{l.export_type.replace(/_/g, " ")}</span>
                    <span style={{ fontSize: "12.5px", color: "#54504A" }}>{l.generated_by}</span>
                    <span style={{ textAlign: "right" }}>
                      {l.file_path && <a href={l.file_path} style={{ fontFamily: "'Space Mono',monospace", fontSize: "11px", fontWeight: 700, color: T.brand }}>Descargar</a>}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Employee Sheet ── */}
      {sheetLine && (
        <EmployeeSheet
          line={sheetLine}
          employee={sheetLine.employees}
          items={itemsByLine[sheetLine.id] ?? []}
          avIdx={lines.indexOf(sheetLine)}
          currency={run.currency}
          runId={id}
          userRole={role}
          onClose={() => setSheetLineId(null)}
          onOpenPayslip={() => { setPayslipLineId(sheetLine.id); }}
          onRefresh={loadData}
        />
      )}

      {/* ── Payslip Modal ── */}
      {payslipLine && (
        <PayslipModal
          line={payslipLine}
          employee={payslipLine.employees}
          items={itemsByLine[payslipLine.id] ?? []}
          company={{ name: companyName }}
          currency={run.currency}
          onClose={() => setPayslipLineId(null)}
        />
      )}
    </>
  );
}
