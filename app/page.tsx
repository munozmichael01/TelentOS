"use client";

import { useRef, useState } from "react";
import Link from "next/link";

const PREVIEW_COLS = [
  { name: "Aplicado", dot: "#9C9588", count: 4, cards: [
    { name: "Lucía Fernández", ini: "LF", bg: "#DCEFE4", color: "#0E5C4A", fit: 82, fb: "#D9EFE2", fc: "#0E5C4A" },
    { name: "Pablo Ruiz", ini: "PR", bg: "#F8E7C4", color: "#946312", fit: 71, fb: "#F8E7C4", fc: "#946312" },
  ]},
  { name: "Screening", dot: "#E0A23C", count: 2, cards: [
    { name: "Núria Camps", ini: "NC", bg: "#E7E0F2", color: "#5A4C86", fit: 88, fb: "#D9EFE2", fc: "#0E5C4A" },
  ]},
  { name: "Entrevista", dot: "#3B7FC4", count: 2, cards: [
    { name: "Elena Vidal", ini: "EV", bg: "#D6E4F2", color: "#2B5E8A", fit: 91, fb: "#D9EFE2", fc: "#0E5C4A" },
  ]},
  { name: "Oferta", dot: "#F1543F", count: 1, cards: [
    { name: "Sofía Marín", ini: "SM", bg: "#DCEFE4", color: "#0E5C4A", fit: 95, fb: "#D9EFE2", fc: "#0E5C4A" },
  ]},
];

export default function LandingPage() {
  const howRef = useRef<HTMLElement>(null);
  const ctaRef = useRef<HTMLElement>(null);
  const [form, setForm] = useState({ name: "", company: "", email: "" });
  const [sent, setSent] = useState(false);

  function scrollTo(ref: React.RefObject<HTMLElement>) {
    const el = ref.current;
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: "smooth" });
  }

  function onField(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  return (
    <div style={{ fontFamily: "'Hanken Grotesk',system-ui,sans-serif", color: "#1A1A17", WebkitFontSmoothing: "antialiased", background: "#F4F0E8", backgroundImage: "radial-gradient(rgba(26,26,23,.05) 1.2px, transparent 1.2px)", backgroundSize: "22px 22px", backgroundPosition: "-1px -1px" }}>

      {/* NAV */}
      <div style={{ position: "sticky", top: 0, zIndex: 40, padding: "16px 24px", display: "flex", justifyContent: "center" }}>
        <div style={{ width: "100%", maxWidth: "1180px", display: "flex", alignItems: "center", gap: "18px", background: "rgba(252,250,246,.85)", backdropFilter: "blur(10px)", border: "1px solid #E7E1D4", borderRadius: "16px", padding: "11px 14px 11px 18px", boxShadow: "0 8px 24px -18px rgba(26,26,23,.5)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
            <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: "#0E5C4A", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "2px 2px 0 #1A1A17" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 7l8 4 8-4M4 7l8-4 8 4M4 7v10l8 4 8-4V7M12 11v10" stroke="#C6F24E" strokeWidth="2" strokeLinejoin="round"/></svg>
            </div>
            <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: "18px", letterSpacing: "-.5px" }}>TalentOS</span>
          </div>
          <div style={{ display: "flex", gap: "24px", marginLeft: "14px" }}>
            {["Producto", "La IA", "Recursos"].map((l) => (
              <span key={l} style={{ fontSize: "14px", fontWeight: 600, color: "#79746B", cursor: "pointer" }}>{l}</span>
            ))}
            <span onClick={() => scrollTo(howRef)} style={{ fontSize: "14px", fontWeight: 600, color: "#79746B", cursor: "pointer" }}>Cómo funciona</span>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "12px" }}>
            <Link href="/login" style={{ fontSize: "14px", fontWeight: 700, color: "#79746B", textDecoration: "none" }}>Iniciar sesión</Link>
            <button
              onClick={() => scrollTo(ctaRef)}
              style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "13px", color: "#fff", background: "#F1543F", border: "2px solid #1A1A17", borderRadius: "11px", padding: "9px 15px", boxShadow: "3px 3px 0 #133F35", cursor: "pointer" }}
            >
              Solicitar acceso
            </button>
          </div>
        </div>
      </div>

      {/* HERO */}
      <section style={{ maxWidth: "1100px", margin: "0 auto", padding: "60px 24px 40px", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "#EAF7C4", border: "1px solid #D6E89A", borderRadius: "999px", padding: "6px 14px 6px 10px", marginBottom: "26px" }}>
          <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#C6F24E", boxShadow: "0 0 0 3px rgba(198,242,78,.35)" }} />
          <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "11px", letterSpacing: ".5px", textTransform: "uppercase", color: "#46540F" }}>Operaciones de talento con agentes de IA</span>
        </div>
        <h1 style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: "clamp(46px,7vw,72px)", lineHeight: 0.96, letterSpacing: "-3px", margin: "0 auto 24px", maxWidth: "920px" }}>
          Tu talento, de la oferta al onboarding,{" "}
          <span style={{ fontStyle: "italic", color: "#F1543F" }}>en un solo sistema.</span>
        </h1>
        <p style={{ fontSize: "19px", lineHeight: 1.55, color: "#54504A", maxWidth: "660px", margin: "0 auto" }}>
          TalentOS unifica la creación y distribución de ofertas, el seguimiento de candidatos y el ciclo del empleado. La IA hace el trabajo operativo; tu equipo toma las decisiones que importan.
        </p>
        <div style={{ display: "flex", gap: "13px", justifyContent: "center", marginTop: "32px", flexWrap: "wrap" }}>
          <button
            onClick={() => scrollTo(ctaRef)}
            style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "15px", color: "#fff", background: "#F1543F", border: "2px solid #1A1A17", borderRadius: "13px", padding: "14px 24px", boxShadow: "4px 4px 0 #133F35", cursor: "pointer" }}
          >
            Solicitar acceso anticipado →
          </button>
          <button
            onClick={() => scrollTo(howRef)}
            style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 700, fontSize: "15px", color: "#1A1A17", background: "#FCFAF6", border: "2px solid #1A1A17", borderRadius: "13px", padding: "14px 24px", boxShadow: "4px 4px 0 #133F35", cursor: "pointer" }}
          >
            Ver cómo funciona
          </button>
        </div>
        <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "12px", color: "#79746B", marginTop: "18px" }}>
          Sin tarjeta · Implementación en días, no en meses
        </div>

        {/* pipeline preview */}
        <div style={{ marginTop: "52px", border: "1px solid #E7E1D4", borderRadius: "18px 18px 0 0", background: "#FCFAF6", boxShadow: "0 40px 80px -50px rgba(26,26,23,.6)", overflow: "hidden", textAlign: "left" }}>
          <div style={{ height: "42px", display: "flex", alignItems: "center", gap: "7px", padding: "0 16px", borderBottom: "1px solid #E7E1D4", background: "#F8F4EB" }}>
            <span style={{ width: "11px", height: "11px", borderRadius: "50%", background: "#E6A2A2" }} />
            <span style={{ width: "11px", height: "11px", borderRadius: "50%", background: "#EBCB8E" }} />
            <span style={{ width: "11px", height: "11px", borderRadius: "50%", background: "#A9D3B4" }} />
            <span style={{ margin: "0 auto", fontFamily: "'Space Mono',monospace", fontSize: "11px", color: "#79746B", background: "#FCFAF6", border: "1px solid #E7E1D4", borderRadius: "7px", padding: "3px 14px" }}>
              app.talentos.com/jobs/senior-product-designer
            </span>
          </div>
          <div style={{ padding: "20px", display: "flex", gap: "12px", overflow: "hidden" }}>
            {PREVIEW_COLS.map((col) => (
              <div key={col.name} style={{ width: "200px", flexShrink: 0, background: "#F8F4EB", borderRadius: "12px", padding: "9px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "7px", padding: "3px 5px 9px" }}>
                  <span style={{ width: "7px", height: "7px", borderRadius: "2px", background: col.dot }} />
                  <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "12px" }}>{col.name}</span>
                  <span style={{ marginLeft: "auto", fontFamily: "'Space Mono',monospace", fontSize: "10px", color: "#79746B" }}>{col.count}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                  {col.cards.map((c) => (
                    <div key={c.name} style={{ background: "#FCFAF6", border: "1px solid #E7E1D4", borderRadius: "9px", padding: "8px 9px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                        <span style={{ width: "22px", height: "22px", borderRadius: "50%", background: c.bg, color: c.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", fontWeight: 800 }}>{c.ini}</span>
                        <span style={{ flex: 1, fontSize: "11.5px", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</span>
                        <span style={{ fontSize: "10px", fontWeight: 800, color: c.fc, background: c.fb, borderRadius: "999px", padding: "1px 6px" }}>{c.fit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROBLEMA */}
      <section style={{ maxWidth: "1180px", margin: "0 auto", padding: "60px 24px" }}>
        <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "12px", letterSpacing: "2px", textTransform: "uppercase", color: "#F1543F", marginBottom: "12px" }}>El problema</div>
        <h2 style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: "clamp(32px,4vw,42px)", lineHeight: 1, letterSpacing: "-1.5px", margin: "0 0 10px", maxWidth: "640px" }}>
          Gestionar talento hoy es un <span style={{ fontStyle: "italic" }}>parche tras otro</span>.
        </h2>
        <p style={{ fontSize: "16px", color: "#79746B", maxWidth: "560px", margin: "0 0 36px" }}>
          Cada parte del proceso vive en una herramienta distinta. El equipo de RRHH pierde el día conectándolas a mano.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: "16px" }}>
          {[
            {
              bg: "#F6E0D9", stroke: "#BD4332",
              icon: <path d="M4 4h16v5H4zM4 13h16v7H4z" stroke="#BD4332" strokeWidth="2" strokeLinejoin="round"/>,
              title: "Ofertas publicadas a mano",
              body: "Copias y pegas la misma oferta en cada portal, canal por canal. Y al final nadie sabe cuál de ellos trae mejores candidatos.",
            },
            {
              bg: "#F8E7C4", stroke: "#946312",
              icon: <><circle cx="8" cy="8" r="3" stroke="#946312" strokeWidth="2"/><circle cx="17" cy="11" r="2.3" stroke="#946312" strokeWidth="2"/><path d="M3 19c.6-3 2.6-4.5 5-4.5s4.4 1.5 5 4.5M14.5 19c.3-2 1.4-3 2.8-3" stroke="#946312" strokeWidth="2" strokeLinecap="round"/></>,
              title: "Candidatos dispersos",
              body: "Los CVs en el correo, las valoraciones en un Excel, las decisiones en un chat. Sin un pipeline común, el contexto se pierde.",
            },
            {
              bg: "#E7E0F2", stroke: "#5A4C86",
              icon: <><path d="M12 3l8 4v5c0 4.5-3 7.5-8 9-5-1.5-8-4.5-8-9V7l8-4Z" stroke="#5A4C86" strokeWidth="2" strokeLinejoin="round"/><path d="M9 12.5h6M12 9.5v6" stroke="#5A4C86" strokeWidth="2" strokeLinecap="round"/></>,
              title: "Onboarding sin proceso",
              body: "Cada incorporación se improvisa. Ni checklist, ni trazabilidad, ni datos que sobrevivan al paso de candidato a empleado.",
            },
          ].map(({ bg, title, body, icon }) => (
            <div key={title} style={{ background: "#FCFAF6", border: "1px solid #E7E1D4", borderRadius: "16px", padding: "24px" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">{icon}</svg>
              </div>
              <h3 style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "19px", margin: "0 0 8px" }}>{title}</h3>
              <p style={{ fontSize: "14.5px", lineHeight: 1.55, color: "#79746B", margin: 0 }}>{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SOLUCIÓN */}
      <section ref={howRef} style={{ maxWidth: "1180px", margin: "0 auto", padding: "48px 24px 60px" }}>
        <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "12px", letterSpacing: "2px", textTransform: "uppercase", color: "#F1543F", marginBottom: "12px" }}>La solución</div>
        <h2 style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: "clamp(32px,4vw,42px)", lineHeight: 1, letterSpacing: "-1.5px", margin: "0 0 36px", maxWidth: "720px" }}>
          Un sistema. Tres bloques que <span style={{ fontStyle: "italic", color: "#F1543F" }}>ya hablan entre sí</span>.
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Ofertas */}
          <div style={{ background: "#FCFAF6", border: "1px solid #E7E1D4", borderRadius: "18px", padding: "30px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px", alignItems: "center" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "11px", marginBottom: "14px" }}>
                <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "12px", color: "#79746B" }}>001</span>
                <div style={{ width: "38px", height: "38px", borderRadius: "11px", background: "#DCEFE4", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><rect x="3" y="7" width="18" height="13" rx="2" stroke="#0E5C4A" strokeWidth="2"/><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" stroke="#0E5C4A" strokeWidth="2"/></svg>
                </div>
                <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: "24px", letterSpacing: "-.5px" }}>Ofertas</span>
              </div>
              <p style={{ fontSize: "16px", lineHeight: 1.55, color: "#54504A", margin: "0 0 16px" }}>
                Importa desde cualquier fuente — XML, CSV, una URL — o redacta con IA. Publica en todos tus canales con un clic, sin volver a copiar y pegar.
              </p>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "9px", background: "#EAF7C4", border: "1px solid #D6E89A", borderRadius: "11px", padding: "9px 14px" }}>
                <span style={{ display: "inline-flex", width: "18px", height: "18px", borderRadius: "50%", background: "#C6F24E", alignItems: "center", justifyContent: "center" }}>
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.2l2.3 2.3 4.7-5" stroke="#46540F" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
                <span style={{ fontSize: "13.5px", fontWeight: 700, color: "#46540F" }}>Distribución por canal según presupuesto y objetivo</span>
              </div>
            </div>
            <div style={{ background: "#F8F4EB", border: "1px solid #E7E1D4", borderRadius: "14px", padding: "18px" }}>
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", color: "#79746B", marginBottom: "12px" }}>DISTRIBUCIÓN · 1 OFERTA → 4 CANALES</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
                {[
                  { dot: "#0E5C4A", name: "LinkedIn", cpa: "CPA 18 €" },
                  { dot: "#F1543F", name: "Infojobs", cpa: "CPA 11 €" },
                  { dot: "#E0A23C", name: "Indeed", cpa: "CPA 14 €" },
                  { dot: "#5A4C86", name: "Career site", cpa: "Gratis", cpaColor: "#0E5C4A" },
                ].map(({ dot, name, cpa, cpaColor }) => (
                  <div key={name} style={{ display: "flex", alignItems: "center", gap: "10px", background: "#FCFAF6", border: "1px solid #E7E1D4", borderRadius: "10px", padding: "9px 11px" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: dot, flexShrink: 0 }} />
                    <span style={{ fontSize: "13px", fontWeight: 700, flex: 1 }}>{name}</span>
                    <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "11px", color: cpaColor ?? "#79746B", fontWeight: cpaColor ? 700 : 400 }}>{cpa}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ATS */}
          <div style={{ background: "#FCFAF6", border: "1px solid #E7E1D4", borderRadius: "18px", padding: "30px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px", alignItems: "center" }}>
            <div style={{ order: 2 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "11px", marginBottom: "14px" }}>
                <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "12px", color: "#79746B" }}>002</span>
                <div style={{ width: "38px", height: "38px", borderRadius: "11px", background: "#F6E0D9", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="3" stroke="#F1543F" strokeWidth="2"/><path d="M3.5 19a5.5 5.5 0 0111 0M16 11a3 3 0 100-6M20.5 19a5 5 0 00-4-4.9" stroke="#F1543F" strokeWidth="2" strokeLinecap="round"/></svg>
                </div>
                <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: "24px", letterSpacing: "-.5px" }}>ATS</span>
              </div>
              <p style={{ fontSize: "16px", lineHeight: 1.55, color: "#54504A", margin: "0 0 16px" }}>
                Todos tus candidatos en un pipeline claro. Matching automático contra el perfil de la oferta y trazabilidad de cada decisión del equipo.
              </p>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "9px", background: "#EAF7C4", border: "1px solid #D6E89A", borderRadius: "11px", padding: "9px 14px" }}>
                <span style={{ display: "inline-flex", width: "18px", height: "18px", borderRadius: "50%", background: "#C6F24E", alignItems: "center", justifyContent: "center" }}>
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.2l2.3 2.3 4.7-5" stroke="#46540F" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
                <span style={{ fontSize: "13.5px", fontWeight: 700, color: "#46540F" }}>Fit score y registro de quién movió a quién, y por qué</span>
              </div>
            </div>
            <div style={{ order: 1, background: "#F8F4EB", border: "1px solid #E7E1D4", borderRadius: "14px", padding: "18px" }}>
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", color: "#79746B", marginBottom: "12px" }}>PIPELINE · SENIOR PRODUCT DESIGNER</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {[
                  { ini: "SM", bg: "#DCEFE4", color: "#0E5C4A", name: "Sofía Marín", fit: 95, fb: "#D9EFE2", fc: "#0E5C4A" },
                  { ini: "EV", bg: "#E7E0F2", color: "#5A4C86", name: "Elena Vidal", fit: 91, fb: "#D9EFE2", fc: "#0E5C4A" },
                  { ini: "MO", bg: "#F8E7C4", color: "#946312", name: "Marc Oller", fit: 64, fb: "#F8E7C4", fc: "#946312" },
                ].map((c) => (
                  <div key={c.name} style={{ display: "flex", alignItems: "center", gap: "9px", background: "#FCFAF6", border: "1px solid #E7E1D4", borderRadius: "10px", padding: "9px 11px" }}>
                    <span style={{ width: "26px", height: "26px", borderRadius: "50%", background: c.bg, color: c.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 800 }}>{c.ini}</span>
                    <span style={{ flex: 1, fontSize: "13px", fontWeight: 700 }}>{c.name}</span>
                    <span style={{ fontSize: "11px", fontWeight: 800, color: c.fc, background: c.fb, borderRadius: "999px", padding: "2px 8px" }}>{c.fit}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* HRIS */}
          <div style={{ background: "#FCFAF6", border: "1px solid #E7E1D4", borderRadius: "18px", padding: "30px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px", alignItems: "center" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "11px", marginBottom: "14px" }}>
                <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "12px", color: "#79746B" }}>003</span>
                <div style={{ width: "38px", height: "38px", borderRadius: "11px", background: "#E7E0F2", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="16" rx="2" stroke="#5A4C86" strokeWidth="2"/><circle cx="9" cy="10" r="2" stroke="#5A4C86" strokeWidth="2"/><path d="M6 16c.5-1.8 1.7-2.5 3-2.5s2.5.7 3 2.5M15 9h4M15 13h3" stroke="#5A4C86" strokeWidth="2" strokeLinecap="round"/></svg>
                </div>
                <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: "24px", letterSpacing: "-.5px" }}>HRIS</span>
              </div>
              <p style={{ fontSize: "16px", lineHeight: 1.55, color: "#54504A", margin: "0 0 14px" }}>
                Del candidato al empleado sin recapturar un solo dato. Todo el ciclo del empleado vive en el mismo sistema.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "7px", marginBottom: "16px" }}>
                {["Directorio", "Onboarding", "Timesheets", "Vacaciones", "Documentos"].map((t) => (
                  <span key={t} style={{ fontSize: "12px", fontWeight: 600, background: "#F8F4EB", color: "#54504A", border: "1px solid #E7E1D4", borderRadius: "999px", padding: "5px 11px" }}>{t}</span>
                ))}
              </div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "9px", background: "#EAF7C4", border: "1px solid #D6E89A", borderRadius: "11px", padding: "9px 14px" }}>
                <span style={{ display: "inline-flex", width: "18px", height: "18px", borderRadius: "50%", background: "#C6F24E", alignItems: "center", justifyContent: "center" }}>
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.2l2.3 2.3 4.7-5" stroke="#46540F" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
                <span style={{ fontSize: "13.5px", fontWeight: 700, color: "#46540F" }}>Checklists de onboarding generados para cada rol</span>
              </div>
            </div>
            <div style={{ background: "#F8F4EB", border: "1px solid #E7E1D4", borderRadius: "14px", padding: "18px" }}>
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", color: "#79746B", marginBottom: "12px" }}>ONBOARDING · NINA BAUCH</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {[
                  { done: true, label: "Crear cuenta y accesos" },
                  { done: true, label: "Firmar contrato" },
                  { done: false, label: "Sesión con el equipo", accent: "hoy" },
                ].map(({ done, label, accent }) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: "10px", background: "#FCFAF6", border: "1px solid #E7E1D4", borderRadius: "10px", padding: "9px 11px" }}>
                    <span style={{ width: "18px", height: "18px", borderRadius: "6px", border: `2px solid ${done ? "#0E5C4A" : "#E7E1D4"}`, background: done ? "#0E5C4A" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {done && <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.2l2.3 2.3 4.7-5" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </span>
                    <span style={{ flex: 1, fontSize: "13px", fontWeight: 600, color: done ? "#79746B" : "#1A1A17", textDecoration: done ? "line-through" : "none" }}>{label}</span>
                    {accent && <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", color: "#F1543F" }}>{accent}</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CAREER SITE */}
      <section style={{ maxWidth: "1180px", margin: "0 auto", padding: "8px 24px 60px" }}>
        <div style={{ background: "#FCFAF6", border: "1px solid #E7E1D4", borderRadius: "20px", padding: "34px", display: "grid", gridTemplateColumns: "1fr 1.05fr", gap: "36px", alignItems: "center" }}>
          <div>
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "12px", letterSpacing: "2px", textTransform: "uppercase", color: "#F1543F", marginBottom: "12px" }}>Career site</div>
            <h2 style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: "36px", lineHeight: 1, letterSpacing: "-1.3px", margin: "0 0 14px" }}>
              Tu página de empleo pública, <span style={{ fontStyle: "italic", color: "#F1543F" }}>lista desde el primer día</span>.
            </h2>
            <p style={{ fontSize: "16px", lineHeight: 1.55, color: "#54504A", margin: "0 0 18px" }}>
              Cada empresa tiene su propia página en <code style={{ fontFamily: "'Space Mono',monospace", fontSize: "13.5px", background: "#F8F4EB", border: "1px solid #E7E1D4", borderRadius: "6px", padding: "1px 7px" }}>/careers/tu-empresa</code> con logo, descripción y ofertas activas.
            </p>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "9px", background: "#EAF7C4", border: "1px solid #D6E89A", borderRadius: "11px", padding: "9px 14px" }}>
              <span style={{ display: "inline-flex", width: "18px", height: "18px", borderRadius: "50%", background: "#C6F24E", alignItems: "center", justifyContent: "center" }}>
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.2l2.3 2.3 4.7-5" stroke="#46540F" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </span>
              <span style={{ fontSize: "13.5px", fontWeight: 700, color: "#46540F" }}>Cada candidatura llega con su UTM de origen</span>
            </div>
          </div>
          <div style={{ background: "#F8F4EB", border: "1px solid #E7E1D4", borderRadius: "16px", overflow: "hidden", boxShadow: "0 24px 50px -34px rgba(26,26,23,.4)" }}>
            <div style={{ height: "38px", display: "flex", alignItems: "center", gap: "7px", padding: "0 14px", borderBottom: "1px solid #E7E1D4", background: "#FCFAF6" }}>
              <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#E6A2A2" }} />
              <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#EBCB8E" }} />
              <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#A9D3B4" }} />
              <span style={{ margin: "0 auto", fontFamily: "'Space Mono',monospace", fontSize: "11px", color: "#79746B", background: "#FCFAF6", border: "1px solid #E7E1D4", borderRadius: "7px", padding: "3px 14px" }}>vertice.com/careers</span>
            </div>
            <div style={{ padding: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                <div style={{ width: "46px", height: "46px", borderRadius: "13px", background: "#0E5C4A", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Archivo',sans-serif", fontWeight: 900, color: "#C6F24E", fontSize: "20px" }}>V</div>
                <div>
                  <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: "19px", letterSpacing: "-.4px" }}>Trabaja en Vértice</div>
                  <div style={{ fontSize: "12.5px", color: "#79746B" }}>6 ofertas abiertas · Barcelona y remoto</div>
                </div>
              </div>
              {[
                { title: "Senior Product Designer", meta: "Producto · Madrid · 55–75k €" },
                { title: "Growth Marketing Lead", meta: "Marketing · Remoto · 48–62k €" },
              ].map(({ title, meta }) => (
                <div key={title} style={{ display: "flex", alignItems: "center", gap: "12px", background: "#FCFAF6", border: "1px solid #E7E1D4", borderRadius: "12px", padding: "13px 14px", marginBottom: "9px" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: "14.5px" }}>{title}</div>
                    <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "11px", color: "#79746B", marginTop: "3px" }}>{meta}</div>
                  </div>
                  <button style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "12px", color: "#fff", background: "#F1543F", border: "none", borderRadius: "9px", padding: "8px 14px", cursor: "pointer" }}>Aplicar</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* IA SECTION — dark */}
      <section style={{ background: "#1A1A17", color: "#F4F0E8", padding: "72px 24px" }}>
        <div style={{ maxWidth: "1180px", margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "24px", flexWrap: "wrap", marginBottom: "32px" }}>
            <div style={{ maxWidth: "740px" }}>
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "12px", letterSpacing: "2px", textTransform: "uppercase", color: "#C6F24E", marginBottom: "14px" }}>IA agéntica · integrada en cada flujo</div>
              <h2 style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: "clamp(32px,5vw,46px)", lineHeight: 0.97, letterSpacing: "-1.6px", margin: 0 }}>
                No es un chatbot. Son agentes que trabajan <span style={{ fontStyle: "italic", color: "#C6F24E" }}>dentro</span> de tu operativa.
              </h2>
            </div>
            <p style={{ maxWidth: "330px", fontSize: "15px", lineHeight: 1.6, color: "#B7B2A8" }}>
              Se ocupan del trabajo repetitivo —redactar, analizar, distribuir, organizar— para que tu equipo se centre en lo único que no se automatiza: <span style={{ color: "#F4F0E8", fontWeight: 600 }}>las personas</span>.
            </p>
          </div>

          {/* agente en contexto mockup */}
          <div style={{ background: "#FCFAF6", borderRadius: "18px", overflow: "hidden", marginBottom: "16px", boxShadow: "0 34px 64px -42px rgba(0,0,0,.8)" }}>
            <div style={{ height: "40px", display: "flex", alignItems: "center", gap: "8px", padding: "0 16px", borderBottom: "1px solid #E7E1D4", background: "#F8F4EB" }}>
              <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#E6A2A2" }} />
              <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#EBCB8E" }} />
              <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#A9D3B4" }} />
              <span style={{ marginLeft: "8px", fontFamily: "'Space Mono',monospace", fontSize: "11px", color: "#79746B" }}>Candidatura · Elena Vidal · Senior Product Designer</span>
              <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: "6px", fontFamily: "'Space Mono',monospace", fontSize: "10.5px", color: "#46540F", background: "#EAF7C4", border: "1px solid #D6E89A", borderRadius: "999px", padding: "3px 10px" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#7FB519" }} />Agente activo
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "0.82fr 1.18fr", color: "#1A1A17" }}>
              <div style={{ padding: "20px", borderRight: "1px solid #E7E1D4" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "15px" }}>
                  <span style={{ width: "38px", height: "38px", borderRadius: "50%", background: "#E7E0F2", color: "#5A4C86", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "13px" }}>EV</span>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: "15px" }}>Elena Vidal</div>
                    <div style={{ fontSize: "12px", color: "#79746B" }}>8 años · Producto · Barcelona</div>
                  </div>
                </div>
                <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", color: "#79746B", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: "9px" }}>Skills vs. oferta</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {[
                    { label: "Product Strategy ✓", match: true },
                    { label: "Design Systems ✓", match: true },
                    { label: "Discovery ✓", match: true },
                    { label: "Team Leadership", match: false },
                  ].map(({ label, match }) => (
                    <span key={label} style={{ fontSize: "11.5px", fontWeight: 600, background: match ? "#EAF7C4" : "#F4F0E8", color: match ? "#46540F" : "#A39E94", border: `1px solid ${match ? "#D6E89A" : "#E7E1D4"}`, borderRadius: "999px", padding: "3px 9px" }}>{label}</span>
                  ))}
                </div>
              </div>
              <div style={{ padding: "20px", background: "#FBFDF4" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "11px" }}>
                  <span style={{ width: "24px", height: "24px", borderRadius: "7px", background: "#1A1A17", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M5 19l1-4 9-9 3 3-9 9-4 1ZM14 6l3 3" stroke="#C6F24E" strokeWidth="2" strokeLinejoin="round"/></svg>
                  </span>
                  <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "13.5px", color: "#1A1A17" }}>Agente de análisis</span>
                  <span style={{ marginLeft: "auto", fontSize: "11px", fontWeight: 800, color: "#0E5C4A", background: "#D9EFE2", borderRadius: "999px", padding: "2px 9px" }}>Fit 91</span>
                </div>
                <p style={{ fontSize: "13.5px", lineHeight: 1.55, color: "#3A3833", margin: "0 0 13px" }}>
                  Encaja en 8 de 10 skills. Único gap: liderazgo de squads. Pregunta sugerida: <span style={{ fontWeight: 700 }}>«¿Has liderado equipos multidisciplinares de extremo a extremo?»</span>
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <button style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "12px", color: "#fff", background: "#0E5C4A", border: "none", borderRadius: "9px", padding: "8px 13px", cursor: "pointer" }}>Añadir a la entrevista</button>
                  <button style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 600, fontSize: "12px", color: "#79746B", background: "transparent", border: "1px solid #E7E1D4", borderRadius: "9px", padding: "8px 13px", cursor: "pointer" }}>Descartar</button>
                  <span style={{ marginLeft: "auto", fontFamily: "'Space Mono',monospace", fontSize: "10.5px", color: "#79746B" }}>Tú decides</span>
                </div>
              </div>
            </div>
          </div>

          {/* 4 agent cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: "14px" }}>
            {[
              { where: "En: crear oferta", title: "Agente redactor", body: "Escribe la descripción y define el perfil a partir de un título y cuatro datos.", icon: <path d="M5 19l1-4 9-9 3 3-9 9-4 1ZM14 6l3 3" stroke="#C6F24E" strokeWidth="2" strokeLinejoin="round"/> },
              { where: "En: ficha de candidato", title: "Agente de análisis", body: "Resume el CV, calcula el fit y señala qué conviene preguntar en la entrevista.", icon: <><circle cx="11" cy="11" r="7" stroke="#C6F24E" strokeWidth="2"/><path d="M20 20l-3-3" stroke="#C6F24E" strokeWidth="2" strokeLinecap="round"/></> },
              { where: "En: distribución", title: "Agente de canales", body: "Recomienda dónde invertir según tu presupuesto y si buscas volumen o calidad.", icon: <path d="M4 19V9M10 19V5M16 19v-7M20 19V11" stroke="#C6F24E" strokeWidth="2" strokeLinecap="round"/> },
              { where: "En: alta de empleado", title: "Agente de onboarding", body: "Genera el checklist de incorporación adaptado al rol y al equipo.", icon: <><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" stroke="#C6F24E" strokeWidth="2"/><rect x="9" y="3" width="6" height="4" rx="1" stroke="#C6F24E" strokeWidth="2"/><path d="M8.5 13l2 2 4-4" stroke="#C6F24E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></> },
            ].map(({ where, title, body, icon }) => (
              <div key={title} style={{ background: "#26241F", border: "1px solid #38352E", borderRadius: "16px", padding: "22px" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "11px", background: "rgba(198,242,78,.14)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">{icon}</svg>
                </div>
                <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", letterSpacing: ".5px", textTransform: "uppercase", color: "#C6F24E", marginBottom: "5px" }}>{where}</div>
                <h3 style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "17px", margin: "0 0 6px", color: "#F4F0E8" }}>{title}</h3>
                <p style={{ fontSize: "13.5px", lineHeight: 1.5, color: "#B7B2A8", margin: 0 }}>{body}</p>
              </div>
            ))}
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "10px", marginTop: "24px", background: "rgba(198,242,78,.1)", border: "1px solid rgba(198,242,78,.3)", borderRadius: "999px", padding: "9px 18px" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 3l8 4v5c0 4.5-3 7.5-8 9-5-1.5-8-4.5-8-9V7l8-4Z" stroke="#C6F24E" strokeWidth="2" strokeLinejoin="round"/></svg>
            <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "12px", color: "#C6F24E" }}>Los agentes preparan y proponen. La decisión, siempre tuya.</span>
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section style={{ maxWidth: "1180px", margin: "0 auto", padding: "64px 24px" }}>
        <div style={{ textAlign: "center", fontFamily: "'Space Mono',monospace", fontSize: "12px", letterSpacing: "1.5px", textTransform: "uppercase", color: "#79746B", marginBottom: "26px" }}>
          Equipos que ya ordenan su talento con TalentOS
        </div>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "40px", flexWrap: "wrap", marginBottom: "46px", opacity: 0.75 }}>
          {["Northwind", "Vértice", "Lumina", "Caldera", "Mistral"].map((n) => (
            <div key={n} style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: "22px", letterSpacing: "-.5px", color: "#79746B" }}>{n}</div>
          ))}
        </div>
        <div style={{ maxWidth: "860px", margin: "0 auto", position: "relative", background: "#FCFAF6", border: "1px solid #E7E1D4", borderRadius: "22px", padding: "38px 44px 34px 50px", boxShadow: "0 26px 54px -34px rgba(26,26,23,.42)", overflow: "hidden" }}>
          <span style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: "5px", background: "#F1543F" }} />
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "11px", letterSpacing: "2px", textTransform: "uppercase", color: "#79746B", marginBottom: "16px" }}>Testimonio</div>
          <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "25px", lineHeight: 1.32, letterSpacing: "-.5px" }}>
            Pasamos de cinco herramientas a una. El equipo recuperó <span style={{ color: "#F1543F", fontStyle: "italic" }}>una tarde entera a la semana</span> que antes se iba en copiar datos de un sitio a otro.
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "13px", marginTop: "26px", paddingTop: "20px", borderTop: "1px solid #E7E1D4" }}>
            <span style={{ width: "44px", height: "44px", borderRadius: "50%", background: "linear-gradient(135deg,#8FE3D0,#4FBFA6)", color: "#063D31", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "14px" }}>CR</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: "15px" }}>Clara Ríos</div>
              <div style={{ fontSize: "13px", color: "#79746B" }}>Responsable de People · Vértice (180 empleados)</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section ref={ctaRef} style={{ background: "#0E5C4A", color: "#fff", padding: "76px 24px" }}>
        <div style={{ maxWidth: "960px", margin: "0 auto", display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: "48px", alignItems: "center" }}>
          <div>
            <h2 style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: "clamp(34px,5vw,48px)", lineHeight: 0.98, letterSpacing: "-1.8px", margin: 0 }}>
              Menos herramientas. <span style={{ fontStyle: "italic", color: "#C6F24E" }}>Más foco</span> en las personas.
            </h2>
            <p style={{ fontSize: "16px", lineHeight: 1.55, color: "#CDE5DC", margin: "20px 0 0", maxWidth: "380px" }}>
              Estamos abriendo acceso anticipado a equipos de RRHH de empresas medianas. Déjanos tus datos y te escribimos.
            </p>
          </div>
          <div style={{ background: "#FCFAF6", borderRadius: "20px", padding: "28px", boxShadow: "0 30px 60px -30px rgba(0,0,0,.5)" }}>
            {sent ? (
              <div style={{ textAlign: "center", padding: "24px 8px", color: "#1A1A17" }}>
                <div style={{ width: "54px", height: "54px", borderRadius: "16px", background: "#EAF7C4", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5 9-11" stroke="#46540F" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "20px" }}>¡Estás en la lista!</div>
                <div style={{ fontSize: "14px", color: "#79746B", marginTop: "6px" }}>Te escribiremos a {form.email} en cuanto abramos tu acceso.</div>
              </div>
            ) : (
              <div style={{ color: "#1A1A17" }}>
                <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "18px", marginBottom: "16px" }}>Solicitar acceso anticipado</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "11px" }}>
                  {[
                    { label: "Nombre", name: "name", placeholder: "Tu nombre" },
                    { label: "Empresa", name: "company", placeholder: "Nombre de tu empresa" },
                    { label: "Email de trabajo", name: "email", placeholder: "tu@empresa.com" },
                  ].map(({ label, name, placeholder }) => (
                    <div key={name}>
                      <label style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", textTransform: "uppercase", letterSpacing: ".5px", color: "#79746B", display: "block", marginBottom: "6px" }}>{label}</label>
                      <input
                        name={name}
                        value={(form as Record<string, string>)[name]}
                        onChange={onField}
                        placeholder={placeholder}
                        style={{ width: "100%", fontFamily: "'Hanken Grotesk',sans-serif", fontSize: "15px", color: "#1A1A17", background: "#FCFAF6", border: "1.5px solid #E7E1D4", borderRadius: "11px", padding: "12px 14px", outline: "none", boxSizing: "border-box" }}
                      />
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setSent(true)}
                  style={{ width: "100%", marginTop: "18px", fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "15px", color: "#fff", background: "#F1543F", border: "2px solid #1A1A17", borderRadius: "12px", padding: "13px", boxShadow: "4px 4px 0 #133F35", cursor: "pointer" }}
                >
                  Solicitar acceso →
                </button>
                <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", color: "#79746B", textAlign: "center", marginTop: "12px" }}>Sin compromiso · Te escribimos solo a ti</div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: "#1A1A17", color: "#A8A39A", padding: "40px 24px" }}>
        <div style={{ maxWidth: "1180px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
            <div style={{ width: "26px", height: "26px", borderRadius: "8px", background: "#0E5C4A", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M4 7l8 4 8-4M4 7l8-4 8 4M4 7v10l8 4 8-4V7M12 11v10" stroke="#C6F24E" strokeWidth="2" strokeLinejoin="round"/></svg>
            </div>
            <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: "16px", color: "#F4F0E8" }}>TalentOS</span>
          </div>
          <div style={{ display: "flex", gap: "24px", fontSize: "13px" }}>
            {["Producto", "La IA", "Privacidad", "Contacto"].map((l) => (
              <span key={l} style={{ cursor: "pointer" }}>{l}</span>
            ))}
          </div>
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "11px" }}>© 2026 TalentOS</div>
        </div>
      </footer>
    </div>
  );
}
