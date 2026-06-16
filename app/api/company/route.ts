import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";
import { slugify } from "@/lib/utils";

/** Crea o actualiza el workspace (empresa única). */
export async function POST(req: Request) {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body?.name?.trim()) return jsonError("El nombre es obligatorio");

  const values = {
    name: body.name.trim(),
    slug: body.slug ? slugify(body.slug) : slugify(body.name),
    description: body.description ?? null,
    website: body.website ?? null,
    logo_url: body.logo_url ?? null,
  };

  const { data: existing } = await supabase.from("companies").select("id").limit(1).maybeSingle();

  const { data, error: dbError } = existing
    ? await supabase.from("companies").update(values).eq("id", existing.id).select().single()
    : await supabase.from("companies").insert(values).select().single();

  if (dbError) return jsonError(dbError.message, 500);
  return NextResponse.json({ company: data });
}
