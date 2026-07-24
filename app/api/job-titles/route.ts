import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Taxonomía de cargos para el PICKER del formulario de publicar oferta (dashboard). Busca
// cargos canónicos por nombre/traducción/sinónimo (?q=) y, al elegir uno (?id=), devuelve su
// categoría y las skills relacionadas (job_title_skills) para pre-rellenar. Datos de
// referencia públicos (RLS anon/auth).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const q = (url.searchParams.get("q") ?? "").trim();
  const db = createClient();

  // Detalle de un cargo: categoría + skills sugeridas.
  if (id) {
    const [{ data: title }, { data: links }] = await Promise.all([
      db.from("job_titles").select("id, canonical_name, category_key").eq("id", id).maybeSingle(),
      db.from("job_title_skills").select("is_core, skills(name)").eq("job_title_id", id).order("is_core", { ascending: false }).limit(12),
    ]);
    if (!title) return NextResponse.json({ title: null, skills: [] });
    const skills = (links ?? []).map((l) => (l as { skills?: { name?: string } }).skills?.name).filter((s): s is string => !!s);
    return NextResponse.json({ title: { id: title.id, label: title.canonical_name, category_key: title.category_key ?? null }, skills });
  }

  // Búsqueda de cargos (canónico + traducción + sinónimo). Muestra la forma que matcheó.
  if (q.length < 2) return NextResponse.json({ titles: [] });
  const like = `%${q}%`;
  const [{ data: byTr }, { data: byCanon }, { data: bySyn }] = await Promise.all([
    db.from("job_title_translations").select("name, job_titles!inner(id, canonical_name, category_key)").ilike("name", like).limit(12),
    db.from("job_titles").select("id, canonical_name, category_key").ilike("canonical_name", like).limit(12),
    db.from("job_title_synonyms").select("synonym, job_titles!inner(id, canonical_name, category_key)").ilike("synonym", like).limit(12),
  ]);
  const map = new Map<string, { id: string; label: string; category_key: string | null }>();
  const add = (id: string, label: string, ck: string | null) => { if (id && !map.has(id)) map.set(id, { id, label, category_key: ck }); };
  for (const r of (byTr ?? []) as unknown as { name: string; job_titles: { id: string; category_key: string | null } }[]) add(r.job_titles.id, r.name, r.job_titles.category_key);
  for (const r of (byCanon ?? []) as { id: string; canonical_name: string; category_key: string | null }[]) add(r.id, r.canonical_name, r.category_key);
  for (const r of (bySyn ?? []) as unknown as { synonym: string; job_titles: { id: string; canonical_name: string; category_key: string | null } }[]) add(r.job_titles.id, r.job_titles.canonical_name, r.job_titles.category_key);
  return NextResponse.json({ titles: Array.from(map.values()).slice(0, 8) });
}
