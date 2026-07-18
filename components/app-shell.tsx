"use client";

import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Toaster } from "@/components/ui/toaster";
import { AssistantHost, AssistantTrigger } from "@/components/features/assistant-host";
import { useEffect, useState } from "react";

/* ── Icon SVGs matching TalentOS App.dc.html exactly ── */
const IconDashboard = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2"/>
    <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2"/>
    <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2"/>
    <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2"/>
  </svg>
);
const IconBriefcase = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="7" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" strokeWidth="2"/>
  </svg>
);
const IconCandidates = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
    <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="2"/>
    <path d="M3.5 19a5.5 5.5 0 0111 0M16 11a3 3 0 100-6M20.5 19a5 5 0 00-4-4.9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);
const IconEmployee = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
    <circle cx="9" cy="10" r="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M6 16c.5-1.8 1.7-2.5 3-2.5s2.5.7 3 2.5M15 9h4M15 13h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);
const IconOrg = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
    <rect x="9" y="3" width="6" height="5" rx="1.5" stroke="currentColor" strokeWidth="2"/>
    <rect x="3" y="16" width="6" height="5" rx="1.5" stroke="currentColor" strokeWidth="2"/>
    <rect x="15" y="16" width="6" height="5" rx="1.5" stroke="currentColor" strokeWidth="2"/>
    <path d="M12 8v4M6 16v-2h12v2" stroke="currentColor" strokeWidth="2"/>
  </svg>
);
const IconVacaciones = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);
const IconCalendar = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M16 2v4M8 2v4M3 10h18M8 15h.01M12 15h.01M16 15h.01M8 19h.01M12 19h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);
const IconHoras = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
    <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);
const IconCompensacion = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);
const IconPayroll = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
    <rect x="2.5" y="5" width="19" height="14" rx="2.5" stroke="currentColor" strokeWidth="2"/>
    <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth="2"/>
    <path d="M6 9v6M18 9v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);
const IconPayRuns = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
    <path d="M5 3h14v18l-2.3-1.5L14.3 21 12 19.5 9.7 21 7.3 19.5 5 21V3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
    <path d="M9 8h6M9 12h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);
const IconPayProfiles = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="8" r="3.4" stroke="currentColor" strokeWidth="2"/>
    <path d="M5.5 20a6.5 6.5 0 0113 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);
const IconSettings = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
    <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" stroke="currentColor" strokeWidth="2"/>
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
  </svg>
);
const IconChannels = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
    <path d="M4 19V9M10 19V5M16 19v-7M20 19V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);
const IconGlobe = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
    <path d="M12 3a15 15 0 010 18M3 12h18M3.5 8h17M3.5 16h17" stroke="currentColor" strokeWidth="2"/>
  </svg>
);
const IconBell = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M6 9a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
    <path d="M10 19a2 2 0 004 0" stroke="currentColor" strokeWidth="2"/>
  </svg>
);
const IconHelp = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
    <path d="M9.5 9.5a2.5 2.5 0 114 2c-1 .7-1.5 1.2-1.5 2.5M12 17.5h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);
const IconPanel = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M9 4v16" stroke="currentColor" strokeWidth="2"/>
  </svg>
);
const LogoMark = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
    <path d="M4 7l8 4 8-4M4 7l8-4 8 4M4 7v10l8 4 8-4V7M12 11v10" stroke="#C6F24E" strokeWidth="2" strokeLinejoin="round"/>
  </svg>
);

type Role = "owner" | "hr_admin" | "recruiter" | "manager" | "employee";
type NavSection = { section: string; brand?: boolean };

// roles that can see each nav item; omit key = visible to all roles
const NAV_ROLES: Record<string, Role[]> = {
  // reclutamiento — manager no tiene acceso al pipeline de selección
  "/app/jobs":               ["owner", "hr_admin", "recruiter"],
  "/app/candidates":         ["owner", "hr_admin", "recruiter"],
  "/app/career-site":        ["owner", "hr_admin", "recruiter"],
  "/app/canales":            ["owner", "hr_admin", "recruiter"],
  // personas — manager solo ve su equipo (scoping via RLS en backend)
  "/app/timeoff":            ["owner", "hr_admin", "manager"],
  "/app/timeoff/calendar":   ["owner", "hr_admin", "manager"],
  "/app/horas":              ["owner", "hr_admin", "manager"],
  // sensibles — solo admin
  "/app/horas/compensacion": ["owner", "hr_admin"],
  // payroll — solo owner/hr_admin (datos financieros sensibles)
  "/app/payroll":            ["owner", "hr_admin"],
  "/app/payroll/runs":       ["owner", "hr_admin"],
  "/app/payroll/profiles":   ["owner", "hr_admin"],
  "/app/settings":           ["owner", "hr_admin"],
  "/app/settings/team":      ["owner"],
  "/app/settings/billing":   ["owner"],
  "/app/settings/compliance": ["owner", "hr_admin"],
  "/app/settings/payroll":    ["owner", "hr_admin"],
  "/app/settings/skills":     ["owner", "hr_admin", "recruiter"],
};

const ALL_NAV = [
  { href: "/app/dashboard",          label: "Dashboard",    Icon: IconDashboard },
  { section: "Reclutamiento" },
  { href: "/app/jobs",               label: "Ofertas",      Icon: IconBriefcase },
  { href: "/app/candidates",         label: "Candidatos",   Icon: IconCandidates },
  { href: "/app/career-site",        label: "Career Site",  Icon: IconGlobe },
  { href: "/app/canales",            label: "Canales",      Icon: IconChannels },
  { section: "Personas" },
  { href: "/app/employees",          label: "Empleados",    Icon: IconEmployee },
  { href: "/app/org",                label: "Organigrama",  Icon: IconOrg },
  { href: "/app/timeoff",            label: "Ausencias",    Icon: IconVacaciones },
  { href: "/app/timeoff/calendar",   label: "Calendario",   Icon: IconCalendar },
  { href: "/app/horas",              label: "Horas",        Icon: IconHoras },
  { href: "/app/horas/compensacion", label: "Banco de horas", Icon: IconCompensacion },
  { section: "Payroll", brand: true },
  { href: "/app/payroll",          label: "Payroll",             Icon: IconPayroll },
  { href: "/app/payroll/runs",     label: "Pay Runs",            Icon: IconPayRuns },
  { href: "/app/payroll/profiles", label: "Perfiles salariales", Icon: IconPayProfiles },
  { section: "Ajustes" },
  {
    href: "/app/settings",
    label: "Ajustes",
    Icon: IconSettings,
    children: [
      { href: "/app/settings",            label: "Empresa" },
      { href: "/app/settings/team",       label: "Equipo" },
      { href: "/app/settings/billing",    label: "Billing" },
      { href: "/app/settings/absences",   label: "Ausencias" },
      { href: "/app/settings/schedules",  label: "Horarios" },
      { href: "/app/settings/compliance", label: "Compliance" },
      { href: "/app/settings/payroll",    label: "Payroll" },
      { href: "/app/settings/skills",     label: "Skills" },
    ],
  },
];

function buildNav(role: Role | null) {
  const effectiveRole = role ?? "employee";
  return ALL_NAV.flatMap((item) => {
    if ("section" in item) return [item];
    const allowed = NAV_ROLES[item.href];
    if (allowed && !allowed.includes(effectiveRole)) return [];
    if ("children" in item && item.children) {
      const visibleChildren = item.children.filter((c) => {
        const childAllowed = NAV_ROLES[c.href];
        return !childAllowed || childAllowed.includes(effectiveRole);
      });
      return [{ ...item, children: visibleChildren }];
    }
    return [item];
  }).filter((item, i, arr) => {
    // drop orphan section headers (section with no items after it before next section)
    if (!("section" in item)) return true;
    const next = arr[i + 1];
    return next && !("section" in next);
  });
}

function initials(nameOrEmail: string) {
  const parts = nameOrEmail.split("@")[0].split(/[._\-\s]+/).filter(Boolean);
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || nameOrEmail[0]?.toUpperCase() || "?";
}

export function AppShell({
  children,
  userRole,
}: {
  children: React.ReactNode;
  userRole?: Role | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const NAV = buildNav(userRole ?? null);

  // Restore collapsed state from localStorage after mount
  useEffect(() => {
    const stored = localStorage.getItem("sidebar-collapsed");
    if (stored === "true") setCollapsed(true);
  }, []);

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? "");
      const meta = data.user?.user_metadata ?? {};
      setUserName((meta.full_name as string) || (meta.name as string) || "");
    });
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
    if (pathname.startsWith("/app/settings")) setSettingsOpen(true);
  }, [pathname]);

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function toggleCollapsed() {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem("sidebar-collapsed", String(next));
      return next;
    });
  }

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    if (pathname === href) return true;
    if (!pathname.startsWith(href + "/")) return false;
    const hasChildMatch = ALL_NAV.some((item) => {
      if (!("href" in item) || !item.href) return false;
      const h = item.href as string;
      return h !== href && h.startsWith(href + "/") && (pathname === h || pathname.startsWith(h + "/"));
    });
    return !hasChildMatch;
  }

  const sidebarClass = cn("app-sidebar", sidebarOpen && "open", collapsed && "collapsed");

  return (
    <div className="app-outer" style={{ background: "#ECEAE4", minHeight: "100vh", padding: "26px", WebkitFontSmoothing: "antialiased" }}>
      <Toaster />
      <AssistantHost />
      <div style={{ maxWidth: "1320px", margin: "0 auto" }}>
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(26,26,23,.45)", zIndex: 49 }}
          />
        )}
        {/* app container — fixed height so only content area scrolls */}
        <div className="app-container" style={{
          display: "flex",
          border: "1px solid #E7E1D4",
          borderRadius: "18px",
          overflow: "hidden",
          background: "#F4F0E8",
          boxShadow: "0 24px 50px -28px rgba(26,26,23,.3)",
          height: "calc(100vh - 52px)",
        }}>

          {/* ── SIDEBAR ── */}
          <aside className={sidebarClass} style={{ flexShrink: 0, background: "#FCFAF6", borderRight: "1px solid #E7E1D4", display: "flex", flexDirection: "column" }}>
            {/* logo row */}
            <div className="sb-header" style={{ height: "62px", display: "flex", alignItems: "center", gap: "10px", padding: "0 18px", borderBottom: "1px solid #E7E1D4" }}>
              <div style={{ width: "30px", height: "30px", borderRadius: "9px", background: "#0E5C4A", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "2px 2px 0 #1A1A17", flexShrink: 0 }}>
                <LogoMark />
              </div>
              <span className="nav-label" style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 900, fontSize: "18px", letterSpacing: "-.5px" }}>TalentOS</span>
              <button
                className="app-sidebar-close"
                onClick={() => setSidebarOpen(false)}
                style={{ marginLeft: "auto", width: "28px", height: "28px", borderRadius: "8px", border: "none", background: "#F4F0E8", color: "#79746B", cursor: "pointer", alignItems: "center", justifyContent: "center" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
              </button>
            </div>

            {/* nav */}
            <nav style={{ flex: 1, overflowY: "auto", padding: "12px 12px 8px" }}>
              {NAV.map((item, i) => {
                if ("section" in item) {
                  const isBrand = (item as NavSection).brand;
                  return (
                    <div key={i} className="nav-section" style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", letterSpacing: "1.5px", textTransform: "uppercase", color: isBrand ? "#0E5C4A" : "#79746B", padding: "14px 10px 6px", display: "flex", alignItems: "center", gap: "6px" }}>
                      {item.section}
                      {isBrand && <span className="nav-label" style={{ flex: 1, height: "1px", background: "#DCEFE4" }}/>}
                    </div>
                  );
                }
                const active = isActive(item.href);
                const hasChildren = "children" in item && item.children;

                if (hasChildren) {
                  const isOpen = settingsOpen;
                  return (
                    <div key={item.href}>
                      <button
                        onClick={() => setSettingsOpen((o) => !o)}
                        className="nav-item"
                        title={item.label}
                        style={{
                          width: "100%", background: "none", border: "none",
                          cursor: "pointer", justifyContent: "space-between",
                        }}
                      >
                        <span style={{ display: "flex", alignItems: "center", gap: "11px" }}>
                          <item.Icon />
                          <span className="nav-label">{item.label}</span>
                        </span>
                        <svg
                          className="nav-label"
                          width="13" height="13" viewBox="0 0 24 24" fill="none"
                          style={{ flexShrink: 0, transition: "transform .2s", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                        >
                          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                      {isOpen && (
                        <div className="nav-submenu" style={{ marginLeft: "14px", marginTop: "2px", borderLeft: "2px solid #E7E1D4", paddingLeft: "10px", marginBottom: "4px" }}>
                          {item.children!.map((child) => {
                            const childActive = pathname === child.href;
                            return (
                              <Link
                                key={child.href}
                                href={child.href}
                                className="nav-item"
                                style={{
                                  fontSize: "13px",
                                  padding: "6px 10px",
                                  ...(childActive ? { background: "#EFEBE1", color: "#0E5C4A", fontWeight: 700 } : {}),
                                }}
                              >
                                {child.label}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="nav-item"
                    title={item.label}
                    style={active ? { background: "#0E5C4A", color: "#fff", boxShadow: "2px 2px 0 #1A1A17" } : undefined}
                  >
                    <item.Icon />
                    <span className="nav-label">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* collapse toggle */}
            <div style={{ padding: "8px 12px", borderTop: "1px solid #E7E1D4" }}>
              <button
                onClick={toggleCollapsed}
                className="nav-item"
                title={collapsed ? "Expandir menú" : "Contraer menú"}
                style={{ width: "100%", background: "none", border: "none", cursor: "pointer" }}
              >
                <IconPanel />
                <span className="nav-label">{collapsed ? "Expandir menú" : "Contraer menú"}</span>
              </button>
            </div>

            {/* user footer */}
            <div className="sb-footer" style={{ padding: "12px", borderTop: "1px solid #E7E1D4", display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "linear-gradient(135deg,#8FE3D0,#4FBFA6)", color: "#063D31", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "12px", flexShrink: 0 }}>
                {initials(userName || userEmail)}
              </div>
              <div className="nav-label" style={{ minWidth: 0 }}>
                <div style={{ fontSize: "13px", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{userName || userEmail || "…"}</div>
                <button
                  onClick={signOut}
                  style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#79746B", background: "none", border: "none", padding: 0, cursor: "pointer" }}
                >
                  <LogOut size={11} />
                  Cerrar sesión
                </button>
              </div>
            </div>
          </aside>

          {/* ── MAIN ── */}
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* topbar */}
            <div style={{ height: "62px", flexShrink: 0, display: "flex", alignItems: "center", gap: "14px", padding: "0 22px", borderBottom: "1px solid #E7E1D4", background: "#FCFAF6" }}>
              <button
                className="app-hamburger"
                onClick={() => setSidebarOpen(true)}
                style={{ alignItems: "center", justifyContent: "center", width: "36px", height: "36px", borderRadius: "10px", border: "none", background: "#F4F0E8", color: "#1A1A17", cursor: "pointer", flexShrink: 0 }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
              </button>
              <div className="app-topbar-search" style={{ display: "flex", alignItems: "center", gap: "9px", background: "#F4F0E8", border: "1px solid #E7E1D4", borderRadius: "11px", padding: "8px 13px", width: "300px", maxWidth: "40%" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <circle cx="11" cy="11" r="7" stroke="#79746B" strokeWidth="2"/>
                  <path d="M20 20l-3.5-3.5" stroke="#79746B" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <span style={{ fontSize: "13px", color: "#79746B" }}>Buscar…</span>
                <span style={{ marginLeft: "auto", fontFamily: "'Space Mono',monospace", fontSize: "10px", color: "#79746B", border: "1px solid #E7E1D4", borderRadius: "5px", padding: "1px 5px" }}>⌘K</span>
              </div>
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "6px" }}>
                <AssistantTrigger />
                <button style={{ width: "36px", height: "36px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", color: "#79746B", background: "none", border: "none", cursor: "pointer" }}>
                  <IconBell />
                </button>
                <button style={{ width: "36px", height: "36px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", color: "#79746B", background: "none", border: "none", cursor: "pointer" }}>
                  <IconHelp />
                </button>
                <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: "linear-gradient(135deg,#8FE3D0,#4FBFA6)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "12px", color: "#063D31", marginLeft: "4px" }}>
                  {initials(userName || userEmail)}
                </div>
              </div>
            </div>

            {/* content — only this area scrolls */}
            <div
              className="app-content"
              style={{
                flex: 1,
                overflow: "auto",
                padding: "28px",
                background: "radial-gradient(120% 90% at 100% 0%, #F7F3EB 0%, #F4F0E8 55%)",
              }}
            >
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
