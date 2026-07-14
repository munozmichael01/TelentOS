import type { Metadata } from "next";
import { SpeedInsights } from '@vercel/speed-insights/next';
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
        <SpeedInsights />
      </body>
    </html>
  );
}
