"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { formatMoney } from "@/lib/format";
import type { Employee, PayProfile, PayComponent } from "@/lib/types";

const T = {
  surface: "#FCFAF6", bg: "#F4F0E8", surface2: "#F8F4EB",
  ink: "#1A1A17", soft: "#79746B", line: "#E7E1D4",
  brand: "#0E5C4A", brandSoft: "#DCEFE4",
  accent: "#F1543F", amber: "#946312", amberSoft: "#F8E7C4",
};

const COMP_TYPE: Record<string, string> = { fixed: "Fijo", variable: "Variable", conditional: "Condicional" };
const FREQ_LABEL: Record<string, string> = { monthly: "Mensual", biweekly: "Quincenal", weekly: "Semanal" };
const PAYMENT_METHOD: Record<string, string> = { transfer: "Transferencia", cash: "Efectivo", check: "Cheque" };
const VE_PACK_CHIPS = ["Salario base", "Bono alimentación", "Utilidades", "Vacaciones + bono", "Prestaciones sociales", "Anticipos", "ISLR", "SSO / RPE / FAOV"];

const COUNTRY_CURRENCY: Record<string, string> = {
  ES: "EUR", VE: "USD", BR: "BRL", CO: "COP", MX: "MXN",
};

const PACK_INFO: Record<string, { label: string; status: "active" | "preview" | "coming_soon" }> = {
  generic: { label: "Genérico · activo", status: "active" },
  ve: { label: "Venezuela · vista previa", status: "preview" },
  br: { label: "Brasil · próximamente", status: "coming_soon" },
  es: { label: "España · próximamente", status: "coming_soon" },
  co: { label: "Colombia · próximamente", status: "coming_soon" },
  mx: { label: "México · próximamente", status: "coming_soon" },
};

function Toggle({ active }: { active: boolean }) {
  return (
    <span style={{ display: "inline-flex", width: "34px", height: "20px", borderRadius: "999px", background: active ? T.brand : "#D8D2C4", position: "relative", verticalAlign: "middle" }}>
      <span style={{ position: "absolute", top: "2px", left: active ? "16px" : "2px", width: "16px", height: "16px", borderRadius: "50%", background: "#fff", transition: "left .15s" }}/>
    </span>
  );
}

function PackBadge({ pack }: { pack: string }) {
  const info = PACK_INFO[pack] ?? { label: pack, status: "coming_soon" as const };
  const active = info.status === "active";
  const preview = info.status === "preview";
  const bg = active ? T.brandSoft : preview ? T.amberSoft : T.surface2;
  const color = active ? T.brand : preview ? T.amber : T.soft;
  return (
    <span style={{ fontSize: "11.5px", fontWeight: 700, borderRadius: "999px", padding: "4px 11px", background: bg, color }}>
      {info.label}
    </span>
  );
}

type CompanyData = { id: string; country: string | null } | null;

type ProfileData = {
  employee: Employee;
  profile: PayProfile | null;
  profiles: PayProfile[];
  components: PayComponent[];
  currentPayslip: null;
  company: CompanyData;
};

// ── Compensation dialog ───────────────────────────────────────────────────────

type CompDialogProps = {
  employeeId: string;
  profile: PayProfile | null;
  company: CompanyData;
  onSaved: () => void;
  onClose: () => void;
};

function CompensationDialog({ employeeId, profile, company, onSaved, onClose }: CompDialogProps) {
  const defaultCurrency = company?.country ? (COUNTRY_CURRENCY[company.country] ?? "USD") : (profile?.currency ?? "USD");
  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    base_salary: profile?.base_salary?.toString() ?? "",
    currency: profile?.currency ?? defaultCurrency,
    frequency: profile?.frequency ?? "monthly",
    effective_from: profile ? profile.effective_from : today,
    payment_method: profile?.payment_method ?? "transfer",
    bank_name: profile?.bank_name ?? "",
    bank_account_last4: profile?.bank_account_last4 ?? "",
    country_pack: profile?.country_pack ?? "generic",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit() {
    const salary = parseFloat(form.base_salary);
    if (!salary || salary <= 0) { setError("Ingresa un salario válido"); return; }
    setSaving(true);
    setError("");
    try {
      await apiFetch(`/api/payroll/profiles/${employeeId}`, {
        method: "PUT",
        json: {
          ...form,
          base_salary: salary,
          bank_name: form.bank_name || null,
          bank_account_last4: form.bank_account_last4 || null,
        },
      });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(26,26,23,.45)" }} onClick={onClose}/>
      <div style={{ position: "relative", background: T.surface, border: `1.5px solid ${T.line}`, borderRadius: "18px", padding: "24px", width: "100%", maxWidth: "480px", boxShadow: "0 24px 60px -20px rgba(26,26,23,.4)", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <h3 style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: "18px", margin: 0 }}>
            {profile ? "Editar compensación" : "Configurar compensación"}
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: T.soft, padding: "4px" }}><X size={18}/></button>
        </div>

        {profile && (
          <div style={{ background: T.amberSoft, border: `1px solid #E5C97A`, borderRadius: "10px", padding: "10px 14px", marginBottom: "18px", fontSize: "12.5px", color: "#5A3A00" }}>
            Si cambias la vigencia a una fecha futura, el salario actual queda en el historial y el nuevo entra en vigor en esa fecha.
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: ".5px", color: T.soft, display: "block", marginBottom: "6px" }}>Salario base *</label>
              <input
                type="number" min="0" step="0.01"
                value={form.base_salary}
                onChange={(e) => set("base_salary", e.target.value)}
                style={{ width: "100%", height: "38px", borderRadius: "10px", border: `1px solid ${T.line}`, background: T.bg, padding: "0 12px", fontFamily: "'Space Mono',monospace", fontSize: "14px", fontWeight: 700, color: T.ink, outline: "none", boxSizing: "border-box" }}
                placeholder="0"
              />
            </div>
            <div>
              <label style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: ".5px", color: T.soft, display: "block", marginBottom: "6px" }}>Moneda</label>
              <select value={form.currency} onChange={(e) => set("currency", e.target.value)}
                style={{ width: "100%", height: "38px", borderRadius: "10px", border: `1px solid ${T.line}`, background: T.bg, padding: "0 10px", fontSize: "13px", color: T.ink, outline: "none" }}>
                {["USD","EUR","BRL","COP","MXN","VES"].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: ".5px", color: T.soft, display: "block", marginBottom: "6px" }}>Frecuencia</label>
              <select value={form.frequency} onChange={(e) => set("frequency", e.target.value)}
                style={{ width: "100%", height: "38px", borderRadius: "10px", border: `1px solid ${T.line}`, background: T.bg, padding: "0 10px", fontSize: "13px", color: T.ink, outline: "none" }}>
                <option value="monthly">Mensual</option>
                <option value="biweekly" disabled>Quincenal (próx.)</option>
                <option value="weekly" disabled>Semanal (próx.)</option>
              </select>
            </div>
            <div>
              <label style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: ".5px", color: T.soft, display: "block", marginBottom: "6px" }}>Vigente desde</label>
              <input type="date" value={form.effective_from} onChange={(e) => set("effective_from", e.target.value)}
                style={{ width: "100%", height: "38px", borderRadius: "10px", border: `1px solid ${T.line}`, background: T.bg, padding: "0 10px", fontSize: "13px", color: T.ink, outline: "none", boxSizing: "border-box" }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: ".5px", color: T.soft, display: "block", marginBottom: "6px" }}>Método de pago</label>
            <select value={form.payment_method} onChange={(e) => set("payment_method", e.target.value)}
              style={{ width: "100%", height: "38px", borderRadius: "10px", border: `1px solid ${T.line}`, background: T.bg, padding: "0 10px", fontSize: "13px", color: T.ink, outline: "none" }}>
              <option value="transfer">Transferencia</option>
              <option value="cash">Efectivo</option>
              <option value="check">Cheque</option>
            </select>
          </div>

          {form.payment_method === "transfer" && (
            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: ".5px", color: T.soft, display: "block", marginBottom: "6px" }}>Banco</label>
                <input value={form.bank_name} onChange={(e) => set("bank_name", e.target.value)}
                  style={{ width: "100%", height: "38px", borderRadius: "10px", border: `1px solid ${T.line}`, background: T.bg, padding: "0 12px", fontSize: "13px", color: T.ink, outline: "none", boxSizing: "border-box" }}
                  placeholder="Nombre del banco"
                />
              </div>
              <div>
                <label style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: ".5px", color: T.soft, display: "block", marginBottom: "6px" }}>Últimos 4 dígitos</label>
                <input value={form.bank_account_last4} onChange={(e) => set("bank_account_last4", e.target.value)}
                  maxLength={4}
                  style={{ width: "100%", height: "38px", borderRadius: "10px", border: `1px solid ${T.line}`, background: T.bg, padding: "0 12px", fontFamily: "'Space Mono',monospace", fontSize: "13px", color: T.ink, outline: "none", boxSizing: "border-box" }}
                  placeholder="0000"
                />
              </div>
            </div>
          )}
        </div>

        {error && <p style={{ color: T.accent, fontSize: "12.5px", marginTop: "12px" }}>{error}</p>}

        <div style={{ display: "flex", gap: "10px", marginTop: "22px", justifyContent: "flex-end" }}>
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button variant="brand" size="sm" onClick={submit} disabled={saving}>
            {saving && <Loader2 size={14} className="animate-spin"/>}
            Guardar
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function PayProfileView({ employeeId }: { employeeId: string }) {
  const router = useRouter();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadData = useCallback(() => {
    setLoading(true);
    fetch(`/api/payroll/profiles/${employeeId}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [employeeId]);

  useEffect(() => { loadData(); }, [loadData]);

  function onSaved() {
    setDialogOpen(false);
    loadData();
  }

  if (loading) {
    return <div style={{ padding: "40px", textAlign: "center", color: T.soft, fontFamily: "'Space Mono',monospace", fontSize: "11px" }}>Cargando perfil…</div>;
  }
  if (!data?.employee) {
    return <div style={{ padding: "40px", textAlign: "center", color: T.soft }}>Empleado no encontrado</div>;
  }

  const { employee, profile, profiles, components, company } = data;
  const empInitials = employee.name.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();
  const employerCost = profile?.employer_cost ?? (profile ? profile.base_salary * 1.2375 : 0);

  // History = closed profiles sorted newest first
  const history = profiles.filter((p) => p.effective_to !== null);
  const historyWithPrev = history.map((p, i) => ({
    ...p,
    prevSalary: profiles[i + 1]?.base_salary ?? null,
  }));

  return (
    <>
      {dialogOpen && (
        <CompensationDialog
          employeeId={employeeId}
          profile={profile}
          company={company}
          onSaved={onSaved}
          onClose={() => setDialogOpen(false)}
        />
      )}

      <div>
        {/* Back */}
        <button
          onClick={() => router.push("/payroll/profiles")}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontFamily: "'Space Mono',monospace", fontSize: "11px", color: T.soft, background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: "12px" }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Empleados
        </button>

        {/* Employee header */}
        <div style={{ display: "flex", alignItems: "center", gap: "15px", flexWrap: "wrap", marginBottom: "22px" }}>
          <span style={{ width: "52px", height: "52px", borderRadius: "50%", background: T.brandSoft, color: T.brand, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "17px" }}>
            {empInitials}
          </span>
          <div style={{ flex: 1, minWidth: "180px" }}>
            <h2 style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: "24px", letterSpacing: "-.8px", margin: 0 }}>{employee.name}</h2>
            <div style={{ fontSize: "13px", color: T.soft, marginTop: "3px" }}>
              {employee.role_title}{employee.department ? ` · ${employee.department}` : ""}
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            {profile ? (
              <>
                <Button variant="outline" size="sm" disabled={!data.currentPayslip}>
                  Ver recibo
                </Button>
                <Button variant="brand" size="sm" onClick={() => setDialogOpen(true)}>
                  Editar compensación
                </Button>
              </>
            ) : null}
          </div>
        </div>

        {!profile ? (
          /* Empty state */
          <div style={{ background: T.surface, border: `2px dashed ${T.line}`, borderRadius: "16px", padding: "48px", textAlign: "center" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: T.brandSoft, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke={T.brand} strokeWidth="2" strokeLinecap="round"/></svg>
            </div>
            <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "16px", marginBottom: "8px" }}>Sin perfil salarial</div>
            <div style={{ fontSize: "13.5px", color: T.soft, marginBottom: "20px" }}>
              Este empleado no tiene un perfil de compensación configurado todavía.
            </div>
            <Button variant="brand" onClick={() => setDialogOpen(true)}>
              Configurar compensación
            </Button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1.55fr 1fr", gap: "16px", alignItems: "start" }}>
            {/* Main column */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

              {/* Salario base */}
              <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: "16px", padding: "20px" }}>
                <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "15px", marginBottom: "16px" }}>Salario base</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 24px" }}>
                  <div>
                    <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: ".5px", color: T.soft }}>Salario</div>
                    <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: "22px", marginTop: "5px", fontVariantNumeric: "tabular-nums" }}>
                      {formatMoney(profile.base_salary, profile.currency)}
                      <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "12px", fontWeight: 400, color: T.soft }}> / {FREQ_LABEL[profile.frequency] ?? "mes"}</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: ".5px", color: T.soft }}>Frecuencia</div>
                    <div style={{ fontSize: "14px", fontWeight: 600, marginTop: "8px" }}>{FREQ_LABEL[profile.frequency] ?? profile.frequency}</div>
                  </div>
                  <div>
                    <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: ".5px", color: T.soft }}>Vigente desde</div>
                    <div style={{ fontSize: "14px", fontWeight: 600, marginTop: "8px" }}>
                      {new Date(profile.effective_from + "T12:00:00Z").toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: ".5px", color: T.soft }}>Método de pago</div>
                    <div style={{ fontSize: "14px", fontWeight: 600, marginTop: "8px" }}>{PAYMENT_METHOD[profile.payment_method] ?? profile.payment_method}</div>
                  </div>
                  {(profile.bank_name || profile.bank_account_last4) && (
                    <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: "10px", borderTop: `1px solid ${T.line}`, paddingTop: "14px" }}>
                      <div>
                        <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: ".5px", color: T.soft }}>Cuenta bancaria</div>
                        <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "14px", fontWeight: 600, marginTop: "6px" }}>
                          {profile.bank_name}{profile.bank_account_last4 ? ` · ****${profile.bank_account_last4}` : ""}
                        </div>
                      </div>
                      <Button variant="soft" size="sm" className="ml-auto" onClick={() => setDialogOpen(true)}>Editar</Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Componentes variables */}
              <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: "16px", overflow: "hidden" }}>
                <div style={{ padding: "16px 20px 13px", fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "15px" }}>Componentes variables</div>
                <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 0.8fr", padding: "10px 20px", borderTop: `1px solid ${T.line}`, borderBottom: `1px solid ${T.line}`, fontFamily: "'Space Mono',monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: ".5px", color: T.soft }}>
                  <span>Concepto</span><span>Tipo</span><span style={{ textAlign: "right" }}>Monto</span><span style={{ textAlign: "right" }}>Activo</span>
                </div>
                {components.length === 0 ? (
                  <div style={{ padding: "16px 20px", fontSize: "13px", color: T.soft }}>Sin componentes variables</div>
                ) : (
                  components.map((c) => (
                    <div key={c.id} style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 0.8fr", alignItems: "center", padding: "13px 20px", borderBottom: `1px solid ${T.line}` }}>
                      <span style={{ fontSize: "13.5px", fontWeight: 600 }}>{c.name}</span>
                      <span style={{ fontSize: "12px", color: T.soft }}>{COMP_TYPE[c.component_type] ?? c.component_type}</span>
                      <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "13px", fontWeight: 700, textAlign: "right" }}>
                        {c.amount !== null ? formatMoney(c.amount, profile.currency) : c.formula ?? "—"}
                      </span>
                      <span style={{ textAlign: "right" }}><Toggle active={c.active}/></span>
                    </div>
                  ))
                )}
              </div>

              {/* Configuración local */}
              <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: "16px", padding: "20px" }}>
                <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "15px", marginBottom: "16px" }}>Configuración local</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 24px" }}>
                  <div>
                    <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: ".5px", color: T.soft }}>Country pack</div>
                    <div style={{ marginTop: "7px" }}>
                      <PackBadge pack={profile.country_pack}/>
                      {profile.country_pack !== "generic" && (
                        <p style={{ fontSize: "11px", color: T.soft, marginTop: "6px", lineHeight: 1.4 }}>
                          Vista previa — cálculos no operativos. Solo el pack genérico está activo.
                        </p>
                      )}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: ".5px", color: T.soft }}>Entidad empleadora</div>
                    <div style={{ fontSize: "14px", fontWeight: 600, marginTop: "8px" }}>{profile.legal_entity ?? "—"}</div>
                  </div>
                  <div>
                    <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: ".5px", color: T.soft }}>Perfil fiscal</div>
                    <div style={{ fontSize: "14px", fontWeight: 600, marginTop: "8px" }}>{profile.tax_profile ?? "—"}</div>
                  </div>
                </div>
              </div>

              {/* Historial de compensación */}
              {historyWithPrev.length > 0 && (
                <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: "16px", overflow: "hidden" }}>
                  <div style={{ padding: "16px 20px 13px", fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "15px" }}>Historial de compensación</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", padding: "10px 20px", borderTop: `1px solid ${T.line}`, borderBottom: `1px solid ${T.line}`, fontFamily: "'Space Mono',monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: ".5px", color: T.soft }}>
                    <span>Vigente desde</span><span style={{ textAlign: "right" }}>Anterior</span><span style={{ textAlign: "right" }}>Nuevo</span>
                  </div>
                  {historyWithPrev.map((h) => (
                    <div key={h.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", alignItems: "center", padding: "12px 20px", borderBottom: `1px solid ${T.line}` }}>
                      <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "12px", color: "#54504A" }}>
                        {new Date(h.effective_from + "T12:00:00Z").toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                      <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "12.5px", textAlign: "right", color: T.soft }}>
                        {h.prevSalary !== null ? formatMoney(h.prevSalary, h.currency) : "—"}
                      </span>
                      <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "12.5px", fontWeight: 700, textAlign: "right" }}>
                        {formatMoney(h.base_salary, h.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Employer cost */}
              <div style={{ background: T.ink, color: "#F4F0E8", borderRadius: "16px", padding: "20px" }}>
                <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: ".5px", color: "#B9B4A9" }}>Coste mensual empresa</div>
                <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: "30px", letterSpacing: "-1px", marginTop: "8px", fontVariantNumeric: "tabular-nums" }}>
                  {formatMoney(employerCost, profile.currency)}
                </div>
                <div style={{ fontSize: "12px", color: "#B9B4A9", marginTop: "6px", lineHeight: 1.5 }}>
                  {profile.country_pack === "generic"
                    ? "Pack genérico: coste empresa = salario bruto (sin cargas patronales)."
                    : "Incluye salario, componentes y cargas patronales + provisión de prestaciones."}
                </div>
              </div>

              {/* Pack preview chips — VE only */}
              {profile.country_pack === "ve" && (
                <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: "16px", padding: "20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                    <span style={{ width: "20px", height: "14px", borderRadius: "2px", background: "linear-gradient(#FFCC00 33%,#003893 33% 66%,#CF142B 66%)" }}/>
                    <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: ".5px", color: T.soft }}>Pack Venezuela · vista previa</span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {VE_PACK_CHIPS.map((p) => (
                      <span key={p} style={{ fontSize: "11px", fontWeight: 600, borderRadius: "999px", padding: "4px 10px", background: T.surface2, border: `1px solid ${T.line}`, color: "#54504A" }}>
                        {p}
                      </span>
                    ))}
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", marginTop: "14px", paddingTop: "14px", borderTop: `1px solid ${T.line}` }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: "1px" }}>
                      <circle cx="12" cy="12" r="9" stroke={T.brand} strokeWidth="2"/>
                      <path d="M12 8v5M12 16h.01" stroke={T.brand} strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    <span style={{ fontSize: "11.5px", lineHeight: 1.45, color: "#54504A" }}>
                      <b>Vista previa — cálculos no operativos.</b> El pack VE aplicará SSO/RPE/FAOV/INCES y doble moneda (VES/USD) cuando esté activo.
                    </span>
                  </div>
                </div>
              )}

              {/* Other packs */}
              <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: "16px", padding: "20px" }}>
                <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: ".5px", color: T.soft, marginBottom: "12px" }}>Country packs disponibles</div>
                {[
                  { code: "ve", label: "Venezuela", flag: "🇻🇪", status: "preview" },
                  { code: "es", label: "España", flag: "🇪🇸", status: "preview" },
                  { code: "br", label: "Brasil", flag: "🇧🇷", status: "preview" },
                  { code: "co", label: "Colombia", flag: "🇨🇴", status: "coming_soon" },
                  { code: "mx", label: "México", flag: "🇲🇽", status: "coming_soon" },
                ].map((c) => (
                  <div key={c.code} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 0", borderBottom: `1px solid ${T.line}` }}>
                    <span style={{ fontSize: "16px" }}>{c.flag}</span>
                    <span style={{ fontSize: "13px", fontWeight: 600, flex: 1 }}>{c.label}</span>
                    <span style={{ fontSize: "10px", fontWeight: 700, borderRadius: "999px", padding: "3px 9px", background: c.status === "preview" ? T.amberSoft : T.surface2, color: c.status === "preview" ? T.amber : T.soft, border: c.status === "coming_soon" ? `1px dashed #CFC7B5` : "none" }}>
                      {c.status === "preview" ? "Vista previa" : "Próximamente"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
