import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { createClient } from "@/lib/supabase/server";
import { initials } from "@/lib/utils";
import type { Employee } from "@/lib/types";

/** Org chart simple: árbol por manager_id renderizado en servidor. */
export default async function OrgPage() {
  const supabase = createClient();
  const { data } = await supabase.from("employees").select("*").eq("status", "active").order("name");
  const employees = (data ?? []) as Employee[];

  const children = new Map<string | null, Employee[]>();
  for (const e of employees) {
    const key = e.manager_id && employees.some((m) => m.id === e.manager_id) ? e.manager_id : null;
    children.set(key, [...(children.get(key) ?? []), e]);
  }

  function Node({ employee, depth }: { employee: Employee; depth: number }) {
    const reports = children.get(employee.id) ?? [];
    return (
      <div className={depth > 0 ? "ml-8 border-l pl-4" : ""}>
        <Link
          href={`/employees/${employee.id}`}
          className="my-1.5 flex w-fit items-center gap-3 rounded-lg border bg-card px-4 py-2.5 shadow-sm transition-colors hover:bg-accent"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {initials(employee.name)}
          </span>
          <div>
            <p className="text-sm font-medium leading-tight">{employee.name}</p>
            <p className="text-xs text-muted-foreground">
              {[employee.role_title, employee.department].filter(Boolean).join(" · ")}
            </p>
          </div>
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
      <PageHeader title="Organigrama" description="Quién reporta a quién." />
      {roots.length === 0 ? (
        <EmptyState title="Sin empleados" description="Da de alta empleados para ver el organigrama." />
      ) : (
        <div className="space-y-4">
          {roots.map((e) => (
            <Node key={e.id} employee={e} depth={0} />
          ))}
        </div>
      )}
    </div>
  );
}
