"use client";

import Link from "next/link";
import { initials } from "@/lib/utils";
import styles from "./org-tree.module.css";

const PALETTES = [
  { bg: "#DCEFE4", color: "#0E5C4A" },
  { bg: "#F6D9D2", color: "#BD4332" },
  { bg: "#E7E0F2", color: "#5A4C86" },
  { bg: "#F8E7C4", color: "#946312" },
  { bg: "#D6E4F2", color: "#2B5E8A" },
  { bg: "#E9F0D2", color: "#52610F" },
];
function palette(name: string) {
  const code = name.charCodeAt(0) + (name.charCodeAt(1) || 0);
  return PALETTES[code % PALETTES.length];
}

export type OrgEmployee = {
  id: string;
  name: string;
  role_title?: string | null;
  department?: string | null;
  manager_id?: string | null;
};

function NodeCard({ employee, isRoot }: { employee: OrgEmployee; isRoot: boolean }) {
  const pal = palette(employee.name);
  return (
    <Link
      href={`/employees/${employee.id}`}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "10px",
        background: "#FCFAF6",
        borderRadius: "14px",
        padding: "18px 20px",
        textDecoration: "none",
        width: "148px",
        border: isRoot ? "1.5px solid #1A1A17" : "1.5px solid #E7E1D4",
        boxShadow: isRoot ? "3px 3px 0 #1A1A17" : "none",
        transition: "box-shadow .12s, transform .12s",
      }}
      onMouseEnter={(e) => {
        if (!isRoot) {
          (e.currentTarget as HTMLElement).style.boxShadow = "3px 3px 0 #1A1A17";
          (e.currentTarget as HTMLElement).style.borderColor = "#1A1A17";
        }
      }}
      onMouseLeave={(e) => {
        if (!isRoot) {
          (e.currentTarget as HTMLElement).style.boxShadow = "none";
          (e.currentTarget as HTMLElement).style.borderColor = "#E7E1D4";
        }
      }}
    >
      <span
        style={{
          width: 44, height: 44, borderRadius: "50%",
          background: pal.bg, color: pal.color,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: 15,
          flexShrink: 0,
        }}
      >
        {initials(employee.name)}
      </span>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: 13.5, color: "#1A1A17", lineHeight: 1.2 }}>
          {employee.name}
        </div>
        {employee.role_title && (
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: "#79746B", marginTop: 4 }}>
            {employee.role_title}
          </div>
        )}
      </div>
    </Link>
  );
}

function OrgNode({
  employee,
  childrenMap,
  depth,
}: {
  employee: OrgEmployee;
  childrenMap: Map<string | null, OrgEmployee[]>;
  depth: number;
}) {
  const reports = childrenMap.get(employee.id) ?? [];

  return (
    <div className={styles.nodeWrap}>
      <NodeCard employee={employee} isRoot={depth === 0} />
      {reports.length > 0 && (
        <ul className={styles.tree} style={{ padding: 0, paddingTop: 28 }}>
          {reports.map((r) => (
            <li key={r.id}>
              <div className={styles.connector} />
              <OrgNode employee={r} childrenMap={childrenMap} depth={depth + 1} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function OrgChart({ employees }: { employees: OrgEmployee[] }) {
  const childrenMap = new Map<string | null, OrgEmployee[]>();
  for (const e of employees) {
    const key = e.manager_id && employees.some((m) => m.id === e.manager_id) ? e.manager_id : null;
    childrenMap.set(key, [...(childrenMap.get(key) ?? []), e]);
  }

  const roots = childrenMap.get(null) ?? [];

  return (
    <div className={styles.tree}>
      {roots.map((root) => (
        <OrgNode key={root.id} employee={root} childrenMap={childrenMap} depth={0} />
      ))}
    </div>
  );
}
