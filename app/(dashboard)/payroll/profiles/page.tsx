export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { HairlineTable, HairlineRow } from "@/components/hairline-table";
import Link from "next/link";
import type { Employee, PayProfile } from "@/lib/types";

const AVATAR_PALETTES = [
  { bg: "#DCEFE4", color: "#0E5C4A" }, { bg: "#F6D9D2", color: "#BD4332" },
  { bg: "#E7E0F2", color: "#5A4C86" }, { bg: "#F8E7C4", color: "#946312" },
  { bg: "#D6E4F2", color: "#2B5E8A" },
];
function avatarPal(name: string) {
  const code = name.charCodeAt(0) + (name.charCodeAt(1) || 0);
  return AVATAR_PALETTES[code % AVATAR_PALETTES.length];
}
function initials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

export default async function PayProfilesPage() {
  const supabase = createClient();

  const [{ data: employees }, { data: profiles }] = await Promise.all([
    supabase
      .from("employees")
      .select("id, name, role_title, department")
      .eq("status", "active")
      .order("name"),
    supabase
      .from("pay_profiles")
      .select("employee_id, base_salary, currency, country_pack, updated_at")
      .is("effective_to", null),
  ]);

  const list = (employees ?? []) as Employee[];
  const profileMap = new Map(
    ((profiles ?? []) as Pick<PayProfile, "employee_id" | "base_salary" | "currency" | "country_pack" | "updated_at">[])
      .map((p) => [p.employee_id, p])
  );

  const PACK_LABEL: Record<string, string> = {
    generic: "Genérico · activo",
    ve: "Venezuela · vista previa",
    br: "Brasil · próximamente",
    es: "España · próximamente",
    co: "Colombia · próximamente",
    mx: "México · próximamente",
  };
  const PACK_ACTIVE = new Set(["generic"]);

  const withoutProfile = list.filter((e) => !profileMap.has(e.id));

  return (
    <div>
      <PageHeader title="Perfiles salariales" eyebrow="Payroll" />

      {withoutProfile.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "#F8E7C4", border: "1px solid #E5C97A", borderRadius: "12px", padding: "13px 16px", marginBottom: "18px" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
            <path d="M12 3l9 16H3l9-16Z" stroke="#946312" strokeWidth="2" strokeLinejoin="round"/>
            <path d="M12 10v4M12 17h.01" stroke="#946312" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 700, fontSize: "13.5px", color: "#1A1A17" }}>
            {withoutProfile.length} empleado{withoutProfile.length !== 1 ? "s" : ""} sin perfil salarial
          </span>
          <span style={{ fontSize: "13px", color: "#79746B" }}>
            — no aparecerán en la próxima corrida de nómina hasta que configures su salario.
          </span>
        </div>
      )}

      {list.length === 0 ? (
        <EmptyState
          title="Sin empleados activos"
          description="Los perfiles salariales aparecerán aquí una vez que tengas empleados activos."
        />
      ) : (
        <HairlineTable
          cols="2fr 1.2fr 1fr 1fr 1fr 0.5fr"
          headers={["Empleado", "Cargo", "Salario base", "Country pack", "Actualizado", ""]}
          align={["left", "left", "right", "left", "left", "right"]}
        >
          {list.map((e) => {
            const pal = avatarPal(e.name);
            const profile = profileMap.get(e.id);
            return (
              <HairlineRow key={e.id} align={["left", "left", "right", "left", "left", "right"]}>
                <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ width: "30px", height: "30px", flexShrink: 0, borderRadius: "50%", background: pal.bg, color: pal.color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "11px" }}>
                    {initials(e.name)}
                  </span>
                  <Link href={`/payroll/profiles/${e.id}`} style={{ fontWeight: 700, color: "#1A1A17", textDecoration: "none" }}>{e.name}</Link>
                </span>
                <span style={{ color: "#54504A", fontSize: "13px" }}>{e.role_title ?? "—"}</span>
                <span style={{ fontFamily: "'Space Mono',monospace", fontWeight: 700 }}>
                  {profile
                    ? `${profile.base_salary.toLocaleString("en-US")} ${profile.currency}`
                    : <span style={{ color: "#79746B", fontWeight: 400 }}>Sin configurar</span>
                  }
                </span>
                <span>
                  {profile ? (
                    <span style={{ fontSize: "11px", fontWeight: 700, borderRadius: "999px", padding: "3px 10px", background: PACK_ACTIVE.has(profile.country_pack) ? "#DCEFE4" : "#EEE9DD", color: PACK_ACTIVE.has(profile.country_pack) ? "#0E5C4A" : "#79746B" }}>
                      {PACK_LABEL[profile.country_pack] ?? profile.country_pack}
                    </span>
                  ) : "—"}
                </span>
                <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "11px", color: "#79746B" }}>
                  {profile ? new Date(profile.updated_at).toLocaleDateString("es-VE") : "—"}
                </span>
                <Link href={`/payroll/profiles/${e.id}`} style={{ fontFamily: "'Space Mono',monospace", fontSize: "11px", fontWeight: 700, color: "#0E5C4A", textDecoration: "none" }}>
                  Ver →
                </Link>
              </HairlineRow>
            );
          })}
        </HairlineTable>
      )}
    </div>
  );
}
