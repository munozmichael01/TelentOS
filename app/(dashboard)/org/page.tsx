import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { createClient } from "@/lib/supabase/server";
import { initials } from "@/lib/utils";
import type { Employee } from "@/lib/types";

const AVATAR_PALETTES = [
  { bg: "#DCEFE4", color: "#0E5C4A" },
  { bg: "#F6D9D2", color: "#BD4332" },
  { bg: "#E7E0F2", color: "#5A4C86" },
  { bg: "#F8E7C4", color: "#946312" },
  { bg: "#D6E4F2", color: "#2B5E8A" },
  { bg: "#E9F0D2", color: "#52610F" },
];
function palette(name: string) {
  const code = name.charCodeAt(0) + (name.charCodeAt(1) || 0);
  return AVATAR_PALETTES[code % AVATAR_PALETTES.length];
}

/** Org chart: árbol recursivo por manager_id, renderizado en servidor. */
export default async function OrgPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("employees")
    .select("id, name, role_title, department, status, manager_id")
    .eq("status", "active")
    .order("name");
  const employees = (data ?? []) as Pick<Employee, "id" | "name" | "role_title" | "department" | "status">[];

  const children = new Map<string | null, typeof employees>();
  for (const e of employees) {
    const raw = (e as any).manager_id as string | null | undefined;
    const key = raw && employees.some((m) => m.id === raw) ? raw : null;
    children.set(key, [...(children.get(key) ?? []), e]);
  }

  function Node({ employee, depth }: { employee: typeof employees[0]; depth: number }) {
    const reports = children.get(employee.id) ?? [];
    const pal = palette(employee.name);
    return (
      <div className={depth > 0 ? "ml-8 pl-4 border-l-2 border-[#E7E1D4]" : ""}>
        <Link
          href={`/employees/${employee.id}`}
          className="my-2 flex w-fit items-center gap-3 rounded-[13px] border border-[#E7E1D4] bg-[#FCFAF6] px-4 py-2.5 transition-colors hover:bg-[#EFEBE1] hover:border-[#C8C2B8]"
        >
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold"
            style={{ background: pal.bg, color: pal.color }}
          >
            {initials(employee.name)}
          </span>
          <div>
            <p className="text-sm font-bold leading-tight" style={{ fontFamily: "'Archivo',sans-serif", color: "#1A1A17" }}>
              {employee.name}
            </p>
            <p className="text-[10.5px] mt-0.5" style={{ fontFamily: "'Space Mono',monospace", color: "#79746B" }}>
              {[employee.role_title, employee.department].filter(Boolean).join(" · ")}
            </p>
          </div>
          {reports.length > 0 && (
            <span
              className="ml-2 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold"
              style={{ fontFamily: "'Space Mono',monospace", background: "#F4F0E8", color: "#79746B", border: "1px solid #E7E1D4" }}
            >
              {reports.length}
            </span>
          )}
        </Link>
        {reports.map((r) => (
          <Node key={r.id} employee={r} depth={depth + 1} />
        ))}
      </div>
    );
  }

  const roots = children.get(null) ?? [];

  return (
    <div>
      <PageHeader title="Organigrama" description="Personas" />
      {roots.length === 0 ? (
        <EmptyState title="Sin empleados" description="Da de alta empleados y asigna managers para ver el organigrama." />
      ) : (
        <div
          className="rounded-[16px] border border-[#E7E1D4] p-6"
          style={{ background: "#FCFAF6" }}
        >
          <div className="space-y-1">
            {roots.map((e) => (
              <Node key={e.id} employee={e} depth={0} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
