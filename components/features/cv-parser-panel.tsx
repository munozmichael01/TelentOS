"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CvProfileFields } from "@/components/features/cv-profile-fields";
import { fromCvProfile, toProfilePayload, type EditableCvProfile } from "@/lib/cv-profile";
import type { CvProfile } from "@/agents/agent-cv-parser";

// ── DS icons ─────────────────────────────────────────────────────────────────

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
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={cn("size-4 animate-spin", className)}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" strokeDasharray="28 14" strokeLinecap="round" />
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

type Props = { candidateId: string; hasCv: boolean };

// ── Component ────────────────────────────────────────────────────────────────

export function CvParserPanel({ candidateId, hasCv }: Props) {
  const [phase, setPhase] = useState<"idle" | "loading" | "review" | "saving" | "done" | "error">("idle");
  const [aiStatus, setAiStatus] = useState<"ok" | "fallback">("ok");
  const [profile, setProfile] = useState<EditableCvProfile | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!hasCv) return null;

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
      setProfile(fromCvProfile(data.profile));
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
        body: JSON.stringify(toProfilePayload(profile)),
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
    return <p className="text-sm font-semibold text-[#0E5C4A] py-1">Perfil actualizado correctamente.</p>;
  }

  if (phase === "error") {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive">
        <span>{errorMsg ?? "Error desconocido"}</span>
        <button onClick={() => setPhase("idle")} className="text-muted-foreground underline text-xs hover:text-foreground">
          Reintentar
        </button>
      </div>
    );
  }

  // ── Review ────────────────────────────────────────────────────────────────
  const busy = phase === "saving";

  return (
    <div className="mt-1 rounded-[14px] border border-line bg-surface p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant={aiStatus === "ok" ? "brand" : "secondary"}>
            {aiStatus === "ok" ? "extraído por IA" : "análisis heurístico"}
          </Badge>
          <span className="text-xs text-muted-foreground">Revisa y confirma</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setPhase("idle")} disabled={busy} className="h-7 w-7">
          <IconClose />
        </Button>
      </div>

      <CvProfileFields profile={profile!} onChange={setProfile} disabled={busy} />

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
