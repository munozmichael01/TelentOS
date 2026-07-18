const EMPLOYMENT_TYPE_MAP: Record<string, string> = {
  full_time: "FULL_TIME",
  part_time: "PART_TIME",
  contract: "CONTRACTOR",
  temporary: "TEMPORARY",
  internship: "INTERN",
  volunteer: "VOLUNTEER",
  per_diem: "PER_DIEM",
  other: "OTHER",
};

export interface JobJsonLdInput {
  title: string;
  description?: string | null;
  created_at: string;
  employment_type?: string | null;
  city?: string | null;
  country_code?: string | null;
  modality?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_currency?: string | null;
  closes_at?: string | null;
  valid_through?: string | null;
}

export interface CompanyJsonLdInput {
  name: string;
  logo_url?: string | null;
}

export function getJobJsonLd(job: JobJsonLdInput, company: CompanyJsonLdInput) {
  const mappedEmploymentType = job.employment_type
    ? (EMPLOYMENT_TYPE_MAP[job.employment_type.toLowerCase()] ?? job.employment_type)
    : undefined;

  const validThrough = job.valid_through || job.closes_at || undefined;

  const address: Record<string, string> = {
    "@type": "PostalAddress",
  };
  if (job.city) {
    address.addressLocality = job.city;
  }
  if (job.country_code) {
    address.addressCountry = job.country_code;
  }

  const baseSalary =
    job.salary_min != null || job.salary_max != null
      ? {
          "@type": "MonetaryAmount",
          currency: job.salary_currency || "USD",
          value: {
            "@type": "QuantitativeValue",
            minValue: job.salary_min ?? undefined,
            maxValue: job.salary_max ?? undefined,
            unitText: "MONTH",
          },
        }
      : undefined;

  return {
    "@context": "https://schema.org/",
    "@type": "JobPosting",
    title: job.title,
    description: job.description || job.title,
    datePosted: job.created_at,
    ...(validThrough ? { validThrough } : {}),
    ...(mappedEmploymentType ? { employmentType: mappedEmploymentType } : {}),
    hiringOrganization: {
      "@type": "Organization",
      name: company.name,
      ...(company.logo_url ? { logo: company.logo_url } : {}),
    },
    jobLocation: {
      "@type": "Place",
      address,
    },
    ...(job.modality === "remoto" ? { jobLocationType: "TELECOMMUTE" } : {}),
    ...(baseSalary ? { baseSalary } : {}),
  };
}
