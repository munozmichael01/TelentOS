import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { ChannelsView } from "@/components/features/channels-view";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CanalesPage() {
  const supabase = createClient();
  const { data: channels } = await supabase
    .from("channels")
    .select("*")
    .order("base_cpa");

  return (
    <div>
      <PageHeader
        title="Canales"
        description="Configura los canales de distribución y analiza su rendimiento global."
      />
      <Suspense>
        <ChannelsView channels={channels ?? []} />
      </Suspense>
    </div>
  );
}
