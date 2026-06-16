"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles, Wand2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AgentHint } from "@/components/agent-hint";
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

/**
 * Formulario de oferta con el agente job-writer integrado en flujo:
 *  - "Generar borrador": brief corto → borrador completo.
 *  - "Sugerencias del agente": con el estado actual del formulario, propone
 *    título/skills/salario/descr.; el usuario aplica cada sugerencia o todas.
 * El agente nunca guarda: solo rellena el formulario y el humano confirma.
 */
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
  const [agentMode, setAgentMode] = useState<"ok" | "fallback" | null>(null);
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
      setAgentMode(data.status);
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setLoadingAgent(false);
    }
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

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-4">
        {!job && (
          <Card className="border-primary/30">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Wand2 className="h-4 w-4 text-primary" />
                Generar borrador con IA
              </CardTitle>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Input
                placeholder='Describe el rol en una frase: "SDR junior para Barcelona, mercado francés"'
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && brief.trim() && askAgent("draft")}
              />
              <Button onClick={() => askAgent("draft")} disabled={!brief.trim() || loadingAgent}>
                {loadingAgent ? <Loader2 className="animate-spin" /> : <Sparkles />}
                Generar
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-1.5">
              <Label htmlFor="title">Título *</Label>
              <Input id="title" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Senior Frontend Engineer" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="location">Ubicación</Label>
                <Input id="location" value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Madrid (híbrido)" />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={form.employment_type} onValueChange={(v) => set("employment_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_time">Jornada completa</SelectItem>
                    <SelectItem value="part_time">Jornada parcial</SelectItem>
                    <SelectItem value="contract">Temporal / contrato</SelectItem>
                    <SelectItem value="internship">Prácticas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="salary_min">Salario mín. (€)</Label>
                <Input id="salary_min" type="number" value={form.salary_min} onChange={(e) => set("salary_min", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="salary_max">Salario máx. (€)</Label>
                <Input id="salary_max" type="number" value={form.salary_max} onChange={(e) => set("salary_max", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="exp">Experiencia mín. (años)</Label>
                <Input id="exp" type="number" value={form.experience_min_years} onChange={(e) => set("experience_min_years", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="sector">Sector</Label>
                <Input id="sector" value={form.sector} onChange={(e) => set("sector", e.target.value)} placeholder="Tecnología" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="department">Departamento</Label>
                <Input id="department" value={form.department} onChange={(e) => set("department", e.target.value)} placeholder="Engineering" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="category">Categoría</Label>
                <Input id="category" value={form.category} onChange={(e) => set("category", e.target.value)} placeholder="Software" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Skills requeridas</Label>
              <div className="flex gap-2">
                <Input
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
                  placeholder="Añadir skill y pulsar Enter"
                />
                <Button type="button" variant="secondary" onClick={addSkill}>Añadir</Button>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {form.skills.map((s) => (
                  <Badge key={s} variant="secondary" className="gap-1">
                    {s}
                    <button onClick={() => set("skills", form.skills.filter((x) => x !== s))}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Descripción (Markdown)</Label>
              <Textarea
                id="description"
                rows={14}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder={"## Sobre el rol\n...\n\n## Responsabilidades\n- ..."}
              />
            </div>
          </CardContent>
        </Card>

        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button onClick={() => save("active")} disabled={!form.title.trim() || saving}>
            {saving && <Loader2 className="animate-spin" />}
            {job ? "Guardar cambios" : "Publicar oferta"}
          </Button>
          {!job && (
            <Button variant="outline" onClick={() => save("draft")} disabled={!form.title.trim() || saving}>
              Guardar como borrador
            </Button>
          )}
        </div>
      </div>

      {/* Panel lateral del agente */}
      <div className="space-y-3">
        <Button
          variant="outline"
          className="w-full border-primary/40 text-primary hover:text-primary"
          onClick={() => askAgent("assist")}
          disabled={loadingAgent || !form.title.trim()}
        >
          {loadingAgent ? <Loader2 className="animate-spin" /> : <Sparkles />}
          Pedir sugerencias al agente
        </Button>
        {!form.title.trim() && (
          <p className="text-center text-xs text-muted-foreground">Escribe al menos el título para pedir sugerencias.</p>
        )}
        {suggestion && (
          <AgentHint>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Propuesta del agente</span>
                {agentMode === "fallback" && <Badge variant="warning">modo heurístico</Badge>}
              </div>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="font-medium">Título:</span> {suggestion.title}{" "}
                  <button className="text-primary underline" onClick={() => applySuggestion(["title"])}>aplicar</button>
                </div>
                <div>
                  <span className="font-medium">Salario:</span> {suggestion.salary_min.toLocaleString("es-ES")}–{suggestion.salary_max.toLocaleString("es-ES")} €{" "}
                  <button className="text-primary underline" onClick={() => applySuggestion(["salary_min", "salary_max"])}>aplicar</button>
                </div>
                <div>
                  <span className="font-medium">Skills:</span> {suggestion.skills.join(", ")}{" "}
                  <button className="text-primary underline" onClick={() => applySuggestion(["skills"])}>aplicar</button>
                </div>
                <div>
                  <span className="font-medium">Descripción:</span> {suggestion.description.slice(0, 140)}…{" "}
                  <button className="text-primary underline" onClick={() => applySuggestion(["description"])}>aplicar</button>
                </div>
                <p className="italic text-muted-foreground">{suggestion.rationale}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => applySuggestion()}>Aplicar todo</Button>
                <Button size="sm" variant="ghost" onClick={() => setSuggestion(null)}>Descartar</Button>
              </div>
            </div>
          </AgentHint>
        )}
      </div>
    </div>
  );
}
