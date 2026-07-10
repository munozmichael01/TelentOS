"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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

function fmtUSD(n: number) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function Toggle({ active }: { active: boolean }) {
  return (
    <span style={{ display: "inline-flex", width: "34px", height: "20px", borderRadius: "999px", background: active ? T.brand : "#D8D2C4", position: "relative", verticalAlign: "middle" }}>
      <span style={{ position: "absolute", top: "2px", left: active ? "16px" : "2px", width: "16px", height: "16px", borderRadius: "50%", background: "#fff", transition: "left .15s" }}/>
    </span>
  );
}

type ProfileData = {
  employee: Employee;
  profile: PayProfile | null;
  components: PayComponent[];
  currentPayslip: null;
};

export function PayProfileView({ employeeId }: { employeeId: string }) {
  const router = useRouter();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => { return () => { mountedRef.current = false; }; }, []);

  useEffect(() => {
    fetch(`/api/payroll/profiles/${employeeId}`)
      .then((r) => r.json())
      .then((d) => { if (mountedRef.current) setData(d); })
      .finally(() => { if (mountedRef.current) setLoading(false); });
  }, [employeeId]);

  if (loading) {
    return <div style={{ padding: "40px", textAlign: "center", color: T.soft, fontFamily: "'Space Mono',monospace", fontSize: "11px" }}>Cargando perfil…</div>;
  }
  if (!data?.employee) {
    return <div style={{ padding: "40px", textAlign: "center", color: T.soft }}>Empleado no encontrado</div>;
  }

  const { employee, profile, components } = data;
  const emp_initials = employee.name.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();

  const employerCost = profile?.employer_cost ?? (profile ? profile.base_salary * 1.2375 : 0);

  return (
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
          {emp_initials}
        </span>
        <div style={{ flex: 1, minWidth: "180px" }}>
          <h2 style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: "24px", letterSpacing: "-.8px", margin: 0 }}>{employee.name}</h2>
          <div style={{ fontSize: "13px", color: T.soft, marginTop: "3px" }}>
            {employee.role_title} · {employee.department}
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 700, fontSize: "13px", color: T.ink, background: T.surface, border: `1.5px solid ${T.line}`, borderRadius: "11px", padding: "10px 15px", cursor: "pointer" }}
          >
            Ver recibo
          </button>
          <button
            style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "13px", color: "#fff", background: T.brand, border: `2px solid ${T.ink}`, borderRadius: "11px", padding: "10px 18px", boxShadow: `3px 3px 0 ${T.ink}`, cursor: "pointer" }}
          >
            Editar compensación
          </button>
        </div>
      </div>

      {!profile ? (
        /* Empty state for no profile yet */
        <div style={{ background: T.surface, border: `2px dashed ${T.line}`, borderRadius: "16px", padding: "48px", textAlign: "center" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: T.brandSoft, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke={T.brand} strokeWidth="2" strokeLinecap="round"/></svg>
          </div>
          <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "16px", marginBottom: "8px" }}>Sin perfil salarial</div>
          <div style={{ fontSize: "13.5px", color: T.soft, marginBottom: "20px" }}>
            Este empleado no tiene un perfil de compensación configurado todavía.
          </div>
          <button style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "13px", color: "#fff", background: T.brand, border: `2px solid ${T.ink}`, borderRadius: "11px", padding: "10px 20px", boxShadow: `3px 3px 0 ${T.ink}`, cursor: "pointer" }}>
            Configurar compensación
          </button>
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
                    {fmtUSD(profile.base_salary)}<span style={{ fontFamily: "'Space Mono',monospace", fontSize: "12px", fontWeight: 400, color: T.soft }}> / {FREQ_LABEL[profile.frequency] ?? "mes"}</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: ".5px", color: T.soft }}>Frecuencia</div>
                  <div style={{ fontSize: "14px", fontWeight: 600, marginTop: "8px" }}>{FREQ_LABEL[profile.frequency] ?? profile.frequency}</div>
                </div>
                <div>
                  <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: ".5px", color: T.soft }}>Vigente desde</div>
                  <div style={{ fontSize: "14px", fontWeight: 600, marginTop: "8px" }}>
                    {new Date(profile.effective_from).toLocaleDateString("es-VE", { day: "numeric", month: "short", year: "numeric" })}
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
                    <button style={{ marginLeft: "auto", fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 700, fontSize: "12px", color: T.brand, background: T.brandSoft, border: "none", borderRadius: "9px", padding: "7px 13px", cursor: "pointer" }}>Editar</button>
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
                      {c.amount !== null ? fmtUSD(c.amount) : c.formula ?? "—"}
                    </span>
                    <span style={{ textAlign: "right" }}><Toggle active={c.active}/></span>
                  </div>
                ))
              )}
            </div>

            {/* Config local */}
            <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: "16px", padding: "20px" }}>
              <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "15px", marginBottom: "16px" }}>Configuración local</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 24px" }}>
                <div>
                  <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: ".5px", color: T.soft }}>País legal</div>
                  <div style={{ fontSize: "14px", fontWeight: 600, marginTop: "8px", display: "flex", alignItems: "center", gap: "7px" }}>
                    {profile.country_pack === "ve" && <span style={{ width: "18px", height: "12px", borderRadius: "2px", background: "linear-gradient(#FFCC00 33%,#003893 33% 66%,#CF142B 66%)", flexShrink: 0 }}/>}
                    {profile.country_pack === "ve" ? "Venezuela" : profile.country_pack.toUpperCase()}
                  </div>
                </div>
                <div>
                  <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: ".5px", color: T.soft }}>Entidad empleadora</div>
                  <div style={{ fontSize: "14px", fontWeight: 600, marginTop: "8px" }}>{profile.legal_entity ?? "—"}</div>
                </div>
                <div>
                  <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: ".5px", color: T.soft }}>Country pack</div>
                  <div style={{ marginTop: "7px" }}>
                    <span style={{ fontSize: "11.5px", fontWeight: 700, borderRadius: "999px", padding: "4px 11px", background: T.brandSoft, color: T.brand }}>
                      {profile.country_pack === "ve" ? "Venezuela · activo" : profile.country_pack.toUpperCase() + " · próximamente"}
                    </span>
                  </div>
                </div>
                <div>
                  <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: ".5px", color: T.soft }}>Perfil fiscal</div>
                  <div style={{ fontSize: "14px", fontWeight: 600, marginTop: "8px" }}>{profile.tax_profile ?? "—"}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar column */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* Employer cost card */}
            <div style={{ background: T.ink, color: "#F4F0E8", borderRadius: "16px", padding: "20px" }}>
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: ".5px", color: "#B9B4A9" }}>Coste mensual empresa</div>
              <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: "30px", letterSpacing: "-1px", marginTop: "8px", fontVariantNumeric: "tabular-nums" }}>
                {fmtUSD(employerCost)}
              </div>
              <div style={{ fontSize: "12px", color: "#B9B4A9", marginTop: "6px", lineHeight: 1.5 }}>
                Incluye salario, componentes y cargas patronales (SSO, RPE, FAOV, INCES) + provisión de prestaciones.
              </div>
            </div>

            {/* Venezuela pack */}
            {profile.country_pack === "ve" && (
              <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: "16px", padding: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                  <span style={{ width: "20px", height: "14px", borderRadius: "2px", background: "linear-gradient(#FFCC00 33%,#003893 33% 66%,#CF142B 66%)" }}/>
                  <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: ".5px", color: T.soft }}>Pack Venezuela</span>
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
                    Soporta <b>doble moneda</b> (VES/USD) con tasa del periodo. El demo muestra USD por claridad.
                  </span>
                </div>
              </div>
            )}

            {/* Coming soon packs */}
            <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: "16px", padding: "20px" }}>
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: ".5px", color: T.soft, marginBottom: "12px" }}>Otros country packs</div>
              {[
                { code: "br", label: "Brasil", flag: "🇧🇷" },
                { code: "co", label: "Colombia", flag: "🇨🇴" },
                { code: "mx", label: "México", flag: "🇲🇽" },
                { code: "es", label: "España", flag: "🇪🇸" },
              ].map((c) => (
                <div key={c.code} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 0", borderBottom: `1px solid ${T.line}` }}>
                  <span style={{ fontSize: "16px" }}>{c.flag}</span>
                  <span style={{ fontSize: "13px", fontWeight: 600, flex: 1 }}>{c.label}</span>
                  <span style={{ fontSize: "10px", fontWeight: 700, borderRadius: "999px", padding: "3px 9px", background: T.surface2, color: T.soft, border: `1px dashed #CFC7B5` }}>
                    Próximamente
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
