import { PageHeader } from "@/components/page-header";
import { requireRole } from "@/lib/auth-guard";
import { HairlineTable, HairlineRow } from "@/components/hairline-table";

export const dynamic = "force-dynamic";

const USAGE = [
  { label: "Empleados activos", text: "7 / 50",  pct: "14%", color: "#0E5C4A" },
  { label: "Miembros (seats)",  text: "4 / 10",  pct: "40%", color: "#0E5C4A" },
  { label: "Ofertas activas",   text: "3 / ∞",   pct: "20%", color: "#946312" },
];

const INVOICES = [
  { date: "01 jun 2025", concept: "TalentOS Pro — junio", amount: "€149,00", status: "Pagada" },
  { date: "01 may 2025", concept: "TalentOS Pro — mayo",  amount: "€149,00", status: "Pagada" },
  { date: "01 abr 2025", concept: "TalentOS Pro — abril", amount: "€149,00", status: "Pagada" },
];

const S = {
  surface: "#FCFAF6",
  bg:      "#F4F0E8",
  line:    "#E7E1D4",
  ink:     "#1A1A17",
  soft:    "#79746B",
  brand:   "#0E5C4A",
};
const mono = { fontFamily: "'Space Mono', monospace" as const };

export default async function BillingPage() {
  await requireRole(["owner"]);

  return (
    <div>
      <PageHeader title="Billing" eyebrow="Ajustes" />
      <p style={{ fontSize: "13.5px", color: S.soft, margin: "0 0 22px" }}>
        Plan, consumo y facturación de tu cuenta.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>

        {/* ── A: Plan + Método de pago ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "16px" }}>

          {/* Plan card (dark) */}
          <div style={{ background: S.ink, borderRadius: "16px", padding: "22px 24px", color: "#F4F0E8", position: "relative", overflow: "hidden" }}>
            <div style={{ ...mono, fontSize: "10px", textTransform: "uppercase", letterSpacing: "1.5px", color: "#C6F24E", marginBottom: "12px" }}>Plan actual</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "12px", flexWrap: "wrap" }}>
              <span style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 900, fontSize: "28px", letterSpacing: "-.5px" }}>TalentOS Pro</span>
              <span style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: "18px", color: "#C6F24E" }}>
                €149<span style={{ fontSize: "12px", color: "#B7B2A8" }}> / mes</span>
              </span>
            </div>
            <div style={{ ...mono, fontSize: "11px", color: "#B7B2A8", marginTop: "8px" }}>
              Facturación anual · próxima factura 1 ago 2025
            </div>
            <button
              disabled
              title="La facturación estará disponible próximamente"
              style={{ marginTop: "18px", fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: "12.5px", color: S.soft, background: "#EFEBE1", border: "none", borderRadius: "9px", padding: "9px 15px", cursor: "not-allowed" }}
            >
              Cambiar plan · Próximamente
            </button>
          </div>

          {/* Payment method */}
          <div style={{ background: S.surface, border: "1px solid " + S.line, borderRadius: "16px", padding: "20px 22px", display: "flex", flexDirection: "column" }}>
            <div style={{ ...mono, fontSize: "10px", textTransform: "uppercase", letterSpacing: "1px", color: S.soft, marginBottom: "14px" }}>Método de pago</div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "44px", height: "30px", borderRadius: "6px", background: "linear-gradient(135deg,#1A1F71,#2B3A9E)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Archivo', sans-serif", fontWeight: 900, fontSize: "11px", fontStyle: "italic", color: "#fff" }}>
                VISA
              </div>
              <div>
                <div style={{ ...mono, fontSize: "13px", fontWeight: 700, letterSpacing: ".5px" }}>···· 4242</div>
                <div style={{ ...mono, fontSize: "10.5px", color: S.soft }}>Caduca 09/2026</div>
              </div>
            </div>
            <button
              disabled
              title="La facturación estará disponible próximamente"
              style={{ marginTop: "auto", alignSelf: "flex-start", fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: "12px", color: S.soft, background: S.surface, border: "1.5px dashed " + S.line, borderRadius: "9px", padding: "8px 13px", cursor: "not-allowed", opacity: 0.8 }}
            >
              Actualizar pago · Próximamente
            </button>
          </div>
        </div>

        {/* ── B: Uso del plan ── */}
        <div style={{ background: S.surface, border: "1px solid " + S.line, borderRadius: "16px", padding: "20px 24px" }}>
          <div style={{ ...mono, fontSize: "10px", textTransform: "uppercase", letterSpacing: "1px", color: S.soft, marginBottom: "16px" }}>Uso del plan</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "26px" }}>
            {USAGE.map((u) => (
              <div key={u.label}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ fontSize: "12.5px", fontWeight: 600, color: S.ink }}>{u.label}</span>
                  <span style={{ ...mono, fontSize: "12px", fontWeight: 700, color: u.color }}>{u.text}</span>
                </div>
                <div style={{ height: "7px", background: S.bg, borderRadius: "999px", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: u.pct, background: u.color, borderRadius: "999px" }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── D: Historial de facturas ── */}
        <div>
          <div style={{ ...mono, fontSize: "10px", textTransform: "uppercase", letterSpacing: "1px", color: S.soft, marginBottom: "12px" }}>Historial de facturas</div>
          <HairlineTable
            cols="1fr 2fr 1fr 1fr 1.1fr"
            headers={["Fecha", "Concepto", <span style={{ textAlign: "right" }}>Importe</span>, "Estado", ""]}
          >
            {INVOICES.map((inv) => (
              <HairlineRow key={inv.date}>
                <span style={{ ...mono, fontSize: "12px", color: S.ink }}>{inv.date}</span>
                <span style={{ fontSize: "13px", color: S.ink }}>{inv.concept}</span>
                <span style={{ ...mono, fontSize: "12.5px", fontWeight: 700, textAlign: "right" }}>{inv.amount}</span>
                <span>
                  <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#1B6B4F", background: "#DCEFE3", borderRadius: "999px", padding: "2px 9px" }}>
                    {inv.status}
                  </span>
                </span>
                <span style={{ textAlign: "right" }}>
                  <button disabled title="La descarga de facturas estará disponible próximamente" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 600, fontSize: "12px", color: S.soft, background: "none", border: "none", cursor: "not-allowed", display: "inline-flex", alignItems: "center", gap: "5px", opacity: 0.7 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                      <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    PDF
                  </button>
                </span>
              </HairlineRow>
            ))}
          </HairlineTable>
        </div>

      </div>
    </div>
  );
}
