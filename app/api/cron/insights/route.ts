import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { generateInsightsForCompany } from "@/lib/insights/generate";

/**
 * Cron del plano proactivo: regenera los insights de TODAS las empresas.
 * Lo dispara Vercel Cron (ver vercel.json) con `Authorization: Bearer ${CRON_SECRET}`.
 *
 * - Auth por secreto compartido (no hay sesión de usuario): sin CRON_SECRET válido → 401.
 * - Resiliente: el fallo de una empresa no aborta el resto (se registra y sigue).
 * - Coste acotado: el generador solo invoca al LLM cuando hay señales reales, y cada
 *   invocación pasa por el presupuesto por empresa (runAgent). Empresas vacías → $0.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 300; // el barrido de todas las empresas puede tardar

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // sin secreto configurado, el cron no corre (fail-closed)
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }

  const db = createAdminClient();
  const { data: companies, error } = await db.from("companies").select("id, name");
  if (error) {
    return NextResponse.json({ error: `No se pudieron listar empresas: ${error.message}` }, { status: 500 });
  }

  const started = Date.now();
  const results: { companyId: string; name: string; generated?: number; error?: string }[] = [];
  let ok = 0;
  let failed = 0;

  for (const c of companies ?? []) {
    try {
      const r = await generateInsightsForCompany(db, c.id);
      results.push({ companyId: c.id, name: c.name, generated: r.generated });
      ok++;
    } catch (e) {
      results.push({ companyId: c.id, name: c.name, error: e instanceof Error ? e.message : String(e) });
      failed++;
      console.error(`[cron/insights] empresa ${c.id} (${c.name}):`, e);
    }
  }

  return NextResponse.json({
    status: "ok",
    companies: companies?.length ?? 0,
    ok,
    failed,
    ms: Date.now() - started,
    results,
  });
}
