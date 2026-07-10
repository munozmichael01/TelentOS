export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { getCompany } from "@/lib/workspace";
import { requireRole } from "@/lib/auth-guard";
import { PayRunDetail } from "@/components/features/pay-run-detail";
import { notFound } from "next/navigation";

export default async function PayRunDetailPage({ params }: { params: { id: string } }) {
  const [company, role] = await Promise.all([getCompany(), requireRole(["owner", "hr_admin"])]);

  // Verify run exists before rendering client component (RLS-scoped)
  const supabase = createClient();
  const { data: run } = await supabase
    .from("pay_runs")
    .select("id")
    .eq("id", params.id)
    .maybeSingle();

  if (!run) notFound();

  return <PayRunDetail id={params.id} companyName={company?.name ?? "Empresa"} role={role} />;
}
