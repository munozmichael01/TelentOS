import { setRequestLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { HairlineTable, HairlineRow } from "@/components/hairline-table";
import { getMyEmployee } from "@/lib/performance/me";
import { DocumentUploader } from "@/components/features/document-uploader";
import { FileLink } from "@/components/features/file-link";
import { formatDate } from "@/lib/utils";

/**
 * Portal del empleado — su documentación.
 *
 * Puede subir (justificantes, títulos) pero no borrar: su contrato firmado no es suyo para
 * hacerlo desaparecer, eso lo hace RR.HH. (migr. 0078 y 0079, que además cerraron el bucket:
 * hasta ahora cualquier autenticado podía leer y borrar los documentos de todos).
 */
export default async function MisDocumentosPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const t = await getTranslations({ locale: params.locale, namespace: "Portal" });
  const { supabase, employee: emp } = await getMyEmployee(params.locale);

  const { data } = await supabase
    .from("employee_documents")
    .select("id, name, created_at")
    .eq("employee_id", emp.id)
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as { id: string; name: string; created_at: string }[];

  return (
    <div>
      <PageHeader eyebrow={t("eyebrow")} title={t("documents.title")} description={t("documents.description")} />
      <div style={{ maxWidth: "760px" }}>
        <div style={{ background: "#FCFAF6", border: "1px solid #E7E1D4", borderRadius: "16px", padding: "20px 22px", marginBottom: "18px" }}>
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: "1px", color: "#79746B", marginBottom: "10px" }}>
            {t("documents.uploadTitle")}
          </div>
          <DocumentUploader employeeId={emp.id} />
          <p style={{ fontSize: "12.5px", color: "#79746B", margin: "10px 0 0" }}>{t("documents.uploadNote")}</p>
        </div>

        {rows.length === 0 ? (
          <div style={{ background: "#FCFAF6", border: "1px solid #E7E1D4", borderRadius: "16px", padding: "22px", fontSize: "13.5px", color: "#79746B" }}>
            {t("documents.empty")}
          </div>
        ) : (
          <HairlineTable
            cols="2fr 1fr 0.7fr"
            headers={[t("documents.name"), t("documents.date"), ""]}
            align={["left", "left", "right"]}
          >
            {rows.map((d) => (
              <HairlineRow key={d.id} align={["left", "left", "right"]}>
                <span style={{ fontSize: "13.5px", fontWeight: 600 }}>{d.name}</span>
                <span style={{ fontSize: "13px", color: "#54504A" }}>{formatDate(d.created_at)}</span>
                <span>
                  <FileLink bucket="documents" resourceId={d.id} label={t("documents.open")} />
                </span>
              </HairlineRow>
            ))}
          </HairlineTable>
        )}
      </div>
    </div>
  );
}
