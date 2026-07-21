import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { BoardRoot, BoardContainer, ARCHIVO, MONO, CompanyLogo } from "@/components/board/ui";
import { BoardTabBar } from "@/components/board/tab-bar";

// Índice de empresas con ofertas activas (destino del nav "Empresas" del board). SSR/SEO.
export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "Board" });
  return { title: `${t("nav.companies")} · TalentOS` };
}

export default async function CompaniesPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const t = await getTranslations({ locale: params.locale, namespace: "Board" });
  const supabase = createClient();

  // Derivamos las empresas de las ofertas activas (lectura anon permitida por RLS) y
  // contamos ofertas por empresa. A escala se sustituye por un conteo en DB.
  const { data: rows } = await supabase
    .from("jobs")
    .select("company:companies(id, name, slug, logo_url)")
    .eq("status", "active")
    .limit(1000);

  const map = new Map<string, { id: string; name: string; slug: string | null; logo_url: string | null; count: number }>();
  for (const r of rows ?? []) {
    const c = (r as unknown as { company: { id: string; name: string; slug: string | null; logo_url: string | null } | null }).company;
    if (!c?.id) continue;
    const cur = map.get(c.id);
    if (cur) cur.count++;
    else map.set(c.id, { ...c, count: 1 });
  }
  const companies = Array.from(map.values()).sort((a, b) => b.count - a.count);

  return (
    <BoardRoot>
      <header style={{ position: "sticky", top: 0, zIndex: 20, background: "rgba(244,240,232,.94)", backdropFilter: "blur(8px)", borderBottom: "1px solid var(--line)", padding: "12px 16px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", alignItems: "center", gap: 9 }}>
          <Link href="/empleos" style={{ display: "flex", alignItems: "center", gap: 9, color: "var(--ink)" }}>
            <span style={{ width: 28, height: 28, borderRadius: 8, background: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "2px 2px 0 var(--ink)" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 7l8 4 8-4M4 7l8-4 8 4M4 7v10l8 4 8-4V7M12 11v10" stroke="#C6F24E" strokeWidth="2" strokeLinejoin="round" /></svg>
            </span>
            <span style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 16, letterSpacing: "-.5px" }}>TalentOS <span style={{ color: "var(--brand)" }}>{t("brand")}</span></span>
          </Link>
        </div>
      </header>
      <BoardContainer style={{ maxWidth: 960, padding: "22px 16px 84px" }}>
        <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: 1.5, textTransform: "uppercase", color: "var(--brand)", marginBottom: 8 }}>{t("nav.companies")}</div>
        <h1 style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 30, lineHeight: 1, letterSpacing: "-1.2px", margin: "0 0 20px" }}>{t("companies.title", { count: companies.length })}</h1>
        {companies.length === 0 ? (
          <p style={{ color: "var(--soft)", fontSize: 14 }}>{t("companies.empty")}</p>
        ) : (
          <div style={{ display: "grid", gap: 11, gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))" }}>
            {companies.map((c) => (
              c.slug ? (
                <Link key={c.id} href={{ pathname: "/empleos/empresa/[slug]", params: { slug: c.slug } }} className="jb-job" style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, padding: 14, color: "inherit" }}>
                  <CompanyLogo name={c.name} logoUrl={c.logo_url} size={44} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 15, letterSpacing: "-.3px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
                    <div style={{ fontFamily: MONO, fontSize: 10.5, color: "var(--brand)", marginTop: 2 }}>{t("companies.openings", { count: c.count })}</div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="var(--soft)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </Link>
              ) : (
                <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, padding: 14 }}>
                  <CompanyLogo name={c.name} logoUrl={c.logo_url} size={44} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 15, letterSpacing: "-.3px" }}>{c.name}</div>
                    <div style={{ fontFamily: MONO, fontSize: 10.5, color: "var(--brand)", marginTop: 2 }}>{t("companies.openings", { count: c.count })}</div>
                  </div>
                </div>
              )
            ))}
          </div>
        )}
      </BoardContainer>
      <BoardTabBar active="search" />
    </BoardRoot>
  );
}
