"use client";

import { useState } from "react";
import { TimeField } from "@/components/ui/time-field";
import { useRouter } from "next/navigation";
import { Loader2, AlertTriangle, CheckCircle, Settings } from "lucide-react";
import type { ComplianceConfig, ComplianceViolation } from "@/lib/types";
import { HairlineTable, HairlineRow } from "@/components/hairline-table";

const T = {
  bg: "#F4F0E8", surface: "#FCFAF6", ink: "#1A1A17", soft: "#79746B",
  line: "#E7E1D4", brand: "#0E5C4A", accent: "#F1543F",
  success: "#1B6B4F", successBg: "#DCEFE3",
  warning: "#946312", warningBg: "#F8E7C4",
  danger: "#BD4332", dangerBg: "#F6D9D2",
};

const fieldLabel: React.CSSProperties = {
  fontFamily: "'Space Mono',monospace",
  fontSize: "10.5px",
  textTransform: "uppercase",
  letterSpacing: ".5px",
  color: T.soft,
  display: "block",
  marginBottom: "6px",
};

function minutesToHours(min: number | null | undefined): string {
  if (!min) return "";
  return String(Math.floor(min / 60));
}

function minutesToTime(min: number | null | undefined): string {
  if (min == null) return "";
  const h = Math.floor(min / 60).toString().padStart(2, "0");
  const m = (min % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

const VIOLATION_LABELS: Record<string, string> = {
  max_hours_exceeded: "Exceso de horas",
  early_start: "Fichaje tardío",
  missing_break: "Sin descanso",
  insufficient_break: "Descanso insuficiente",
};

export function ComplianceSettingsPanel({
  config,
  violations,
  companyId,
}: {
  config: ComplianceConfig | null;
  violations: ComplianceViolation[];
  companyId: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);
  const [ackId, setAckId] = useState<string | null>(null);

  // Form state initialized from existing config
  const [maxHours, setMaxHours] = useState(minutesToHours(config?.max_work_minutes_per_day));
  const [maxStart, setMaxStart] = useState(minutesToTime(config?.max_start_time_minutes));
  const [minBreak, setMinBreak] = useState(minutesToHours(config?.min_break_minutes));
  const [alertMax, setAlertMax] = useState(config?.alert_on_max_hours ?? true);
  const [alertBreak, setAlertBreak] = useState(config?.alert_on_missing_break ?? true);

  async function saveConfig(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError("");
    setSaved(false);
    try {
      const body: Record<string, unknown> = {
        alert_on_max_hours: alertMax,
        alert_on_missing_break: alertBreak,
      };
      if (maxHours) body.max_work_minutes_per_day = parseInt(maxHours) * 60;
      if (maxStart) {
        const [h, m] = maxStart.split(":").map(Number);
        body.max_start_time_minutes = h * 60 + (m ?? 0);
      }
      if (minBreak) body.min_break_minutes = parseInt(minBreak) * 60;

      const res = await fetch("/api/compliance/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Error al guardar");
      }
      setSaved(true);
      router.refresh();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function acknowledge(id: string) {
    setAckId(id);
    try {
      await fetch(`/api/compliance/violations/${id}/acknowledge`, { method: "POST" });
      router.refresh();
    } finally {
      setAckId(null);
    }
  }

  const card: React.CSSProperties = {
    background: T.surface,
    border: `1px solid ${T.line}`,
    borderRadius: "16px",
    padding: "24px",
    marginBottom: "20px",
  };

  const input: React.CSSProperties = {
    width: "100%",
    fontFamily: "inherit",
    fontSize: "14px",
    padding: "10px 12px",
    border: `1.5px solid ${T.line}`,
    borderRadius: "10px",
    background: T.bg,
    color: T.ink,
    outline: "none",
  };

  const toggle = (checked: boolean, onChange: (v: boolean) => void) => (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        width: "44px", height: "24px", borderRadius: "12px",
        background: checked ? T.brand : "#D1C9BC",
        border: "none", cursor: "pointer", position: "relative",
        transition: "background .2s",
      }}
    >
      <span style={{
        position: "absolute", top: "3px",
        left: checked ? "23px" : "3px",
        width: "18px", height: "18px",
        background: "#fff", borderRadius: "50%",
        boxShadow: "0 1px 3px rgba(0,0,0,.3)",
        transition: "left .2s",
      }} />
    </button>
  );

  return (
    <div>
      {/* Config section */}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${T.line}` }}>
            <Settings size={18} color={T.soft} />
          </div>
          <div>
            <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: "17px" }}>Configuración</div>
            <div style={{ fontSize: "12.5px", color: T.soft }}>Reglas aplicadas al registro de horas</div>
          </div>
        </div>

        <form onSubmit={saveConfig}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "20px" }}>
            <div>
              <label style={fieldLabel}>Máx. horas/día</label>
              <input
                type="number" min={1} max={24}
                placeholder="9"
                value={maxHours}
                onChange={(e) => setMaxHours(e.target.value)}
                style={input}
                onFocus={(e) => { e.currentTarget.style.borderColor = T.brand; e.currentTarget.style.boxShadow = "0 0 0 3px #DCEFE4"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = T.line; e.currentTarget.style.boxShadow = "none"; }}
              />
              <div style={{ fontSize: "11px", color: T.soft, marginTop: "4px" }}>horas</div>
            </div>
            <div>
              <label style={fieldLabel}>Hora límite fichaje</label>
              <TimeField
                value={maxStart}
                onChange={setMaxStart}
              />
              <div style={{ fontSize: "11px", color: T.soft, marginTop: "4px" }}>HH:MM</div>
            </div>
            <div>
              <label style={fieldLabel}>Descanso mínimo (h)</label>
              <input
                type="number" min={0} max={4}
                placeholder="0.5"
                value={minBreak}
                onChange={(e) => setMinBreak(e.target.value)}
                style={input}
                onFocus={(e) => { e.currentTarget.style.borderColor = T.brand; e.currentTarget.style.boxShadow = "0 0 0 3px #DCEFE4"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = T.line; e.currentTarget.style.boxShadow = "none"; }}
              />
              <div style={{ fontSize: "11px", color: T.soft, marginTop: "4px" }}>horas</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "24px", marginBottom: "24px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
              {toggle(alertMax, setAlertMax)}
              <span style={{ fontSize: "14px" }}>Alerta por exceso de horas</span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
              {toggle(alertBreak, setAlertBreak)}
              <span style={{ fontSize: "14px" }}>Alerta por descanso faltante</span>
            </label>
          </div>

          {saveError && <p style={{ fontSize: "13px", color: T.danger, marginBottom: "12px" }}>{saveError}</p>}
          {saved && <p style={{ fontSize: "13px", color: T.success, marginBottom: "12px" }}>✓ Configuración guardada</p>}

          <button
            type="submit"
            disabled={saving}
            style={{
              fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "14px",
              color: "#fff", background: T.brand, border: "2px solid #1A1A17",
              borderRadius: "11px", padding: "10px 22px", boxShadow: "3px 3px 0 #1A1A17",
              cursor: saving ? "not-allowed" : "pointer",
              display: "inline-flex", alignItems: "center", gap: "7px",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            Guardar configuración
          </button>
        </form>
      </div>

      {/* Violations section */}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: T.dangerBg, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${T.danger}` }}>
            <AlertTriangle size={18} color={T.danger} />
          </div>
          <div>
            <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: "17px" }}>
              Infracciones pendientes
              {violations.length > 0 && (
                <span style={{ marginLeft: "8px", background: T.dangerBg, color: T.danger, fontSize: "11px", fontFamily: "'Space Mono',monospace", padding: "2px 7px", borderRadius: "999px" }}>
                  {violations.length}
                </span>
              )}
            </div>
            <div style={{ fontSize: "12.5px", color: T.soft }}>Incumplimientos sin reconocer</div>
          </div>
        </div>

        {violations.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 0", color: T.soft }}>
            <CheckCircle size={36} style={{ margin: "0 auto 10px", color: T.success }} />
            <div style={{ fontWeight: 600, marginBottom: "4px" }}>Sin infracciones pendientes</div>
            <div style={{ fontSize: "13px" }}>Todos los registros están dentro de las reglas configuradas</div>
          </div>
        ) : (
          <HairlineTable
            cols="1.5fr 0.8fr 1.2fr 2.5fr 1fr"
            headers={["Empleado", "Fecha", "Tipo", "Descripción", ""]}
            align={["left", "left", "left", "left", "right"]}
          >
            {violations.map((v) => (
              <HairlineRow key={v.id} align={["left", "left", "left", "left", "right"]}>
                <span style={{ fontWeight: 600 }}>{(v.employees as unknown as { name: string })?.name ?? "—"}</span>
                <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "12px", color: T.soft }}>
                  {new Date(v.date).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}
                </span>
                <span style={{ background: T.dangerBg, color: T.danger, fontSize: "11px", padding: "3px 8px", borderRadius: "999px", fontWeight: 600 }}>
                  {VIOLATION_LABELS[v.violation_type] ?? v.violation_type}
                </span>
                <span style={{ color: T.soft }}>{v.description}</span>
                <button
                  onClick={() => acknowledge(v.id)}
                  disabled={ackId === v.id}
                  style={{
                    fontFamily: "'Archivo',sans-serif", fontWeight: 700, fontSize: "12px",
                    background: T.successBg, color: T.success, border: `1px solid ${T.success}`,
                    borderRadius: "8px", padding: "6px 12px", cursor: "pointer",
                    display: "inline-flex", alignItems: "center", gap: "5px",
                  }}
                >
                  {ackId === v.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                  Reconocer
                </button>
              </HairlineRow>
            ))}
          </HairlineTable>
        )}
      </div>
    </div>
  );
}
