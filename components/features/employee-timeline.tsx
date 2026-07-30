import { getTranslations } from "next-intl/server";
import { formatDate } from "@/lib/utils";
import type { EmployeeEvent } from "@/lib/performance/events";

/**
 * Expediente del empleado: historial append-only (ciclos, resultados, planes, promociones).
 * Server component reutilizable: la ficha de RR.HH. y el portal del empleado pintan el mismo
 * timeline; lo que cambia es qué eventos trae la consulta, que lo decide la RLS.
 *
 * Sin emojis (regla de iconografía del DS): cada tipo lleva un punto de color del sistema.
 */
const TONE: Record<string, string> = {
  hired: "#0E5C4A",
  promotion: "#0E5C4A",
  role_changed: "#946312",
  cycle_started: "#5A4C86",
  self_review: "#5A4C86",
  manager_review: "#5A4C86",
  rating_published: "#0E5C4A",
  calibration_adjust: "#946312",
  development_plan: "#0E5C4A",
  improvement_plan: "#C7402E",
  acknowledged: "#79746B",
};

export async function EmployeeTimeline({
  events,
  locale,
}: {
  events: EmployeeEvent[];
  locale: string;
}) {
  const t = await getTranslations({ locale, namespace: "People.timeline" });

  return (
    <div style={{ background: "#FCFAF6", border: "1px solid #E7E1D4", borderRadius: "16px", padding: "22px" }}>
      <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "16px", marginBottom: "4px" }}>{t("title")}</div>
      <p style={{ fontSize: "13px", lineHeight: 1.5, color: "#79746B", margin: "0 0 16px" }}>{t("intro")}</p>

      {events.length === 0 ? (
        <p style={{ fontSize: "13.5px", color: "#79746B", margin: 0 }}>{t("empty")}</p>
      ) : (
        <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "14px" }}>
          {events.map((e) => (
            <li key={e.id} style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
              <span
                aria-hidden
                style={{
                  width: "9px", height: "9px", borderRadius: "50%", marginTop: "5px", flexShrink: 0,
                  background: TONE[e.type] ?? "#79746B",
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "13.5px", fontWeight: 600, color: "#1A1A17" }}>
                  {/* El tipo se traduce; si llega uno que la UI aún no conoce, se muestra su
                      resumen o el tipo crudo antes que un hueco en el expediente. */}
                  {t.has(`type.${e.type}`) ? t(`type.${e.type}`) : (e.summary ?? e.type)}
                </div>
                {e.summary && t.has(`type.${e.type}`) && (
                  <div style={{ fontSize: "13px", color: "#54504A", marginTop: "2px" }}>{e.summary}</div>
                )}
                <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", color: "#79746B", marginTop: "3px" }}>
                  {formatDate(e.created_at)}
                  {e.actor_email ? ` · ${e.actor_email}` : ""}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
