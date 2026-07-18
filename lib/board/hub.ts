import { searchJobs, type BoardJob } from "@/lib/job-board/search";
import { getCategories, categoryLabel } from "@/lib/board/categories";
import { cityFromSlug, countryForLocale } from "@/lib/board/geo";
import { createClient } from "@/lib/supabase/server";

export type HubData = {
  categoryKey: string;
  categoryLabel: string;
  city: string | null; // nombre canónico (null = todas las ubicaciones)
  jobs: BoardJob[];
  total: number;
};

// Resuelve un hub categoría[×ciudad]. Valida que la categoría sea una de las 22 y (si hay
// ubicación) que la ciudad sea canónica del mercado — si no, null → 404 (evita hubs basura).
export async function resolveHub(categoria: string, ubicacion: string | undefined, locale: string): Promise<HubData | null> {
  const valid = getCategories(locale).some((c) => c.key === categoria);
  if (!valid) return null;
  let cityName: string | null = null;
  if (ubicacion) {
    const city = cityFromSlug(ubicacion, countryForLocale(locale));
    if (!city) return null;
    cityName = city.name;
  }
  const { jobs, total } = await searchJobs(createClient(), {
    categoryKey: categoria,
    location: cityName ?? undefined,
    pageSize: 30,
  });
  return { categoryKey: categoria, categoryLabel: categoryLabel(categoria, locale) ?? categoria, city: cityName, jobs, total };
}
