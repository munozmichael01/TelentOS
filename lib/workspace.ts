import { createClient } from "@/lib/supabase/server";
import type { Company } from "@/lib/types";

/**
 * Workspace único por cuenta: devolvemos la primera (y única) empresa.
 * Si aún no existe (cuenta recién creada sin seed), devolvemos null y la UI
 * invita a configurarla en /settings.
 */
export async function getCompany(): Promise<Company | null> {
  const supabase = createClient();
  const { data } = await supabase.from("companies").select("*").limit(1).maybeSingle();
  return (data as Company) ?? null;
}
