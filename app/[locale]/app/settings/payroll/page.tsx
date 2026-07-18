import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PackIcon } from "@/components/ui/pack-icons";
import { getCompany } from "@/lib/workspace";
import { setRequestLocale, getTranslations } from "next-intl/server";

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

function StatusBadge({ status, t }: { status: PackDef["status"]; t: any }) {
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
      {preview ? t("payroll.status.preview") : t("payroll.status.coming")}
    </span>
  );
}

export default async function PayrollSettingsPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const company = await getCompany();
  const activePackCode = company?.country_pack ?? "generic";
  const t = await getTranslations({ locale: params.locale, namespace: "Settings" });

  const PACKS: PackDef[] = [
    {
      code: "generic",
      label: t("payroll.packs.generic.label"),
      status: "active",
      chips: [
        t("payroll.packs.generic.chips.0"),
        t("payroll.packs.generic.chips.1"),
        t("payroll.packs.generic.chips.2"),
        t("payroll.packs.generic.chips.3")
      ],
      note: t("payroll.packs.generic.note"),
    },
    {
      code: "ve",
      label: t("payroll.packs.ve.label"),
      status: "preview",
      chips: [
        t("payroll.packs.ve.chips.0"),
        t("payroll.packs.ve.chips.1"),
        t("payroll.packs.ve.chips.2"),
        t("payroll.packs.ve.chips.3"),
        t("payroll.packs.ve.chips.4"),
        t("payroll.packs.ve.chips.5"),
        t("payroll.packs.ve.chips.6"),
        t("payroll.packs.ve.chips.7")
      ],
      note: t("payroll.packs.ve.note"),
    },
    {
      code: "br",
      label: t("payroll.packs.br.label"),
      status: "preview",
      chips: [
        t("payroll.packs.br.chips.0"),
        t("payroll.packs.br.chips.1"),
        t("payroll.packs.br.chips.2"),
        t("payroll.packs.br.chips.3"),
        t("payroll.packs.br.chips.4"),
        t("payroll.packs.br.chips.5")
      ],
      note: t("payroll.packs.br.note"),
    },
    {
      code: "es",
      label: t("payroll.packs.es.label"),
      status: "preview",
      chips: [
        t("payroll.packs.es.chips.0"),
        t("payroll.packs.es.chips.1"),
        t("payroll.packs.es.chips.2"),
        t("payroll.packs.es.chips.3"),
        t("payroll.packs.es.chips.4")
      ],
      note: t("payroll.packs.es.note"),
    },
    {
      code: "co",
      label: t("payroll.packs.co.label"),
      status: "coming_soon",
      chips: [],
      note: t("payroll.packs.co.note"),
    },
    {
      code: "mx",
      label: t("payroll.packs.mx.label"),
      status: "coming_soon",
      chips: [],
      note: t("payroll.packs.mx.note"),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("payroll.title")}
        description={t("payroll.description")}
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
                    {t("payroll.status.active")}
                  </span>
                )}
                <StatusBadge status={pack.status} t={t} />
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
                  {t("payroll.cta.coming")}
                </Button>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
