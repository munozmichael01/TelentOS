import { requireRole } from "@/lib/auth-guard";

export default async function TimeoffLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["owner", "hr_admin", "manager"]);
  return <>{children}</>;
}
