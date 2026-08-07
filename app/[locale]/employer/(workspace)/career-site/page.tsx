import { createClient } from "@/lib/supabase/server";
import { getCompany } from "@/lib/workspace";
import { CompanyForm } from "@/components/features/company-form";
import { CareerSiteEditor } from "@/components/features/career-site-editor";
import type { CareerSitePage } from "@/lib/career-site-types";

export default async function CareerSiteDashboardPage() {
  const company = await getCompany();
  const supabase = createClient();

  const { data: page } = company
    ? await supabase
        .from("career_site_pages")
        .select("*")
        .eq("company_id", company.id)
        .maybeSingle()
    : { data: null };

  // Count active jobs for preview badge
  const { count: activeJobsCount } = company
    ? await supabase
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .eq("company_id", company.id)
        .eq("status", "active")
    : { count: 0 };

  return (
    <CareerSiteEditor
      company={company}
      initialPage={page as CareerSitePage | null}
      activeJobsCount={activeJobsCount ?? 0}
      configContent={<CompanyForm company={company} />}
    />
  );
}
