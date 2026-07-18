import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchJobs, type BoardSearchParams, type BoardSort } from "@/lib/job-board/search";

// Búsqueda pública del board. Sin sesión = rol anon; la RLS `jobs_anon_read_active`
// permite leer ofertas activas de todas las empresas. Los filtros llegan ya resueltos
// (la interpretación del texto libre por LLM ocurre antes, en nl-search).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const g = (k: string) => url.searchParams.get(k) ?? undefined;
  const num = (k: string) => {
    const v = url.searchParams.get(k);
    return v ? Number(v) || undefined : undefined;
  };
  const modality = g("modality");
  const params: BoardSearchParams = {
    q: g("q"),
    location: g("location"),
    category: g("category"),
    modality: modality === "presencial" || modality === "hibrido" || modality === "remoto" ? modality : undefined,
    contract: g("contract"),
    salaryMin: num("salaryMin"),
    companyId: g("companyId"),
    sort: (g("sort") as BoardSort) ?? "relevance",
    page: num("page"),
    pageSize: num("pageSize"),
  };

  try {
    const supabase = createClient();
    const result = await searchJobs(supabase, params);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error de búsqueda" }, { status: 500 });
  }
}
