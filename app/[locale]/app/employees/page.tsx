import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { EmployeeForm } from "@/components/features/employee-form";
import { AddMeAsEmployee } from "@/components/features/add-me-as-employee";
import { Badge } from "@/components/ui/badge";
import { HairlineTable, HairlineRow } from "@/components/hairline-table";
import { createClient } from "@/lib/supabase/server";
import { formatDate, initials } from "@/lib/utils";
import type { Employee } from "@/lib/types";

const AVATAR_PALETTES = [
  { bg: "#DCEFE4", color: "#0E5C4A" },
  { bg: "#F6D9D2", color: "#BD4332" },
  { bg: "#E7E0F2", color: "#5A4C86" },
  { bg: "#F8E7C4", color: "#946312" },
  { bg: "#D6E4F2", color: "#2B5E8A" },
];
function avatarPal(name: string) {
  const code = name.charCodeAt(0) + (name.charCodeAt(1) || 0);
  return AVATAR_PALETTES[code % AVATAR_PALETTES.length];
}

const contractLabel: Record<string, string> = {
  full_time: "Jornada completa",
  part_time: "Jornada parcial",
  contractor: "Freelance",
  internship: "Prácticas",
};

export default async function EmployeesPage() {
  const supabase = createClient();
  const [{ data: employees }, { data: { user } }] = await Promise.all([
    supabase.from("employees").select("*").order("name"),
    supabase.auth.getUser(),
  ]);

  const list = (employees ?? []) as Employee[];
  const byId = new Map(list.map((e) => [e.id, e]));
  const alreadyEmployee = !!user && list.some((e) => e.user_id === user.id);
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const myName = (meta.full_name as string) || (meta.name as string) || user?.email?.split("@")[0] || "";

  return (
    <div>
      <PageHeader title="Empleados" eyebrow="Personas">
        <EmployeeForm managers={list.map((e) => ({ id: e.id, name: e.name }))} />
      </PageHeader>

      {!alreadyEmployee && <AddMeAsEmployee name={myName} />}

      {list.length === 0 ? (
        <EmptyState
          title="Sin empleados"
          description="Contrata desde el pipeline de una oferta o da de alta manualmente."
        />
      ) : (
        <HairlineTable
          cols="2.2fr 1.4fr 1.2fr 1fr 1.2fr 1.2fr"
          headers={["Nombre", "Cargo", "Departamento", "Incorporación", "Contrato", "Reporta a"]}
          align={["left", "left", "left", "right", "left", "left"]}
        >
          {list.map((e) => {
            const pal = avatarPal(e.name);
            const manager = e.manager_id ? byId.get(e.manager_id) : null;
            return (
              <HairlineRow key={e.id} align={["left", "left", "left", "right", "left", "left"]}>
                {/* Nombre */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                  <span style={{ width: "32px", height: "32px", flexShrink: 0, borderRadius: "50%", background: pal.bg, color: pal.color, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "12px" }}>
                    {initials(e.name)}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Link href={`/app/employees/${e.id}`} style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 700, fontSize: "14px", color: "#1A1A17", textDecoration: "none" }}>
                        {e.name}
                      </Link>
                      {e.candidate_id && (
                        <Badge variant="outline" style={{ fontSize: "9px", padding: "1px 6px" }}>vía ATS</Badge>
                      )}
                    </div>
                  </div>
                </div>
                {/* Cargo */}
                <span style={{ fontSize: "13px" }}>{e.role_title ?? <span style={{ color: "#79746B" }}>—</span>}</span>
                {/* Departamento */}
                <span style={{ fontSize: "13px", color: "#79746B" }}>{e.department ?? "—"}</span>
                {/* Incorporación */}
                <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "12px" }}>{formatDate(e.start_date)}</span>
                {/* Contrato */}
                <span style={{ fontSize: "12.5px" }}>{contractLabel[e.contract_type ?? ""] ?? (e.contract_type ?? "—")}</span>
                {/* Reporta a */}
                <span style={{ fontSize: "13px", color: "#79746B" }}>{manager?.name ?? "—"}</span>
              </HairlineRow>
            );
          })}
        </HairlineTable>
      )}
    </div>
  );
}
