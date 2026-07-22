import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Sugerencias de cargos para el autocomplete del board: títulos REALES de ofertas
// activas que matchean el texto (dedupe). Público (RLS anon lee ofertas activas).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json({ titles: [] });

  const supabase = createClient();
  const { data } = await supabase
    .from("jobs").select("title")
    .eq("status", "active").ilike("title", `%${q}%`)
    .limit(30);

  const seen = new Set<string>();
  const titles: string[] = [];
  for (const r of data ?? []) {
    const t = (r as { title: string }).title?.trim();
    if (t && !seen.has(t.toLowerCase())) { seen.add(t.toLowerCase()); titles.push(t); }
    if (titles.length >= 5) break;
  }
  return NextResponse.json({ titles });
}
