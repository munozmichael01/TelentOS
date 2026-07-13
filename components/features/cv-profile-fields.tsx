"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { LocationAutocomplete } from "@/components/features/location-autocomplete";
import { COUNTRIES, countryName } from "@/lib/countries";
import { COMMON_LANGUAGES, LANGUAGE_LEVELS } from "@/lib/languages";
import { cn } from "@/lib/utils";
import type { EditableCvProfile } from "@/lib/cv-profile";
import type { CvExperience, CvLanguage, CvEducation } from "@/agents/agent-cv-parser";

// ── DS icons (line, viewBox 0 0 24 24) ─────────────────────────────────────

function IconClose({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={cn("size-4", className)}>
      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function IconPlus({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={cn("size-4", className)}>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const SENIORITY_OPTIONS = [
  { value: "", label: "Sin especificar" },
  { value: "junior", label: "Junior" },
  { value: "mid", label: "Mid" },
  { value: "senior", label: "Senior" },
  { value: "lead", label: "Lead" },
  { value: "exec", label: "Exec" },
] as const;

/** Valor centinela del select de idioma para "no está en el catálogo → texto libre". */
const OTHER_LANGUAGE = "__other__";

/** Altura compacta para selects dentro de filas (el NativeSelect base es h-10). */
const compactSelect = "h-8 text-xs px-2";

const sectionLegend = "text-xs font-bold uppercase tracking-widest text-muted-foreground";

type Props = {
  profile: EditableCvProfile;
  onChange: (p: EditableCvProfile) => void;
  disabled?: boolean;
};

/**
 * Editor DS del perfil estructurado de CV. Sin estado propio salvo el input de
 * skill en curso. Compartido por el panel admin y la modal de validación del
 * candidato. Cero style inline para lo que el DS ya cubre.
 */
export function CvProfileFields({ profile: p, onChange, disabled = false }: Props) {
  const [skillInput, setSkillInput] = useState("");
  // Filas de idioma en modo "Otro" (texto libre). Complementa la derivación por
  // catálogo: una fila recién cambiada a "Otro" tiene language === "" y sin esto
  // volvería a renderizarse como select vacío.
  const [otherLangRows, setOtherLangRows] = useState<Set<number>>(new Set());

  // ── Skills ──────────────────────────────────────────────────────────────
  function addSkill() {
    const s = skillInput.trim();
    if (!s) return;
    if (p.skills.map((x) => x.toLowerCase()).includes(s.toLowerCase())) { setSkillInput(""); return; }
    if (p.skills.length >= 20) return;
    onChange({ ...p, skills: [...p.skills, s] });
    setSkillInput("");
  }
  function removeSkill(s: string) {
    onChange({ ...p, skills: p.skills.filter((x) => x !== s) });
  }

  // ── Experiences ─────────────────────────────────────────────────────────
  function addExperience() {
    const blank: CvExperience = { title: "", company: null, seniority: null, start_date: null, end_date: null, is_current: false };
    onChange({ ...p, experiences: [blank, ...p.experiences] });
  }
  function updateExperience(idx: number, patch: Partial<CvExperience>) {
    onChange({ ...p, experiences: p.experiences.map((e, i) => (i === idx ? { ...e, ...patch } : e)) });
  }
  function removeExperience(idx: number) {
    onChange({ ...p, experiences: p.experiences.filter((_, i) => i !== idx) });
  }

  // ── Languages ───────────────────────────────────────────────────────────
  function addLanguage() {
    const blank: CvLanguage = { language: "", level: null };
    onChange({ ...p, languages: [...p.languages, blank] });
  }
  function updateLanguage(idx: number, patch: Partial<CvLanguage>) {
    onChange({ ...p, languages: p.languages.map((l, i) => (i === idx ? { ...l, ...patch } : l)) });
  }
  function removeLanguage(idx: number) {
    // Reindexar el set de filas "Otro": las posteriores a la borrada bajan una posición.
    setOtherLangRows((cur) => {
      const next = new Set<number>();
      cur.forEach((i) => { if (i < idx) next.add(i); else if (i > idx) next.add(i - 1); });
      return next;
    });
    onChange({ ...p, languages: p.languages.filter((_, i) => i !== idx) });
  }

  // ── Education ───────────────────────────────────────────────────────────
  function addEducation() {
    const blank: CvEducation = { degree: "", institution: null, field: null, start_year: null, end_year: null };
    onChange({ ...p, education: [...p.education, blank] });
  }
  function updateEducation(idx: number, patch: Partial<CvEducation>) {
    onChange({ ...p, education: p.education.map((e, i) => (i === idx ? { ...e, ...patch } : e)) });
  }
  function removeEducation(idx: number) {
    onChange({ ...p, education: p.education.filter((_, i) => i !== idx) });
  }

  return (
    <div className="space-y-4">
      {/* ── Contacto ────────────────────────────────────────────────────── */}
      <fieldset className="space-y-3" disabled={disabled}>
        <legend className={cn(sectionLegend, "mb-2")}>Contacto</legend>
        <div className="space-y-1">
          <Label htmlFor="cvp-name" className="text-xs">Nombre</Label>
          <Input id="cvp-name" value={p.name} onChange={(e) => onChange({ ...p, name: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cvp-email" className="text-xs">Email</Label>
          <Input id="cvp-email" type="email" value={p.email} onChange={(e) => onChange({ ...p, email: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cvp-phone" className="text-xs">Teléfono</Label>
          <Input id="cvp-phone" value={p.phone} onChange={(e) => onChange({ ...p, phone: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Ubicación</Label>
          <LocationAutocomplete
            name="cvp-location"
            value={p.location}
            onChange={(v) => onChange({ ...p, location: v })}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="cvp-city" className="text-xs">Ciudad</Label>
            <Input id="cvp-city" value={p.city} onChange={(e) => onChange({ ...p, city: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cvp-cc" className="text-xs">País</Label>
            <NativeSelect id="cvp-cc" value={p.country_code}
              onChange={(e) => onChange({ ...p, country_code: e.target.value })}>
              <option value="">Sin especificar</option>
              {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
              {/* Código extraído fuera del catálogo: se preserva en vez de perderse en silencio */}
              {p.country_code && !COUNTRIES.some((c) => c.code === p.country_code) && (
                <option value={p.country_code}>{countryName(p.country_code)}</option>
              )}
            </NativeSelect>
          </div>
        </div>
      </fieldset>

      {/* ── Perfil ──────────────────────────────────────────────────────── */}
      <fieldset className="space-y-3" disabled={disabled}>
        <legend className={cn(sectionLegend, "mb-2")}>Perfil</legend>
        <div className="space-y-1">
          <Label htmlFor="cvp-years" className="text-xs">Experiencia (años)</Label>
          <Input id="cvp-years" type="number" min={0} max={60} className="w-24"
            value={p.experience_years}
            onChange={(e) => onChange({ ...p, experience_years: Math.max(0, parseInt(e.target.value) || 0) })} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cvp-summary" className="text-xs">Resumen</Label>
          <Textarea id="cvp-summary" rows={3} value={p.summary} onChange={(e) => onChange({ ...p, summary: e.target.value })} />
        </div>
      </fieldset>

      {/* ── Skills ──────────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <p className={sectionLegend}>
          Skills{p.skills.length > 0 && <span className="font-normal ml-1">({p.skills.length}/20)</span>}
        </p>
        {p.skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {p.skills.map((s) => (
              <span key={s} className="inline-flex items-center gap-1 text-xs bg-[#F4F0E8] border border-line rounded-[6px] pl-2.5 pr-1.5 py-1">
                {s}
                {!disabled && (
                  <button type="button" onClick={() => removeSkill(s)} className="text-muted-foreground hover:text-foreground flex items-center">
                    <IconClose className="size-3" />
                  </button>
                )}
              </span>
            ))}
          </div>
        )}
        {p.skills.length < 20 && !disabled && (
          <div className="flex gap-1.5">
            <Input placeholder="Añadir skill…" value={skillInput} className="h-8 text-xs"
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }} />
            <Button type="button" variant="outline" size="sm" onClick={addSkill} className="h-8 px-2.5">
              <IconPlus />
            </Button>
          </div>
        )}
      </div>

      {/* ── Experiencia laboral ─────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className={sectionLegend}>Experiencia laboral</p>
          {!disabled && p.experiences.length < 8 && (
            <Button type="button" variant="ghost" size="sm" onClick={addExperience} className="h-7 text-xs gap-1 px-2">
              <IconPlus className="size-3" />Añadir
            </Button>
          )}
        </div>
        {p.experiences.length === 0 && <p className="text-xs text-muted-foreground">Sin experiencias.</p>}
        <div className="space-y-3">
          {p.experiences.map((exp, idx) => (
            <div key={idx} className="rounded-[11px] border border-line bg-[#F4F0E8] p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Cargo</Label>
                      <Input className="h-8 text-xs" value={exp.title} disabled={disabled}
                        onChange={(e) => updateExperience(idx, { title: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Empresa</Label>
                      <Input className="h-8 text-xs" value={exp.company ?? ""} disabled={disabled}
                        onChange={(e) => updateExperience(idx, { company: e.target.value || null })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Seniority</Label>
                      <NativeSelect className={compactSelect} value={exp.seniority ?? ""} disabled={disabled}
                        onChange={(e) => updateExperience(idx, { seniority: (e.target.value as CvExperience["seniority"]) || null })}>
                        {SENIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </NativeSelect>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Inicio</Label>
                      <Input type="date" className="h-8 text-xs" value={exp.start_date ?? ""} disabled={disabled}
                        onChange={(e) => updateExperience(idx, { start_date: e.target.value || null })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Fin</Label>
                      <Input type="date" className="h-8 text-xs" value={exp.end_date ?? ""} disabled={disabled || exp.is_current}
                        onChange={(e) => updateExperience(idx, { end_date: e.target.value || null })} />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                    <input type="checkbox" checked={exp.is_current} disabled={disabled} className="rounded"
                      onChange={(e) => updateExperience(idx, { is_current: e.target.checked, end_date: e.target.checked ? null : exp.end_date })} />
                    Trabajo actual
                  </label>
                </div>
                {!disabled && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeExperience(idx)} className="h-7 w-7 shrink-0 mt-0.5">
                    <IconClose />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Idiomas ─────────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className={sectionLegend}>Idiomas</p>
          {!disabled && (
            <Button type="button" variant="ghost" size="sm" onClick={addLanguage} className="h-7 text-xs gap-1 px-2">
              <IconPlus className="size-3" />Añadir
            </Button>
          )}
        </div>
        {p.languages.length === 0 && <p className="text-xs text-muted-foreground">Sin idiomas.</p>}
        <div className="space-y-2">
          {p.languages.map((lang, idx) => {
            // "Otro": idioma no vacío que no está en el catálogo, o fila que el
            // usuario cambió explícitamente a texto libre.
            const isOther = otherLangRows.has(idx) || (lang.language !== "" && !(COMMON_LANGUAGES as readonly string[]).includes(lang.language));
            return (
              <div key={idx} className="flex items-end gap-2">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Idioma</Label>
                  <NativeSelect className={compactSelect} disabled={disabled}
                    value={isOther ? OTHER_LANGUAGE : lang.language}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === OTHER_LANGUAGE) {
                        setOtherLangRows((cur) => new Set(cur).add(idx));
                        updateLanguage(idx, { language: "" });
                      } else {
                        setOtherLangRows((cur) => { const next = new Set(cur); next.delete(idx); return next; });
                        updateLanguage(idx, { language: v });
                      }
                    }}>
                    <option value="">Selecciona idioma</option>
                    {COMMON_LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
                    <option value={OTHER_LANGUAGE}>Otro…</option>
                  </NativeSelect>
                </div>
                {isOther && (
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Especifica</Label>
                    <Input className="h-8 text-xs" value={lang.language} disabled={disabled}
                      placeholder="Idioma"
                      onChange={(e) => updateLanguage(idx, { language: e.target.value })} />
                  </div>
                )}
                <div className="w-40 space-y-1">
                  <Label className="text-xs">Nivel</Label>
                  <NativeSelect className={compactSelect} value={lang.level ?? ""} disabled={disabled}
                    onChange={(e) => updateLanguage(idx, { level: (e.target.value as CvLanguage["level"]) || null })}>
                    <option value="">Sin especificar</option>
                    {LANGUAGE_LEVELS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </NativeSelect>
                </div>
                {!disabled && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeLanguage(idx)} className="h-8 w-8 shrink-0">
                    <IconClose />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Educación ───────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className={sectionLegend}>Educación</p>
          {!disabled && (
            <Button type="button" variant="ghost" size="sm" onClick={addEducation} className="h-7 text-xs gap-1 px-2">
              <IconPlus className="size-3" />Añadir
            </Button>
          )}
        </div>
        {p.education.length === 0 && <p className="text-xs text-muted-foreground">Sin formación.</p>}
        <div className="space-y-3">
          {p.education.map((edu, idx) => (
            <div key={idx} className="rounded-[11px] border border-line bg-[#F4F0E8] p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Título</Label>
                      <Input className="h-8 text-xs" value={edu.degree} disabled={disabled}
                        onChange={(e) => updateEducation(idx, { degree: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Institución</Label>
                      <Input className="h-8 text-xs" value={edu.institution ?? ""} disabled={disabled}
                        onChange={(e) => updateEducation(idx, { institution: e.target.value || null })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Área</Label>
                      <Input className="h-8 text-xs" value={edu.field ?? ""} disabled={disabled}
                        onChange={(e) => updateEducation(idx, { field: e.target.value || null })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Año inicio</Label>
                      <Input type="number" min={1950} max={2100} className="h-8 text-xs" value={edu.start_year ?? ""} disabled={disabled}
                        onChange={(e) => updateEducation(idx, { start_year: e.target.value ? parseInt(e.target.value) : null })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Año fin</Label>
                      <Input type="number" min={1950} max={2100} className="h-8 text-xs" value={edu.end_year ?? ""} disabled={disabled}
                        onChange={(e) => updateEducation(idx, { end_year: e.target.value ? parseInt(e.target.value) : null })} />
                    </div>
                  </div>
                </div>
                {!disabled && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeEducation(idx)} className="h-7 w-7 shrink-0 mt-0.5">
                    <IconClose />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
