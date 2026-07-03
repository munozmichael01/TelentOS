const ROLE_META: Record<string, { label: string; bg: string; color: string }> = {
  owner:    { label: "Owner",    bg: "#DCEFE4", color: "#0E5C4A" },
  hr_admin: { label: "HR Admin", bg: "#E6F1EC", color: "#2C7A5E" },
  recruiter:{ label: "Recruiter",bg: "#FAE3DE", color: "#C7402E" },
  manager:  { label: "Manager",  bg: "#F8E7C4", color: "#946312" },
};

export function RoleBadge({ role }: { role: string }) {
  const meta = ROLE_META[role] ?? { label: role, bg: "#E7E1D4", color: "#79746B" };
  return (
    <span
      style={{
        fontFamily: "'Space Mono', monospace",
        fontSize: "10px",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: ".5px",
        color: meta.color,
        background: meta.bg,
        borderRadius: "999px",
        padding: "3px 10px",
        whiteSpace: "nowrap",
        display: "inline-block",
      }}
    >
      {meta.label}
    </span>
  );
}
