import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/server";
import { generatePayRunLines } from "@/lib/payroll/generate-lines";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const { companyId, user, error } = await requireApiRole(["owner", "hr_admin"]);
  if (error) return error;

  const db = createAdminClient();
  const { data: run } = await db
    .from("pay_runs")
    .select("id")
    .eq("id", params.id)
    .eq("company_id", companyId!)
    .maybeSingle();

  if (!run) return NextResponse.json({ error: "Corrida no encontrada" }, { status: 404 });

  try {
    const result = await generatePayRunLines(
      params.id,
      companyId!,
      user?.email ?? "Sistema",
    );
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error inesperado";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
