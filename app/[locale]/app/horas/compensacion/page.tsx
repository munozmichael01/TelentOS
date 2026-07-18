import { PageHeader } from "@/components/page-header";
import { CompensationPanel } from "@/components/features/compensation-panel";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth-guard";
import type { Employee } from "@/lib/types";
import { setRequestLocale, getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function CompensacionPage({ params }: { params: { locale: string } }) {
  await requireRole(["owner", "hr_admin"]);
  setRequestLocale(params.locale);
  const t = await getTranslations({ locale: params.locale, namespace: "Timeoff" });
  const supabase = createClient();

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .limit(1)
    .maybeSingle();

  const { data: employees } = await supabase
    .from("employees")
    .select("id, name")
    .eq("status", "active")
    .eq("company_id", company?.id ?? "")
    .order("name");

  return (
    <div>
      <PageHeader
        title={t("compensation.title")}
        eyebrow={t("eyebrow.hours")}
        description={t("compensation.description")}
      />
      <CompensationPanel
        employees={(employees ?? []) as Pick<Employee, "id" | "name">[]}
      />
    </div>
  );
}
