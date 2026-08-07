import { setRequestLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { RoleCompetencies } from "@/components/features/role-competencies";
import { EmployeeTimeline } from "@/components/features/employee-timeline";
import { getRoleCompetencies } from "@/lib/performance/competencies";
import { getEmployeeEvents } from "@/lib/performance/events";
import { getMyEmployee } from "@/lib/performance/me";

/**
 * Portal del empleado — su desempeño. Reutiliza EXACTAMENTE los mismos componentes que la
 * ficha de RR.HH.: lo que cambia no es la UI sino qué deja ver la RLS. Cuando lleguen los
 * ciclos (bloque 3) aparecerán aquí su autoevaluación y su resultado.
 */
export default async function MiDesempenoPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const t = await getTranslations({ locale: params.locale, namespace: "Portal" });
  const { supabase, employee: emp } = await getMyEmployee(params.locale);

  const [competencies, events] = await Promise.all([
    getRoleCompetencies(supabase, emp.job_title_id, params.locale),
    getEmployeeEvents(supabase, emp.id),
  ]);

  return (
    <div>
      <PageHeader eyebrow={t("eyebrow")} title={t("performance.title")} description={t("performance.description")} />
      <div style={{ maxWidth: "760px", display: "flex", flexDirection: "column", gap: "16px" }}>
        <RoleCompetencies data={competencies} locale={params.locale} roleTitle={emp.role_title} />
        <EmployeeTimeline events={events} locale={params.locale} />
      </div>
    </div>
  );
}
