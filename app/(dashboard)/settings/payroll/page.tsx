import { PageHeader } from "@/components/page-header";
import { getCompany } from "@/lib/workspace";

const T = {
  surface: "#FCFAF6", bg: "#F4F0E8", surface2: "#F8F4EB",
  ink: "#1A1A17", soft: "#79746B", line: "#E7E1D4",
  brand: "#0E5C4A", brandSoft: "#DCEFE4",
  amber: "#946312", amberSoft: "#F8E7C4",
};

type PackDef = {
  code: string;
  flag: string;
  label: string;
  status: "active" | "preview" | "coming_soon";
  chips: string[];
  note: string;
};

const PACKS: PackDef[] = [
  {
    code: "generic",
    flag: "🌐",
    label: "Genérico",
    status: "active",
    chips: ["Salario base", "Bruto = Neto = Coste empresa", "Sin deducciones", "Sin cargas patronales"],
    note: "Cálculo directo: neto = bruto = coste empresa. Ideal para empresas que gestionan retenciones fuera de TalentOS.",
  },
  {
    code: "ve",
    flag: "🇻🇪",
    label: "Venezuela",
    status: "preview",
    chips: ["Salario base", "Bono alimentación", "Utilidades", "Vacaciones + bono", "Prestaciones sociales", "Anticipos", "ISLR", "SSO / RPE / FAOV"],
    note: "Aplicará SSO/RPE/FAOV/INCES, utilidades, prestaciones sociales y doble moneda VES/USD con tasa del período.",
  },
  {
    code: "br",
    flag: "🇧🇷",
    label: "Brasil",
    status: "preview",
    chips: ["INSS", "FGTS", "IRRF", "13º salário", "Férias + 1/3", "Vale-refeição/transporte"],
    note: "Aplicará INSS, FGTS, IRRF por tramos, 13º salario, vacaciones con +1/3 y beneficios (vale-refeição/transporte).",
  },
  {
    code: "es",
    flag: "🇪🇸",
    label: "España",
    status: "preview",
    chips: ["IRPF con tramos", "Cotizaciones SS", "Pagas extra (12/14)", "SMI", "Finiquito"],
    note: "Aplicará IRPF por tramos, cotizaciones a la Seguridad Social (empresa/trabajador), pagas extraordinarias y cálculo de finiquito.",
  },
  {
    code: "co",
    flag: "🇨🇴",
    label: "Colombia",
    status: "coming_soon",
    chips: [],
    note: "Próximamente: retenciones en la fuente, seguridad social, parafiscales y cesantías.",
  },
  {
    code: "mx",
    flag: "🇲🇽",
    label: "México",
    status: "coming_soon",
    chips: [],
    note: "Próximamente: ISR, IMSS, INFONAVIT y prestaciones de ley.",
  },
];

function Chip({ label, muted }: { label: string; muted?: boolean }) {
  return (
    <span style={{
      fontSize: "11px", fontWeight: 600, borderRadius: "999px", padding: "3px 10px",
      background: muted ? T.surface2 : T.bg,
      border: `1px solid ${T.line}`,
      color: muted ? T.soft : "#54504A",
    }}>
      {label}
    </span>
  );
}

export default async function PayrollSettingsPage() {
  const company = await getCompany();
  const activePackCode = company?.country_pack ?? "generic";

  return (
    <div>
      <PageHeader
        eyebrow="Ajustes"
        title="Payroll"
        description="Selecciona el motor de cálculo que aplica a tu empresa. Solo el pack Genérico está activo; los demás son vista previa sin cálculos operativos."
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
        {PACKS.map((pack) => {
          const isActive = pack.code === activePackCode;
          const isPreview = pack.status === "preview";
          const isComingSoon = pack.status === "coming_soon";

          return (
            <div
              key={pack.code}
              style={{
                background: T.surface,
                border: `1.5px solid ${isActive ? T.brand : T.line}`,
                borderRadius: "16px",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                opacity: isComingSoon ? 0.7 : 1,
              }}
            >
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", gap: "11px" }}>
                <span style={{ fontSize: "22px" }}>{pack.flag}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: "16px" }}>{pack.label}</div>
                </div>
                {isActive && (
                  <span style={{ fontSize: "10.5px", fontWeight: 700, borderRadius: "999px", padding: "4px 11px", background: T.brandSoft, color: T.brand }}>
                    Aplicándose ahora
                  </span>
                )}
                {isPreview && (
                  <span style={{ fontSize: "10.5px", fontWeight: 700, borderRadius: "999px", padding: "4px 11px", background: T.amberSoft, color: T.amber }}>
                    Vista previa — cálculos no operativos
                  </span>
                )}
                {isComingSoon && (
                  <span style={{ fontSize: "10.5px", fontWeight: 700, borderRadius: "999px", padding: "4px 11px", background: T.surface2, color: T.soft, border: `1px dashed #CFC7B5` }}>
                    Próximamente
                  </span>
                )}
              </div>

              {/* Chips */}
              {pack.chips.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {pack.chips.map((c) => <Chip key={c} label={c} />)}
                </div>
              )}

              {/* Note */}
              <p style={{ fontSize: "12px", color: T.soft, lineHeight: 1.5, margin: 0 }}>{pack.note}</p>

              {/* CTA */}
              {!isActive && (
                <button
                  disabled
                  style={{
                    fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "12.5px",
                    color: T.soft, background: T.surface2,
                    border: "1.5px dashed #CFC7B5",
                    borderRadius: "10px", padding: "9px 15px",
                    cursor: "not-allowed", alignSelf: "flex-start",
                  }}
                >
                  Seleccionar pack — Próximamente
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
