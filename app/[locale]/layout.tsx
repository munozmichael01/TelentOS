import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { routing, type Locale } from "@/i18n/routing";
import "../globals.css";

export const metadata: Metadata = {
  title: "TalentOS",
  description: "Plataforma de operaciones de talento: ofertas, ATS y HRIS con agentes IA en flujo.",
};

// Pre-renderiza estáticamente cada locale.
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const { locale } = params;
  if (!routing.locales.includes(locale as Locale)) notFound();
  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
        {/* RUM de Core Web Vitals (LCP/CLS/INP) — mide UX de front-end de
            usuarios reales. Ortogonal a la telemetría de agentes (agent_runs). */}
        <SpeedInsights />
      </body>
    </html>
  );
}
