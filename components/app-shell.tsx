"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Briefcase, Users, LayoutDashboard, Building2, Clock, Palmtree,
  Network, Settings, LogOut, Globe, UserSquare2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { section: "Reclutamiento" },
  { href: "/jobs", label: "Ofertas", icon: Briefcase },
  { href: "/candidates", label: "Candidatos", icon: Users },
  { section: "Personas" },
  { href: "/employees", label: "Empleados", icon: UserSquare2 },
  { href: "/org", label: "Organigrama", icon: Network },
  { href: "/timesheets", label: "Horas", icon: Clock },
  { href: "/timeoff", label: "Vacaciones", icon: Palmtree },
  { section: "Workspace" },
  { href: "/settings", label: "Ajustes", icon: Settings },
] as const;

export function AppShell({
  children,
  careersSlug,
}: {
  children: React.ReactNode;
  careersSlug?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 z-30 flex w-56 flex-col border-r bg-card">
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <Building2 className="h-5 w-5 text-primary" />
          <span className="font-semibold">TalentOS</span>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {NAV.map((item, i) =>
            "section" in item ? (
              <div key={i} className="px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {item.section}
              </div>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                  (pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))) &&
                    "bg-accent text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          )}
          {careersSlug && (
            <a
              href={`/careers/${careersSlug}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Globe className="h-4 w-4" />
              Career site ↗
            </a>
          )}
        </nav>
        <div className="border-t p-2">
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2.5 text-muted-foreground" onClick={signOut}>
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </Button>
        </div>
      </aside>
      <main className="ml-56 flex-1 bg-muted/30">
        <div className="mx-auto max-w-6xl p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
