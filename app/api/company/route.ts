import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";
import { slugify } from "@/lib/utils";
import { seedHrisDefaults } from "@/lib/hris-seed";

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
    address: body.address ?? null,
  };

  const { data: existing } = await supabase.from("companies").select("id").limit(1).maybeSingle();

  const { data, error: dbError } = existing
    ? await supabase.from("companies").update(values).eq("id", existing.id).select().single()
    : await supabase.from("companies").insert(values).select().single();

  if (dbError) return jsonError(dbError.message, 500);

  // Seed HRIS defaults on new company creation
  if (!existing && data) await seedHrisDefaults(supabase, data.id);

  return NextResponse.json({ company: data });
}

/** Devuelve la empresa y garantiza que los defaults de HRIS existen. */
export async function GET() {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const { data: company } = await supabase.from("companies").select("*").limit(1).maybeSingle();
  if (!company) return NextResponse.json({ company: null });

  // Retroactive seed for companies created before HRIS was added
  await seedHrisDefaults(supabase, company.id);

  return NextResponse.json({ company });
}
