"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
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
const IconSettings = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="2"/>
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
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
const LogoMark = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
    <path d="M4 7l8 4 8-4M4 7l8-4 8 4M4 7v10l8 4 8-4V7M12 11v10" stroke="#C6F24E" strokeWidth="2" strokeLinejoin="round"/>
  </svg>
);

const NAV = [
  { href: "/dashboard",          label: "Dashboard",    Icon: IconDashboard },
  { section: "Reclutamiento" },
  { href: "/jobs",               label: "Ofertas",      Icon: IconBriefcase },
  { href: "/candidates",         label: "Candidatos",   Icon: IconCandidates },
  { section: "Personas" },
  { href: "/employees",          label: "Empleados",    Icon: IconEmployee },
  { href: "/org",                label: "Organigrama",  Icon: IconOrg },
  { href: "/timeoff",            label: "Ausencias",    Icon: IconVacaciones },
  { href: "/timeoff/calendar",   label: "Calendario",   Icon: IconCalendar },
  { href: "/horas",              label: "Horas",        Icon: IconHoras },
  { href: "/horas/compensacion", label: "Compensación", Icon: IconCompensacion },
  { section: "Workspace" },
  { href: "/settings",           label: "Ajustes",      Icon: IconSettings },
] as const;

function initials(email: string) {
  const parts = email.split("@")[0].split(/[._-]/);
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || email[0]?.toUpperCase() || "?";
}

export function AppShell({
  children,
  careersSlug,
}: {
  children: React.ReactNode;
  careersSlug?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? "");
    });
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    if (pathname === href) return true;
    if (!pathname.startsWith(href + "/")) return false;
    // Don't mark parent active when a more-specific sibling nav item matches
    const hasChildMatch = NAV.some(
      (item) =>
        "href" in item &&
        item.href !== href &&
        item.href.startsWith(href + "/") &&
        (pathname === item.href || pathname.startsWith(item.href + "/"))
    );
    return !hasChildMatch;
  }

  return (
    /* outer page */
    <div className="app-outer" style={{ background: "#ECEAE4", minHeight: "100vh", padding: "26px", WebkitFontSmoothing: "antialiased" }}>
      <div style={{ maxWidth: "1320px", margin: "0 auto" }}>
        {/* Mobile overlay — close sidebar when tapping outside */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(26,26,23,.45)", zIndex: 49 }}
          />
        )}
        {/* app container */}
        <div className="app-container" style={{
          display: "flex",
          border: "1px solid #E7E1D4",
          borderRadius: "18px",
          overflow: "hidden",
          background: "#F4F0E8",
          boxShadow: "0 24px 50px -28px rgba(26,26,23,.3)",
          minHeight: "calc(100vh - 52px)",
        }}>

          {/* ── SIDEBAR ── */}
          <aside className={`app-sidebar${sidebarOpen ? " open" : ""}`} style={{ width: "234px", flexShrink: 0, background: "#FCFAF6", borderRight: "1px solid #E7E1D4", display: "flex", flexDirection: "column" }}>
            {/* logo row */}
            <div style={{ height: "62px", display: "flex", alignItems: "center", gap: "10px", padding: "0 18px", borderBottom: "1px solid #E7E1D4" }}>
              <div style={{ width: "30px", height: "30px", borderRadius: "9px", background: "#0E5C4A", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "2px 2px 0 #1A1A17" }}>
                <LogoMark />
              </div>
              <span style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 900, fontSize: "18px", letterSpacing: "-.5px" }}>TalentOS</span>
              {/* Close button — only shown on mobile via CSS */}
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
                  return (
                    <div key={i} style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", letterSpacing: "1.5px", textTransform: "uppercase", color: "#79746B", padding: "14px 10px 6px" }}>
                      {item.section}
                    </div>
                  );
                }
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="nav-item"
                    style={active ? { background: "#0E5C4A", color: "#fff", boxShadow: "2px 2px 0 #1A1A17" } : undefined}
                  >
                    <item.Icon />
                    {item.label}
                  </Link>
                );
              })}
              {careersSlug && (
                <a
                  href={`/careers/${careersSlug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="nav-item"
                >
                  <IconGlobe />
                  Career site ↗
                </a>
              )}
            </nav>

            {/* user footer */}
            <div style={{ padding: "12px", borderTop: "1px solid #E7E1D4", display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "linear-gradient(135deg,#8FE3D0,#4FBFA6)", color: "#063D31", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "12px", flexShrink: 0 }}>
                {initials(userEmail)}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: "13px", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{userEmail || "…"}</div>
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
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
            {/* topbar */}
            <div style={{ height: "62px", flexShrink: 0, display: "flex", alignItems: "center", gap: "14px", padding: "0 22px", borderBottom: "1px solid #E7E1D4", background: "#FCFAF6" }}>
              {/* Hamburger — only shown on mobile via CSS */}
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
                <button style={{ width: "36px", height: "36px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", color: "#79746B", background: "none", border: "none", cursor: "pointer" }}>
                  <IconBell />
                </button>
                <button style={{ width: "36px", height: "36px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", color: "#79746B", background: "none", border: "none", cursor: "pointer" }}>
                  <IconHelp />
                </button>
                <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: "linear-gradient(135deg,#8FE3D0,#4FBFA6)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "12px", color: "#063D31", marginLeft: "4px" }}>
                  {initials(userEmail)}
                </div>
              </div>
            </div>

            {/* content */}
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
