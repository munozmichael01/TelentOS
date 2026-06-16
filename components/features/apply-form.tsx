"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/**
 * Formulario público de candidatura del career site. Propaga los utm_* de la
 * URL (si llegó desde una campaña) y por defecto marca origen career_site.
 */
export function ApplyForm({ jobId }: { jobId: string }) {
  const params = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const fd = new FormData(e.currentTarget);
      fd.append("job_id", jobId);
      for (const key of ["utm_source", "utm_medium", "utm_campaign"]) {
        const v = params.get(key);
        if (v) fd.append(key, v);
      }
      const res = await fetch("/api/careers/apply", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al enviar la candidatura");
      setDone(true);
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border bg-card p-10 text-center">
        <CheckCircle2 className="h-10 w-10 text-emerald-500" />
        <p className="font-semibold">¡Candidatura enviada!</p>
        <p className="text-sm text-muted-foreground">Revisaremos tu perfil y te contactaremos pronto.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border bg-card p-6">
      <h2 className="font-semibold">Aplicar a esta oferta</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">Nombre completo *</Label>
          <Input id="name" name="name" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email *</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Teléfono</Label>
          <Input id="phone" name="phone" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="location">Ubicación</Label>
          <Input id="location" name="location" placeholder="Madrid" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="experience_years">Años de experiencia</Label>
          <Input id="experience_years" name="experience_years" type="number" min={0} defaultValue={0} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cv">CV (PDF, máx. 8 MB)</Label>
          <Input id="cv" name="cv" type="file" accept=".pdf,.doc,.docx" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="skills">Skills (separadas por comas)</Label>
        <Input id="skills" name="skills" placeholder="React, TypeScript, …" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="summary">Cuéntanos brevemente sobre ti</Label>
        <Textarea id="summary" name="summary" rows={3} />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
        {submitting && <Loader2 className="animate-spin" />}
        Enviar candidatura
      </Button>
    </form>
  );
}
