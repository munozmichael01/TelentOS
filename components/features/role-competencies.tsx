import { getTranslations } from "next-intl/server";
import { SkillChips } from "@/components/ui/skill-chips";
import type { RoleCompetencies } from "@/lib/performance/competencies";

/**
 * Competencias evaluables del puesto de una persona (bloque 1 de Desempeño).
 * Salen de la taxonomía (job_title_skills) vía el cargo canónico de la ficha, nunca de un
 * catálogo propio. Si la ficha no tiene cargo vinculado se dice explícitamente y se invita a
 * resolverlo en la ficha: no se inventan competencias.
 */
export async function RoleCompetencies({
  data,
  locale,
  roleTitle,
}: {
  data: RoleCompetencies | null;
  locale: string;
  /** Cargo en texto libre de la ficha, para el estado vacío. */
  roleTitle: string | null;
}) {
  const t = await getTranslations({ locale, namespace: "People.competencies" });

  return (
    <div style={{ background: "#FCFAF6", border: "1px solid #E7E1D4", borderRadius: "16px", padding: "22px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "12px", marginBottom: "6px" }}>
        <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "16px" }}>{t("title")}</div>
        {data && (
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.5px", color: "#79746B" }}>
            {data.titleLabel}
          </div>
        )}
      </div>

      {!data ? (
        <p style={{ fontSize: "13.5px", lineHeight: 1.5, color: "#79746B", margin: 0 }}>
          {roleTitle ? t("noTitleWithRole", { role: roleTitle }) : t("noTitle")}
        </p>
      ) : data.core.length === 0 && data.optional.length === 0 ? (
        <p style={{ fontSize: "13.5px", lineHeight: 1.5, color: "#79746B", margin: 0 }}>{t("noSkills")}</p>
      ) : (
        <>
          <p style={{ fontSize: "13px", lineHeight: 1.5, color: "#79746B", margin: "0 0 14px" }}>
            {data.inheritedFrom ? t("introInherited", { anchor: data.inheritedFrom }) : t("intro")}
          </p>
          {data.core.length > 0 && (
            <div style={{ marginBottom: data.optional.length ? "14px" : 0 }}>
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "9.5px", textTransform: "uppercase", letterSpacing: "1px", color: "#79746B", marginBottom: "7px" }}>
                {t("core")}
              </div>
              <SkillChips items={data.core} tone="core" />
            </div>
          )}
          {data.optional.length > 0 && (
            <div>
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "9.5px", textTransform: "uppercase", letterSpacing: "1px", color: "#79746B", marginBottom: "7px" }}>
                {t("optional")}
              </div>
              <SkillChips items={data.optional} tone="soft" />
            </div>
          )}
        </>
      )}
    </div>
  );
}
