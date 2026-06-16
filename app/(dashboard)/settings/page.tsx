import { PageHeader } from "@/components/page-header";
import { CompanyForm } from "@/components/features/company-form";
import { getCompany } from "@/lib/workspace";

export default async function SettingsPage() {
  const company = await getCompany();

  return (
    <div>
      <PageHeader
        title="Ajustes"
        description="Configura tu empresa y el career site público."
      />
      <CompanyForm company={company} />
      {company && (
        <p className="mt-6 text-sm text-muted-foreground">
          Tu career site público:{" "}
          <a href={`/careers/${company.slug}`} target="_blank" className="text-primary underline">
            /careers/{company.slug}
          </a>
        </p>
      )}
    </div>
  );
}
