import { PageHeader } from "@/components/page-header";
import { CompanyForm } from "@/components/features/company-form";
import { getCompany } from "@/lib/workspace";
import { setRequestLocale, getTranslations } from "next-intl/server";

export default async function SettingsPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const company = await getCompany();
  const t = await getTranslations({ locale: params.locale, namespace: "Settings" });

  return (
    <div>
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("company.title")}
        description={t("company.description")}
      />
      <CompanyForm company={company} />
      {company && (
        <p className="mt-6 text-sm text-muted-foreground">
          {t("company.publicSite")}{" "}
          <a href={`/careers/${company.slug}`} target="_blank" className="text-primary underline">
            /careers/{company.slug}
          </a>
        </p>
      )}
    </div>
  );
}
