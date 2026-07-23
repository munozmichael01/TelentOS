import type { CSSProperties, ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import type { BoardJob } from "@/lib/job-board/search";
import { formatSalary, relativeDate, isNew, jobSlug } from "@/lib/board/format";
import { ARCHIVO, MONO, CompanyLogo, ModalityTag } from "@/components/board/ui";

// Enlace a la oferta (slug SEO localizado) — compartido por todas las variantes.
function offerHref(job: BoardJob) {
  return { pathname: "/empleos/oferta/[slug]" as const, params: { slug: jobSlug(job) } };
}

/**
 * Card de oferta (variante FULL: board público). Logo, empresa, NUEVO, título, descripción,
 * tags ciudad/modalidad/contrato, salario, fecha y slot de acción (aplicar/guardar).
 * Componente único — el diseño de la card vive aquí, no duplicado por pantalla.
 */
export function JobCard({ job, locale, t, action, save, id, onClick, active, modalityLabel }: {
  job: BoardJob; locale: string;
  t: { new: string; salaryTBD: string };
  action?: ReactNode; // botón aplicar (varía por contexto)
  save?: ReactNode;    // botón guardar
  id?: string;         // ancla para scrollIntoView (navegación por teclado)
  onClick?: (e: React.MouseEvent) => void; // p.ej. seleccionar en el split desktop
  active?: boolean;    // resaltado de la oferta seleccionada (split desktop)
  modalityLabel?: (m: string) => string;   // traduce la modalidad
}) {
  const salary = formatSalary(job, locale);
  return (
    <Link href={offerHref(job)} id={id} onClick={onClick} className={`jb-job${active ? " jb-board-card-active" : ""}`} style={{ display: "block", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 15, color: "inherit" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <CompanyLogo name={job.company?.name} logoUrl={job.company?.logo_url} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ fontFamily: MONO, fontSize: 11, color: "var(--soft)" }}>{job.company?.name}</span>
            {isNew(job.created_at) && <span style={{ fontFamily: MONO, fontSize: 8.5, fontWeight: 700, textTransform: "uppercase", color: "#46540F", background: "var(--limeSoft)", borderRadius: 5, padding: "1px 6px" }}>{t.new}</span>}
          </div>
          <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 16, letterSpacing: "-.3px", lineHeight: 1.15, marginTop: 2 }}>{job.title}</div>
        </div>
        {save}
      </div>
      {job.description && <div style={{ fontSize: 12.5, lineHeight: 1.45, color: "#6B665E", marginTop: 8, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{job.description}</div>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
        {job.city && <MetaTag>{job.city}</MetaTag>}
        {job.modality && <ModalityTag modality={job.modality} label={modalityLabel ? modalityLabel(job.modality) : job.modality} />}
        {job.employment_type && <MetaTag>{job.employment_type}</MetaTag>}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, paddingTop: 11, borderTop: "1px solid var(--line)" }}>
        <div>
          <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 14, color: "var(--brand)" }}>{salary || t.salaryTBD}</div>
          <div style={{ fontFamily: MONO, fontSize: 9.5, color: "var(--soft)", marginTop: 1 }}>{relativeDate(job.created_at, locale)}</div>
        </div>
        {action}
      </div>
    </Link>
  );
}

/** Variante FILA compacta (cuenta, empresa, hub, relacionadas). */
export function JobRow({ job, locale, meta, modalityLabel }: { job: BoardJob; locale: string; meta?: string; modalityLabel?: (m: string) => string }) {
  const salary = formatSalary(job, locale);
  return (
    <Link href={offerHref(job)} className="jb-job" style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 13, padding: 13, color: "inherit" }}>
      <CompanyLogo name={job.company?.name} logoUrl={job.company?.logo_url} size={40} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: MONO, fontSize: 10, color: "var(--soft)" }}>{job.company?.name}{job.city ? ` · ${job.city}` : ""}</div>
        <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 14, letterSpacing: "-.2px", lineHeight: 1.15, marginTop: 2 }}>{job.title}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5 }}>
          {salary && <span style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 12, color: "var(--brand)" }}>{salary}</span>}
          {job.modality && <ModalityTag modality={job.modality} label={modalityLabel ? modalityLabel(job.modality) : job.modality} />}
          {meta && <span style={{ fontFamily: MONO, fontSize: 9.5, color: "var(--soft)" }}>{meta}</span>}
        </div>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}><path d="M9 6l6 6-6 6" stroke="var(--soft)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </Link>
  );
}

function MetaTag({ children }: { children: ReactNode }) {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 600, color: "#54504A", background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 8, padding: "4px 9px" } as CSSProperties}>{children}</span>;
}
