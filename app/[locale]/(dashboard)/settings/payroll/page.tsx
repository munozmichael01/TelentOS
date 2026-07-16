import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PackIcon } from "@/components/ui/pack-icons";
import { getCompany } from "@/lib/workspace";

const T = {
  soft: "#79746B", line: "#E7E1D4", bg: "#F4F0E8", surface2: "#F8F4EB",
  brand: "#0E5C4A", brandSoft: "#DCEFE4",
  amber: "#946312", amberSoft: "#F8E7C4",
};

type PackDef = {
  code: string;
  label: string;
  status: "active" | "preview" | "coming_soon";
  chips: string[];
  note: string;
};

const PACKS: PackDef[] = [
  {
    code: "generic",
    label: "Genérico",
    status: "active",
    chips: ["Salario base", "Bruto = Neto = Coste empresa", "Sin deducciones", "Sin cargas patronales"],
    note: "Cálculo directo: neto = bruto = coste empresa. Ideal para empresas que gestionan retenciones fuera de TalentOS.",
  },
  {
    code: "ve",
    label: "Venezuela",
    status: "preview",
    chips: ["Salario base", "Bono alimentación", "Utilidades", "Vacaciones + bono", "Prestaciones sociales", "Anticipos", "ISLR", "SSO / RPE / FAOV"],
    note: "Aplicará SSO/RPE/FAOV/INCES, utilidades, prestaciones sociales y doble moneda VES/USD con tasa del período.",
  },
  {
    code: "br",
    label: "Brasil",
    status: "preview",
    chips: ["INSS", "FGTS", "IRRF", "13º salário", "Férias + 1/3", "Vale-refeição/transporte"],
    note: "Aplicará INSS, FGTS, IRRF por tramos, 13º salario, vacaciones con +1/3 y beneficios (vale-refeição/transporte).",
  },
  {
    code: "es",
    label: "España",
    status: "preview",
    chips: ["IRPF con tramos", "Cotizaciones SS", "Pagas extra (12/14)", "SMI", "Finiquito"],
    note: "Aplicará IRPF por tramos, cotizaciones a la Seguridad Social (empresa/trabajador), pagas extraordinarias y cálculo de finiquito.",
  },
  {
    code: "co",
    label: "Colombia",
    status: "coming_soon",
    chips: [],
    note: "Próximamente: retenciones en la fuente, seguridad social, parafiscales y cesantías.",
  },
  {
    code: "mx",
    label: "México",
    status: "coming_soon",
    chips: [],
    note: "Próximamente: ISR, IMSS, INFONAVIT y prestaciones de ley.",
  },
];

function StatusBadge({ status }: { status: PackDef["status"] }) {
  if (status === "active") return null;
  const preview = status === "preview";
  return (
    <span style={{
      fontSize: "10.5px", fontWeight: 700, borderRadius: "999px", padding: "4px 11px",
      background: preview ? T.amberSoft : T.surface2,
      color: preview ? T.amber : T.soft,
      border: preview ? "none" : `1px dashed #CFC7B5`,
      flexShrink: 0,
    }}>
      {preview ? "Vista previa — cálculos no operativos" : "Próximamente"}
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

      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
        {PACKS.map((pack) => {
          const isActive = pack.code === activePackCode;
          const isComingSoon = pack.status === "coming_soon";

          return (
            <Card
              key={pack.code}
              panel
              className="flex flex-col gap-4 p-5"
              style={{
                borderColor: isActive ? T.brand : undefined,
                borderWidth: isActive ? "1.5px" : undefined,
                opacity: isComingSoon ? 0.7 : 1,
              }}
            >
              {/* Header */}
              <div className="flex items-center gap-3">
                <PackIcon code={pack.code} />
                <span className="font-display font-black text-[16px] flex-1">{pack.label}</span>
                {isActive && (
                  <span style={{ fontSize: "10.5px", fontWeight: 700, borderRadius: "999px", padding: "4px 11px", background: T.brandSoft, color: T.brand, flexShrink: 0 }}>
                    Aplicándose ahora
                  </span>
                )}
                <StatusBadge status={pack.status} />
              </div>

              {/* Chips */}
              {pack.chips.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {pack.chips.map((c) => (
                    <span key={c} style={{ fontSize: "11px", fontWeight: 600, borderRadius: "999px", padding: "3px 10px", background: T.bg, border: `1px solid ${T.line}`, color: "#54504A" }}>
                      {c}
                    </span>
                  ))}
                </div>
              )}

              {/* Note */}
              <p className="text-[12px] leading-relaxed text-muted-foreground m-0">{pack.note}</p>

              {/* CTA */}
              {!isActive && (
                <Button variant="outline" size="sm" disabled className="self-start">
                  Seleccionar pack — Próximamente
                </Button>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
