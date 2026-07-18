import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCompany } from "@/lib/workspace";
import { OnboardingForm } from "@/components/features/onboarding-form";

export const dynamic = "force-dynamic";

/** Onboarding self-serve. Solo para usuarios logueados SIN empresa. */
export default async function OnboardingPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const company = await getCompany();
  if (company) redirect("/app/dashboard"); // ya tiene workspace
  return <OnboardingForm email={user.email ?? ""} />;
}
