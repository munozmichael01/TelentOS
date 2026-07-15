import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/server";
import { seedHrisDefaults } from "@/lib/hris-seed";

/**
 * Provisión self-serve: al registrarse, el usuario nombra su empresa y aquí se
 * crea la empresa + su membresía `owner` + los defaults de HRIS. Idempotente: si
 * ya tiene empresa, no crea otra. Es la puerta que convierte una cuenta nueva en
 * un workspace propio (en vez de caer en la empresa demo).
 */
export async function POST(req: Request) {
  const { user, error } = await requireUser();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 80) : "";
  const firstName = typeof body?.firstName === "string" ? body.firstName.trim().slice(0, 60) : "";
  const lastName = typeof body?.lastName === "string" ? body.lastName.trim().slice(0, 60) : "";
  if (!name) return jsonError("Falta el nombre de la empresa");

  const admin = createAdminClient();

  // Nombre del perfil → metadata del auth user (para el saludo). NO crea empleado:
  // en TalentOS user ≠ employee; la ficha del HRIS es opcional y aparte.
  if (firstName || lastName) {
    const fullName = [firstName, lastName].filter(Boolean).join(" ");
    await admin.auth.admin.updateUserById(user.id, {
      user_metadata: { first_name: firstName, last_name: lastName, full_name: fullName },
    });
  }

  // Idempotente: si ya es miembro de una empresa, no se crea otra.
  const { data: existing } = await admin
    .from("company_members")
    .select("company_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing?.company_id) return NextResponse.json({ ok: true, companyId: existing.company_id });

  // Slug único a partir del nombre.
  const base =
    name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "empresa";
  let slug = base;
  for (let i = 0; i < 6; i++) {
    const { data: clash } = await admin.from("companies").select("id").eq("slug", slug).maybeSingle();
    if (!clash) break;
    slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const { data: company, error: cErr } = await admin
    .from("companies").insert({ name, slug }).select("id").single();
  if (cErr || !company) return jsonError("No se pudo crear la empresa", 500);

  const { error: mErr } = await admin
    .from("company_members")
    .insert({ company_id: company.id, user_id: user.id, role: "owner", joined_at: new Date().toISOString() });
  if (mErr) {
    // Revierte la empresa huérfana para no dejar basura si falla la membresía.
    await admin.from("companies").delete().eq("id", company.id);
    return jsonError("No se pudo crear la membresía", 500);
  }

  try { await seedHrisDefaults(admin, company.id); } catch { /* defaults best-effort */ }

  return NextResponse.json({ ok: true, companyId: company.id });
}
