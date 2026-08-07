import { setRequestLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { HairlineTable, HairlineRow } from "@/components/hairline-table";
import { getMyEmployee } from "@/lib/performance/me";
import { ClockInCard } from "@/components/features/clock-in-card";
import { formatDate } from "@/lib/utils";

const hhmm = (min: number | null) => {
  if (min == null) return "—";
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h}h ${String(m).padStart(2, "0")}m` : `${h}h`;
};

// start_time/end_time son timestamptz (fecha completa), no `time`: hay que formatear la HORA
// en la zona del registro. Recortar los primeros caracteres mostraría el año.
const clock = (ts: string | null, tz: string | null, locale: string) =>
  ts ? new Date(ts).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", timeZone: tz ?? undefined }) : "—";

/**
 * Portal del empleado — su registro de horas, en solo lectura.
 * El fichaje desde el portal y los conceptos/proyectos por entrada están en el backlog: hoy el
 * registro no tiene esa dimensión y añadirla es un cambio del módulo de Horas, no del portal.
 */
export default async function MisHorasPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const t = await getTranslations({ locale: params.locale, namespace: "Portal" });
  const { supabase, employee: emp } = await getMyEmployee(params.locale);

  // Fichaje abierto, si lo hay: el contador arranca desde su hora de inicio.
  const { data: timer } = await supabase
    .from("timer_state").select("started_at").eq("employee_id", emp.id).maybeSingle();

  const { data } = await supabase
    .from("time_entries")
    .select("id, date, start_time, end_time, duration_minutes, entry_type, comment, timezone")
    .eq("employee_id", emp.id)
    .order("date", { ascending: false })
    .limit(60);
  const rows = (data ?? []) as {
    id: string; date: string; start_time: string | null; end_time: string | null;
    duration_minutes: number | null; entry_type: string; comment: string | null; timezone: string | null;
  }[];
  const totalMin = rows.reduce((acc, r) => acc + (r.duration_minutes ?? 0), 0);

  return (
    <div>
      <PageHeader eyebrow={t("eyebrow")} title={t("hours.title")} description={t("hours.description")} />
      <div style={{ maxWidth: "760px" }}>
        <ClockInCard startedAt={(timer as { started_at: string } | null)?.started_at ?? null} />
        {rows.length === 0 ? (
          <div style={{ background: "#FCFAF6", border: "1px solid #E7E1D4", borderRadius: "16px", padding: "22px", fontSize: "13.5px", color: "#79746B" }}>
            {t("hours.empty")}
          </div>
        ) : (
          <>
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "11px", color: "#79746B", marginBottom: "10px" }}>
              {t("hours.total", { total: hhmm(totalMin), count: rows.length })}
            </div>
            <HairlineTable
              cols="1fr 0.9fr 0.9fr 0.8fr"
              headers={[t("hours.date"), t("hours.start"), t("hours.end"), t("hours.duration")]}
              align={["left", "left", "left", "right"]}
            >
              {rows.map((r) => (
                <HairlineRow key={r.id} align={["left", "left", "left", "right"]}>
                  <span style={{ fontSize: "13.5px", fontWeight: 600 }}>{formatDate(r.date)}</span>
                  <span style={{ fontSize: "13px", color: "#54504A" }}>{clock(r.start_time, r.timezone, params.locale)}</span>
                  <span style={{ fontSize: "13px", color: "#54504A" }}>{clock(r.end_time, r.timezone, params.locale)}</span>
                  <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "12.5px" }}>{hhmm(r.duration_minutes)}</span>
                </HairlineRow>
              ))}
            </HairlineTable>
          </>
        )}
      </div>
    </div>
  );
}
