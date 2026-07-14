import type { Metadata } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TalentOS",
  description: "Plataforma de operaciones de talento: ofertas, ATS y HRIS con agentes IA en flujo.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        {children}
        {/* RUM de Core Web Vitals (LCP/CLS/INP) — mide UX de front-end de
            usuarios reales. Ortogonal a la telemetría de agentes (agent_runs). */}
        <SpeedInsights />
      </body>
    </html>
  );
}
