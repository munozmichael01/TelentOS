import { setRequestLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { getMyEmployee } from "@/lib/performance/me";
import { MyOnboarding } from "@/components/features/my-onboarding";
import { MyContactForm } from "@/components/features/my-contact-form";
import type { OnboardingTask } from "@/lib/types";
import { formatDate } from "@/lib/utils";

/** Portal del empleado — su propia ficha, en solo lectura. Los cambios los hace RR.HH. */
export default async function MiPerfilPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const t = await getTranslations({ locale: params.locale, namespace: "Portal" });
  const { supabase, employee: emp } = await getMyEmployee(params.locale);

  // Las tareas de incorporación viven aquí y no en su propia sección: la incorporación se acaba,
  // y una entrada de menú permanentemente vacía en el portal de un veterano es ruido.
  const { data: onboarding } = await supabase
    .from("onboarding_tasks").select("*").eq("employee_id", emp.id).order("order_index");
  const tasks = (onboarding ?? []) as OnboardingTask[];

  const { data: manager } = emp.manager_id
    ? await supabase.from("employees").select("name, role_title").eq("id", emp.manager_id).maybeSingle()
    : { data: null };
  const mgr = manager as { name: string; role_title: string | null } | null;

  const fields: { label: string; value: string }[] = [
    { label: t("profile.name"), value: emp.name },
    { label: t("profile.email"), value: emp.email ?? "—" },
    { label: t("profile.role"), value: emp.role_title ?? "—" },
    { label: t("profile.dept"), value: emp.department ?? "—" },
    { label: t("profile.joined"), value: formatDate(emp.start_date) },
    { label: t("profile.manager"), value: mgr?.name ?? "—" },
    { label: t("profile.contract"), value: emp.contract_type },
    // País sí, ciudad no: la ciudad la mantiene el empleado abajo, pero mudarse de PAÍS afecta
    // al contrato y a los impuestos, así que sale aquí como dato de la empresa.
    { label: t("profile.country"), value: emp.country ?? "—" },
    { label: t("profile.modality"), value: emp.work_modality ?? "—" },
  ];

  return (
    <div>
      <PageHeader eyebrow={t("eyebrow")} title={t("profile.title")} description={t("profile.description")} />
      <div style={{ maxWidth: "760px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {tasks.length > 0 && <MyOnboarding tasks={tasks} />}
        <div style={{ background: "#FCFAF6", border: "1px solid #E7E1D4", borderRadius: "16px", padding: "22px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            {fields.map(({ label, value }) => (
              <div key={label}>
                <label style={{ fontFamily: "'Space Mono',monospace", fontSize: "9.5px", textTransform: "uppercase", letterSpacing: "1px", color: "#79746B", display: "block", marginBottom: "4px" }}>
                  {label}
                </label>
                <div style={{ fontSize: "14px", color: "#1A1A17" }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
        <p style={{ fontSize: "13px", color: "#79746B", margin: 0 }}>{t("profile.readOnly")}</p>

        <MyContactForm
          initial={{
            phone: emp.phone ?? null,
            address: emp.address ?? null,
            city: emp.city ?? null,
            emergency_contact_name: emp.emergency_contact_name ?? null,
            emergency_contact_phone: emp.emergency_contact_phone ?? null,
          }}
        />
        <p style={{ fontSize: "12.5px", color: "#79746B", margin: 0 }}>{t("contact.moveNote")}</p>
      </div>
    </div>
  );
}
