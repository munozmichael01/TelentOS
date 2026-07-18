import type { SupabaseClient } from "@supabase/supabase-js";
import { jobSlug } from "@/lib/board/format";
import type { FeedJob } from "@/lib/feed/jobs-feed";

type FeedJobRow = {
  id: string;
  title: string;
  description: string | null;
  city: string | null;
  country_code: string | null;
  location: string | null;
  modality: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  employment_type: string | null;
  category: string | null;
  created_at: string;
  updated_at?: string | null;
  company: { id: string; name: string; slug: string | null; logo_url: string | null } | null;
};

const SELECT =
  "id, title, description, city, country_code, location, modality, salary_min, salary_max, salary_currency, employment_type, category, created_at, updated_at, company:companies(id, name, slug, logo_url)";

export async function fetchActiveFeedJobs(supabase: SupabaseClient, origin: string): Promise<FeedJob[]> {
  const { data, error } = await supabase
    .from("jobs")
    .select(SELECT)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(5000);

  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as FeedJobRow[]).map((row) => normalizeFeedJob(row, origin));
}

export function normalizeFeedJob(row: FeedJobRow, origin: string): FeedJob {
  const company = row.company ?? { id: "", name: "TalentOS", slug: null, logo_url: null };
  const url = new URL(`/empleos/oferta/${jobSlug({ id: row.id, title: row.title, company })}`, origin).toString();

  return {
    id: row.id,
    title: row.title,
    description: row.description ?? row.title,
    company: {
      name: company.name,
      slug: company.slug,
      logoUrl: company.logo_url,
    },
    url,
    city: row.city,
    countryCode: row.country_code,
    location: row.location,
    salaryMin: row.salary_min,
    salaryMax: row.salary_max,
    salaryCurrency: row.salary_currency,
    modality: row.modality,
    employmentType: row.employment_type,
    category: row.category,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
