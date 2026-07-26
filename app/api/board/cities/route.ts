import { NextResponse } from "next/server";
import { searchCitiesGlobal } from "@/lib/board/geo";
import { createClient } from "@/lib/supabase/server";

// Autocompletado público de ciudades del board. GLOBAL (todos los países), con el mercado del
// locale priorizado (`country`) pero SIN restringir — el mercado prioriza, no filtra (Madrid
// aparece también en es-ve). Solo se devuelven ciudades que **tienen ofertas activas**.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const market = url.searchParams.get("country") ?? "VE";
  const candidates = searchCitiesGlobal(q, market, 16);
  if (!candidates.length) return NextResponse.json({ cities: [] });

  // ¿Cuáles candidatas tienen ≥1 oferta activa? Una query (OR de ilike por nombre) → tally en JS.
  const supabase = createClient();
  const orExpr = candidates.map((c) => `city.ilike.%${c.name}%`).join(",");
  const { data } = await supabase.from("jobs").select("city").eq("status", "active").or(orExpr).limit(3000);
  const offerCities = ((data ?? []) as { city: string | null }[]).map((r) => (r.city ?? "").toLowerCase());
  const withOffers = candidates.filter((c) => offerCities.some((oc) => oc.includes(c.name.toLowerCase())));
  return NextResponse.json({ cities: withOffers.slice(0, 8) });
}
