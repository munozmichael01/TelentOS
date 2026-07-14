import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/platform/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { platformSpend } from "@/lib/platform/spend";

/**
 * Platform Console §9.1 — gasto de IA agregado (cross-tenant). Solo `platform_admin`.
 * Es el contrato de datos que consumirá la superficie que diseñe pista Diseño; hoy
 * solo el endpoint (fundación). `?since=<ISO>` opcional; por defecto, mes en curso.
 */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { error } = await requirePlatformAdmin();
  if (error) return error;

  const since = new URL(req.url).searchParams.get("since") ?? undefined;
  const data = await platformSpend(createAdminClient(), since || undefined);
  return NextResponse.json(data);
}
