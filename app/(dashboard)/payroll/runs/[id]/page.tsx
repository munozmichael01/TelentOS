export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { PayRunDetail } from "@/components/features/pay-run-detail";
import { notFound } from "next/navigation";

export default async function PayRunDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: company } = await supabase
    .from("companies")
    .select("name")
    .limit(1)
    .maybeSingle();

  // Verify run exists before rendering client component
  const { data: run } = await supabase
    .from("pay_runs")
    .select("id")
    .eq("id", params.id)
    .maybeSingle();

  if (!run) notFound();

  return <PayRunDetail id={params.id} companyName={company?.name ?? "Empresa"} />;
}
