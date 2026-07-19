"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

type Tab = "search" | "applications" | "saved" | "alerts" | "profile";

// Navegación inferior del board (candidato). Buscar → board; el resto → cuenta.
// Componente único reutilizable por las pantallas candidato-facing.
export function BoardTabBar({ active }: { active: Tab }) {
  const t = useTranslations("Board.tabs");
  const items: { key: Tab; href: "/empleos" | "/cuenta"; label: string; icon: JSX.Element }[] = [
    { key: "search", href: "/empleos", label: t("search"), icon: <path d="M11 4a7 7 0 105.6 11.2L21 19M18 11a7 7 0 10-14 0 7 7 0 0014 0Z" /> },
    { key: "applications", href: "/cuenta", label: t("applications"), icon: <path d="M4 5h16v14H4zM4 9h16" strokeLinejoin="round" /> },
    { key: "saved", href: "/cuenta", label: t("saved"), icon: <path d="M6 4h12v17l-6-4-6 4V4Z" strokeLinejoin="round" /> },
    { key: "alerts", href: "/cuenta", label: t("alerts"), icon: <><path d="M6 9a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6Z" strokeLinejoin="round" /><path d="M10 19a2 2 0 004 0" /></> },
    { key: "profile", href: "/cuenta", label: t("profile"), icon: <><circle cx="12" cy="8" r="4" /><path d="M5 20c1-4 4.5-5 7-5s6 1 7 5" strokeLinecap="round" /></> },
  ];
  return (
    <nav style={{ position: "fixed", left: 0, right: 0, bottom: 0, height: 64, background: "rgba(252,250,246,.97)", backdropFilter: "blur(10px)", borderTop: "1px solid var(--line)", display: "flex", alignItems: "stretch", padding: "0 6px", zIndex: 28 }}>
      <div style={{ maxWidth: 720, margin: "0 auto", width: "100%", display: "flex" }}>
        {items.map((it) => {
          const on = it.key === active;
          return (
            <Link key={it.key} href={it.href} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, color: on ? "var(--brand)" : "var(--soft)" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">{it.icon}</svg>
              <span style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: on ? 800 : 700, fontSize: 10 }}>{it.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
