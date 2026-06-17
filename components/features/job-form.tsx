"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";
import type { Job } from "@/lib/types";
import type { JobDraft } from "@/agents/agent-job-writer";

type FormState = {
  title: string;
  description: string;
  skills: string[];
  salary_min: string;
  salary_max: string;
  location: string;
  employment_type: string;
  sector: string;
  department: string;
  category: string;
  experience_min_years: string;
};

const EMPTY: FormState = {
  title: "", description: "", skills: [], salary_min: "", salary_max: "",
  location: "", employment_type: "full_time", sector: "", department: "",
  category: "", experience_min_years: "0",
};

export function JobForm({ job, source }: { job?: Job; source?: "manual" | "ai" }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(
    job
      ? {
          title: job.title,
          description: job.description ?? "",
          skills: job.skills,
          salary_min: job.salary_min?.toString() ?? "",
          salary_max: job.salary_max?.toString() ?? "",
          location: job.location ?? "",
          employment_type: job.employment_type,
          sector: job.sector ?? "",
          department: job.department ?? "",
          category: job.category ?? "",
          experience_min_years: job.experience_min_years.toString(),
        }
      : EMPTY
  );
  const [brief, setBrief] = useState("");
  const [skillInput, setSkillInput] = useState("");
  const [suggestion, setSuggestion] = useState<JobDraft | null>(null);
  const [drafted, setDrafted] = useState(source === "ai");
  const [loadingAgent, setLoadingAgent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [usedAI, setUsedAI] = useState(source === "ai");

  const set = (k: keyof FormState, v: string | string[]) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function askAgent(mode: "draft" | "assist") {
    setLoadingAgent(true);
    setError("");
    try {
      const res = await fetch("/api/agents/job-writer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "draft"
            ? { brief }
            : {
                draft: {
                  title: form.title || undefined,
                  description: form.description || undefined,
                  skills: form.skills.length ? form.skills : undefined,
                  location: form.location || undefined,
                  salary_min: form.salary_min ? Number(form.salary_min) : undefined,
                  salary_max: form.salary_max ? Number(form.salary_max) : undefined,
                  sector: form.sector || undefined,
                },
              }
        ),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error del agente");
      setSuggestion(data.output);
      if (mode === "draft") {
        applySuggestionDirect(data.output);
        setDrafted(true);
      }
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setLoadingAgent(false);
    }
  }

  function applySuggestionDirect(s: JobDraft) {
    setForm((f) => ({
      ...f,
      title: s.title || f.title,
      description: s.description || f.description,
      skills: s.skills.length ? s.skills : f.skills,
      salary_min: s.salary_min ? String(s.salary_min) : f.salary_min,
      salary_max: s.salary_max ? String(s.salary_max) : f.salary_max,
      location: s.location || f.location,
      employment_type: s.employment_type || f.employment_type,
      sector: s.sector || f.sector,
      category: s.category || f.category,
      experience_min_years: s.experience_min_years ? String(s.experience_min_years) : f.experience_min_years,
    }));
    setUsedAI(true);
  }

  function applySuggestion(fields?: (keyof JobDraft)[]) {
    if (!suggestion) return;
    const all = !fields;
    setForm((f) => ({
      ...f,
      title: all || fields?.includes("title") ? suggestion.title : f.title,
      description: all || fields?.includes("description") ? suggestion.description : f.description,
      skills: all || fields?.includes("skills") ? suggestion.skills : f.skills,
      salary_min: all || fields?.includes("salary_min") ? String(suggestion.salary_min) : f.salary_min,
      salary_max: all || fields?.includes("salary_max") ? String(suggestion.salary_max) : f.salary_max,
      location: (all && suggestion.location) ? suggestion.location : f.location,
      employment_type: all ? suggestion.employment_type : f.employment_type,
      sector: all || fields?.includes("sector") ? suggestion.sector : f.sector,
      category: all ? suggestion.category : f.category,
      experience_min_years: all ? String(suggestion.experience_min_years) : f.experience_min_years,
    }));
    setUsedAI(true);
    if (all) setSuggestion(null);
  }

  async function save(status: "draft" | "active") {
    setSaving(true);
    setError("");
    try {
      const payload = {
        title: form.title,
        description: form.description || null,
        skills: form.skills,
        salary_min: form.salary_min ? Number(form.salary_min) : null,
        salary_max: form.salary_max ? Number(form.salary_max) : null,
        location: form.location || null,
        employment_type: form.employment_type,
        sector: form.sector || null,
        department: form.department || null,
        category: form.category || null,
        experience_min_years: Number(form.experience_min_years) || 0,
        status,
        source: usedAI ? "ai" : "manual",
      };
      const res = await fetch(job ? `/api/jobs/${job.id}` : "/api/jobs", {
        method: job ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al guardar");
      router.push(`/jobs/${job?.id ?? data.job.id}`);
      router.refresh();
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
      setSaving(false);
    }
  }

  function addSkill() {
    const s = skillInput.trim();
    if (s && !form.skills.includes(s)) set("skills", [...form.skills, s]);
    setSkillInput("");
  }

  const fieldLabel = {
    fontFamily: "'Space Mono',monospace",
    fontSize: "10.5px",
    textTransform: "uppercase" as const,
    letterSpacing: ".5px",
    color: "#79746B",
    marginBottom: "7px",
  };
  const fieldInput = {
    fontFamily: "'Hanken Grotesk',sans-serif",
    fontSize: "13.5px",
    fontWeight: 600,
    color: "#1A1A17",
    background: "#F4F0E8",
    border: "1.5px solid #E7E1D4",
    borderRadius: "10px",
    padding: "10px 13px",
    outline: "none",
    width: "100%",
  } as const;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "16px", alignItems: "start" }}>
      {/* ── left column ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        {/* dark agent panel */}
        <div style={{ background: "#1A1A17", color: "#F4F0E8", borderRadius: "16px", padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "9px", marginBottom: "12px" }}>
            <span style={{ width: "26px", height: "26px", borderRadius: "8px", background: "rgba(198,242,78,.16)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M5 19l1-4 9-9 3 3-9 9-4 1ZM14 6l3 3" stroke="#C6F24E" strokeWidth="2" strokeLinejoin="round"/>
              </svg>
            </span>
            <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "14px" }}>Agente redactor</span>
          </div>
          <div style={{ fontSize: "13px", color: "#CFCAC0", marginBottom: "10px", lineHeight: 1.55 }}>
            Describe el rol en una frase y genero el borrador completo: título, descripción, skills y salario de mercado.
          </div>
          <textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && brief.trim() && askAgent("draft")}
            placeholder='Ej.: Product designer senior para B2B SaaS, remoto, con foco en design systems'
            style={{ width: "100%", resize: "none", height: "62px", fontFamily: "'Hanken Grotesk',sans-serif", fontSize: "13.5px", color: "#1A1A17", background: "#FCFAF6", border: "none", borderRadius: "10px", padding: "11px 13px", outline: "none" }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "12px" }}>
            <button
              onClick={() => askAgent("draft")}
              disabled={!brief.trim() || loadingAgent}
              style={{
                fontFamily: "'Archivo',sans-serif",
                fontWeight: 800,
                fontSize: "13px",
                color: "#1A1A17",
                background: brief.trim() ? "#C6F24E" : "#38352E",
                border: "none",
                borderRadius: "10px",
                padding: "10px 16px",
                cursor: brief.trim() && !loadingAgent ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                opacity: !brief.trim() || loadingAgent ? 0.6 : 1,
              }}
            >
              {loadingAgent && <Loader2 size={13} className="animate-spin" />}
              Generar borrador con IA
            </button>
            <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", color: "#8C877E" }}>
              Edítalo todo después · tú decides
            </span>
          </div>
        </div>

        {/* form card */}
        <div style={{ background: "#FCFAF6", border: "1px solid #E7E1D4", borderRadius: "16px", padding: "22px" }}>
          {drafted && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: "7px", background: "#EAF7C4", border: "1px solid #D6E89A", borderRadius: "999px", padding: "5px 11px", marginBottom: "18px" }}>
              <span style={{ display: "inline-flex", width: "15px", height: "15px", borderRadius: "50%", background: "#C6F24E", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="8" height="8" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.2l2.3 2.3 4.7-5" stroke="#46540F" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </span>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#46540F" }}>Borrador generado · revísalo y ajusta lo que quieras</span>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={fieldLabel}>Título *</div>
              <input
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Senior Frontend Engineer"
                style={fieldInput}
              />
            </div>
            <div>
              <div style={fieldLabel}>Ubicación</div>
              <input
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
                placeholder="Madrid (híbrido)"
                style={fieldInput}
              />
            </div>
            <div>
              <div style={fieldLabel}>Tipo</div>
              <select
                value={form.employment_type}
                onChange={(e) => set("employment_type", e.target.value)}
                style={{ ...fieldInput, cursor: "pointer" }}
              >
                <option value="full_time">Jornada completa</option>
                <option value="part_time">Jornada parcial</option>
                <option value="contract">Temporal / contrato</option>
                <option value="internship">Prácticas</option>
              </select>
            </div>
            <div>
              <div style={fieldLabel}>Salario mín. (€)</div>
              <input type="number" value={form.salary_min} onChange={(e) => set("salary_min", e.target.value)} style={fieldInput} />
            </div>
            <div>
              <div style={fieldLabel}>Salario máx. (€)</div>
              <input type="number" value={form.salary_max} onChange={(e) => set("salary_max", e.target.value)} style={fieldInput} />
            </div>
            <div>
              <div style={fieldLabel}>Exp. mínima (años)</div>
              <input type="number" value={form.experience_min_years} onChange={(e) => set("experience_min_years", e.target.value)} style={fieldInput} />
            </div>
            <div>
              <div style={fieldLabel}>Sector</div>
              <input value={form.sector} onChange={(e) => set("sector", e.target.value)} placeholder="Tecnología" style={fieldInput} />
            </div>
            <div>
              <div style={fieldLabel}>Departamento</div>
              <input value={form.department} onChange={(e) => set("department", e.target.value)} placeholder="Engineering" style={fieldInput} />
            </div>
            <div>
              <div style={fieldLabel}>Categoría</div>
              <input value={form.category} onChange={(e) => set("category", e.target.value)} placeholder="Software" style={fieldInput} />
            </div>
          </div>

          {/* skills */}
          <div style={{ marginTop: "16px" }}>
            <div style={fieldLabel}>Skills requeridas</div>
            <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
              <input
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
                placeholder="Añadir skill y pulsar Enter"
                style={{ ...fieldInput, flex: 1, marginTop: 0 }}
              />
              <button
                type="button"
                onClick={addSkill}
                style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 700, fontSize: "12.5px", color: "#1A1A17", background: "#F4F0E8", border: "1.5px solid #E7E1D4", borderRadius: "10px", padding: "9px 13px", cursor: "pointer" }}
              >
                Añadir
              </button>
            </div>
            {form.skills.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "9px" }}>
                {form.skills.map((s) => (
                  <span key={s} style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "12.5px", fontWeight: 600, background: "#F8F4EB", color: "#54504A", border: "1px solid #E7E1D4", borderRadius: "999px", padding: "5px 10px" }}>
                    {s}
                    <button
                      onClick={() => set("skills", form.skills.filter((x) => x !== s))}
                      style={{ display: "flex", alignItems: "center", color: "#9C9588", background: "none", border: "none", padding: 0, cursor: "pointer" }}
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* description */}
          <div style={{ marginTop: "16px" }}>
            <div style={fieldLabel}>Descripción (Markdown)</div>
            <textarea
              rows={14}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder={"## Sobre el rol\n...\n\n## Responsabilidades\n- ..."}
              style={{ ...fieldInput, resize: "none", lineHeight: 1.55, marginTop: "4px" }}
            />
          </div>

          {error && <p style={{ fontSize: "13px", color: "#BD4332", marginTop: "10px" }}>{error}</p>}

          {/* action buttons */}
          <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
            <button
              onClick={() => save("active")}
              disabled={!form.title.trim() || saving}
              style={{
                fontFamily: "'Archivo',sans-serif",
                fontWeight: 800,
                fontSize: "13px",
                color: "#fff",
                background: form.title.trim() ? "#0E5C4A" : "#C2B8A4",
                border: "2px solid #1A1A17",
                borderRadius: "11px",
                padding: "10px 18px",
                boxShadow: form.title.trim() ? "3px 3px 0 #1A1A17" : "none",
                cursor: form.title.trim() && !saving ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {job ? "Guardar cambios" : "Publicar oferta"}
            </button>
            {!job && (
              <button
                onClick={() => save("draft")}
                disabled={!form.title.trim() || saving}
                style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 600, fontSize: "13px", color: "#79746B", background: "transparent", border: "none", padding: "10px 14px", cursor: "pointer" }}
              >
                Guardar como borrador
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── right rail: suggestions ── */}
      <div style={{ background: "#FCFAF6", border: "1px solid #E7E1D4", borderRadius: "16px", padding: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "14px" }}>
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", textTransform: "uppercase", letterSpacing: ".5px", color: "#79746B" }}>
            Sugerencias del agente
          </div>
          {form.title.trim() && (
            <button
              onClick={() => askAgent("assist")}
              disabled={loadingAgent}
              style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 700, fontSize: "11px", color: "#0E5C4A", background: "#DCEFE4", border: "none", borderRadius: "8px", padding: "5px 10px", cursor: loadingAgent ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "4px" }}
            >
              {loadingAgent && <Loader2 size={10} className="animate-spin" />}
              Actualizar
            </button>
          )}
        </div>

        {suggestion ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* salary range */}
            {(suggestion.salary_min || suggestion.salary_max) && (
              <div>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#0E5C4A", marginBottom: "8px" }}>Rango de mercado</div>
                <div style={{ background: "#F4F0E8", border: "1px solid #E7E1D4", borderRadius: "11px", padding: "12px 13px", marginBottom: "4px" }}>
                  <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: "20px", letterSpacing: "-.5px" }}>
                    {suggestion.salary_min.toLocaleString("es-ES")} – {suggestion.salary_max.toLocaleString("es-ES")} €
                  </div>
                  <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", color: "#79746B", marginTop: "3px" }}>
                    {suggestion.sector || "Mercado"} · {suggestion.employment_type === "full_time" ? "Full-time" : suggestion.employment_type} · España
                  </div>
                </div>
                <button
                  onClick={() => applySuggestion(["salary_min", "salary_max"])}
                  style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", color: "#0E5C4A", textDecoration: "underline", background: "none", border: "none", padding: 0, cursor: "pointer" }}
                >
                  aplicar salario
                </button>
              </div>
            )}

            {/* skills */}
            {suggestion.skills.length > 0 && (
              <div>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#0E5C4A", marginBottom: "8px" }}>Skills sugeridas</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "6px" }}>
                  {suggestion.skills.map((s) => (
                    <span key={s} style={{ fontSize: "11.5px", fontWeight: 600, background: "#EAF7C4", color: "#46540F", border: "1px solid #D6E89A", borderRadius: "999px", padding: "4px 9px", whiteSpace: "nowrap" }}>
                      + {s}
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => applySuggestion(["skills"])}
                  style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", color: "#0E5C4A", textDecoration: "underline", background: "none", border: "none", padding: 0, cursor: "pointer" }}
                >
                  aplicar skills
                </button>
              </div>
            )}

            {/* title/description suggestion */}
            {suggestion.title && (
              <div>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#0E5C4A", marginBottom: "8px" }}>Título sugerido</div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#3A3833", background: "#F4F0E8", border: "1px solid #E7E1D4", borderRadius: "10px", padding: "9px 12px", marginBottom: "4px" }}>
                  {suggestion.title}
                </div>
                <button
                  onClick={() => applySuggestion(["title"])}
                  style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", color: "#0E5C4A", textDecoration: "underline", background: "none", border: "none", padding: 0, cursor: "pointer" }}
                >
                  aplicar título
                </button>
              </div>
            )}

            {suggestion.rationale && (
              <p style={{ fontSize: "12.5px", fontStyle: "italic", color: "#79746B", lineHeight: 1.55, margin: 0 }}>{suggestion.rationale}</p>
            )}

            {/* apply all */}
            <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
              <button
                onClick={() => applySuggestion()}
                style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "12px", color: "#fff", background: "#0E5C4A", border: "2px solid #1A1A17", borderRadius: "9px", padding: "8px 13px", boxShadow: "2px 2px 0 #1A1A17", cursor: "pointer" }}
              >
                Aplicar todo
              </button>
              <button
                onClick={() => setSuggestion(null)}
                style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 600, fontSize: "12px", color: "#79746B", background: "transparent", border: "none", padding: "8px 10px", cursor: "pointer" }}
              >
                Descartar
              </button>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: "13px", color: "#79746B", lineHeight: 1.55 }}>
            Escribe una frase arriba y pulsa <b style={{ color: "#1A1A17" }}>Generar borrador</b>. El agente propone título, descripción, skills y rango salarial de mercado.
          </div>
        )}
      </div>
    </div>
  );
}
