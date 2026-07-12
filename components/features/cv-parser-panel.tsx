"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { CvProfile, CvExperience } from "@/agents/agent-cv-parser";

// ── DS icons (line, viewBox 0 0 24 24, strokeWidth 2) ──────────────────────

function IconSparkle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={cn("size-4", className)}>
      <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z"
        stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
function IconSpinner({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden
      className={cn("size-4 animate-spin", className)}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"
        strokeDasharray="28 14" strokeLinecap="round" />
    </svg>
  );
}
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

// ── Types ────────────────────────────────────────────────────────────────────

type EditableProfile = {
  name: string;
  email: string;
  phone: string;
  location: string;
  city: string;
  country_code: string;
  summary: string;
  skills: string[];
  experience_years: number;
  experiences: CvExperience[];
};

type Props = { candidateId: string; hasCv: boolean };

const SENIORITY_OPTIONS = [
  { value: "", label: "Sin especificar" },
  { value: "junior", label: "Junior" },
  { value: "mid", label: "Mid" },
  { value: "senior", label: "Senior" },
  { value: "lead", label: "Lead" },
  { value: "exec", label: "Exec" },
] as const;

// ── Component ────────────────────────────────────────────────────────────────

export function CvParserPanel({ candidateId, hasCv }: Props) {
  const [phase, setPhase] = useState<"idle" | "loading" | "review" | "saving" | "done" | "error">("idle");
  const [aiStatus, setAiStatus] = useState<"ok" | "fallback">("ok");
  const [profile, setProfile] = useState<EditableProfile | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [skillInput, setSkillInput] = useState("");

  if (!hasCv) return null;

  // ── Actions ────────────────────────────────────────────────────────────────

  async function extract() {
    setPhase("loading");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/agents/cv-parser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId }),
      });
      const data = await res.json() as { profile: CvProfile; status: "ok" | "fallback"; error?: string };
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      setAiStatus(data.status);
      setProfile({
        name: data.profile.name ?? "",
        email: data.profile.email ?? "",
        phone: data.profile.phone ?? "",
        location: data.profile.location ?? "",
        city: data.profile.city ?? "",
        country_code: data.profile.country_code ?? "",
        summary: data.profile.summary,
        skills: data.profile.skills,
        experience_years: data.profile.experience_years,
        experiences: data.profile.experiences ?? [],
      });
      setPhase("review");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Error inesperado");
      setPhase("error");
    }
  }

  async function confirm() {
    if (!profile) return;
    setPhase("saving");
    try {
      const res = await fetch(`/api/candidates/${candidateId}/cv-profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.name || null,
          email: profile.email || null,
          phone: profile.phone || null,
          location: profile.location || null,
          city: profile.city || null,
          country_code: profile.country_code || null,
          summary: profile.summary,
          skills: profile.skills,
          experience_years: profile.experience_years,
          experiences: profile.experiences,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(d.error ?? `Error ${res.status}`);
      }
      setPhase("done");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Error al guardar");
      setPhase("error");
    }
  }

  // ── Skill helpers ─────────────────────────────────────────────────────────

  function addSkill() {
    const s = skillInput.trim();
    if (!s || !profile) return;
    if (profile.skills.map(x => x.toLowerCase()).includes(s.toLowerCase())) {
      setSkillInput("");
      return;
    }
    if (profile.skills.length >= 20) return;
    setProfile({ ...profile, skills: [...profile.skills, s] });
    setSkillInput("");
  }

  function removeSkill(s: string) {
    if (!profile) return;
    setProfile({ ...profile, skills: profile.skills.filter((x) => x !== s) });
  }

  // ── Experience helpers ────────────────────────────────────────────────────

  function addExperience() {
    if (!profile) return;
    const blank: CvExperience = {
      title: "", company: null, seniority: null,
      start_date: null, end_date: null, is_current: false,
    };
    setProfile({ ...profile, experiences: [blank, ...profile.experiences] });
  }

  function removeExperience(idx: number) {
    if (!profile) return;
    setProfile({ ...profile, experiences: profile.experiences.filter((_, i) => i !== idx) });
  }

  function updateExperience(idx: number, patch: Partial<CvExperience>) {
    if (!profile) return;
    const updated = profile.experiences.map((e, i) => i === idx ? { ...e, ...patch } : e);
    setProfile({ ...profile, experiences: updated });
  }

  // ── Renders ───────────────────────────────────────────────────────────────

  if (phase === "idle") {
    return (
      <Button variant="soft" size="sm" onClick={extract} className="w-full">
        <IconSparkle />
        Extraer del CV
      </Button>
    );
  }

  if (phase === "loading") {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <IconSpinner />
        Analizando CV…
      </div>
    );
  }

  if (phase === "done") {
    return (
      <p className="text-sm font-semibold text-[#0E5C4A] py-1">
        Perfil actualizado correctamente.
      </p>
    );
  }

  if (phase === "error") {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive">
        <span>{errorMsg ?? "Error desconocido"}</span>
        <button
          onClick={() => setPhase("idle")}
          className="text-muted-foreground underline text-xs hover:text-foreground"
        >
          Reintentar
        </button>
      </div>
    );
  }

  // ── Review panel ──────────────────────────────────────────────────────────

  const busy = phase === "saving";
  const p = profile!;

  const selectClass = cn(
    "flex h-10 w-full rounded-[11px] border-[1.5px] border-[#E7E1D4] bg-[#F4F0E8] px-3 py-2 text-sm",
    "transition-colors focus-visible:outline-none focus-visible:border-[#0E5C4A]",
    "focus-visible:ring-[3px] focus-visible:ring-[#DCEFE4] disabled:opacity-50",
  );

  return (
    <div className="mt-1 rounded-[14px] border border-line bg-surface p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant={aiStatus === "ok" ? "brand" : "secondary"}>
            {aiStatus === "ok" ? "extraído por IA" : "análisis heurístico"}
          </Badge>
          <span className="text-xs text-muted-foreground">Revisa y confirma</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setPhase("idle")} disabled={busy}
          className="h-7 w-7">
          <IconClose />
        </Button>
      </div>

      {/* ── Datos de contacto ─────────────────────────────────────────────── */}
      <fieldset className="space-y-3" disabled={busy}>
        <legend className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
          Contacto
        </legend>
        <div className="space-y-1">
          <Label htmlFor="cvp-name" className="text-xs">Nombre</Label>
          <Input id="cvp-name" value={p.name}
            onChange={(e) => setProfile({ ...p, name: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cvp-email" className="text-xs">Email</Label>
          <Input id="cvp-email" type="email" value={p.email}
            onChange={(e) => setProfile({ ...p, email: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="cvp-phone" className="text-xs">Teléfono</Label>
            <Input id="cvp-phone" value={p.phone}
              onChange={(e) => setProfile({ ...p, phone: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cvp-location" className="text-xs">Ubicación (display)</Label>
            <Input id="cvp-location" value={p.location}
              onChange={(e) => setProfile({ ...p, location: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="cvp-city" className="text-xs">Ciudad</Label>
            <Input id="cvp-city" value={p.city}
              onChange={(e) => setProfile({ ...p, city: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cvp-cc" className="text-xs">País (ISO-2)</Label>
            <Input id="cvp-cc" maxLength={2} placeholder="ES" value={p.country_code}
              onChange={(e) => setProfile({ ...p, country_code: e.target.value.toUpperCase().slice(0, 2) })} />
          </div>
        </div>
      </fieldset>

      {/* ── Perfil profesional ────────────────────────────────────────────── */}
      <fieldset className="space-y-3" disabled={busy}>
        <legend className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
          Perfil
        </legend>
        <div className="space-y-1">
          <Label htmlFor="cvp-years" className="text-xs">Experiencia (años)</Label>
          <Input id="cvp-years" type="number" min={0} max={60} className="w-24"
            value={p.experience_years}
            onChange={(e) => setProfile({ ...p, experience_years: Math.max(0, parseInt(e.target.value) || 0) })} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cvp-summary" className="text-xs">Resumen</Label>
          <Textarea id="cvp-summary" rows={3} value={p.summary}
            onChange={(e) => setProfile({ ...p, summary: e.target.value })} />
        </div>
      </fieldset>

      {/* ── Skills ───────────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Skills{p.skills.length > 0 && <span className="font-normal ml-1">({p.skills.length}/20)</span>}
        </p>
        {p.skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {p.skills.map((s) => (
              <span key={s}
                className="inline-flex items-center gap-1 text-xs bg-[#F4F0E8] border border-line rounded-[6px] pl-2.5 pr-1.5 py-1">
                {s}
                {!busy && (
                  <button type="button" onClick={() => removeSkill(s)}
                    className="text-muted-foreground hover:text-foreground flex items-center">
                    <IconClose className="size-3" />
                  </button>
                )}
              </span>
            ))}
          </div>
        )}
        {p.skills.length < 20 && !busy && (
          <div className="flex gap-1.5">
            <Input placeholder="Añadir skill…" value={skillInput}
              className="h-8 text-xs"
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }} />
            <Button type="button" variant="outline" size="sm" onClick={addSkill} className="h-8 px-2.5">
              <IconPlus />
            </Button>
          </div>
        )}
      </div>

      {/* ── Experiencias ─────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Experiencia laboral
          </p>
          {!busy && p.experiences.length < 8 && (
            <Button type="button" variant="ghost" size="sm" onClick={addExperience}
              className="h-7 text-xs gap-1 px-2">
              <IconPlus className="size-3" />
              Añadir
            </Button>
          )}
        </div>

        {p.experiences.length === 0 && (
          <p className="text-xs text-muted-foreground">Sin experiencias extraídas.</p>
        )}

        <div className="space-y-3">
          {p.experiences.map((exp, idx) => (
            <div key={idx}
              className="rounded-[11px] border border-line bg-[#F4F0E8] p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Cargo</Label>
                      <Input className="h-8 text-xs" value={exp.title} disabled={busy}
                        onChange={(e) => updateExperience(idx, { title: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Empresa</Label>
                      <Input className="h-8 text-xs" value={exp.company ?? ""} disabled={busy}
                        onChange={(e) => updateExperience(idx, { company: e.target.value || null })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Seniority</Label>
                      <select
                        className={cn(selectClass, "h-8 text-xs py-0")}
                        value={exp.seniority ?? ""}
                        disabled={busy}
                        onChange={(e) => updateExperience(idx, {
                          seniority: (e.target.value as CvExperience["seniority"]) || null,
                        })}
                      >
                        {SENIORITY_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Inicio</Label>
                      <Input type="date" className="h-8 text-xs" value={exp.start_date ?? ""} disabled={busy}
                        onChange={(e) => updateExperience(idx, { start_date: e.target.value || null })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Fin</Label>
                      <Input type="date" className="h-8 text-xs"
                        value={exp.end_date ?? ""} disabled={busy || exp.is_current}
                        onChange={(e) => updateExperience(idx, { end_date: e.target.value || null })} />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                    <input type="checkbox" checked={exp.is_current} disabled={busy}
                      className="rounded"
                      onChange={(e) => updateExperience(idx, {
                        is_current: e.target.checked,
                        end_date: e.target.checked ? null : exp.end_date,
                      })} />
                    Trabajo actual
                  </label>
                </div>
                {!busy && (
                  <Button type="button" variant="ghost" size="icon"
                    onClick={() => removeExperience(idx)}
                    className="h-7 w-7 shrink-0 mt-0.5">
                    <IconClose />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Actions ──────────────────────────────────────────────────────── */}
      <div className="flex gap-2 pt-1">
        <Button variant="brand" onClick={confirm} disabled={busy} className="flex-1">
          {busy ? <><IconSpinner />Guardando…</> : "Confirmar y guardar"}
        </Button>
        <Button variant="ghost" onClick={() => setPhase("idle")} disabled={busy}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
