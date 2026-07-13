"use client";

import { useState } from "react";
import { AgentActionButton } from "@/components/ui/agent-action-button";
import { ProposalFrame } from "@/components/ui/proposal-frame";
import { CvProfileFields } from "@/components/features/cv-profile-fields";
import { fromCvProfile, toProfilePayload, type EditableCvProfile } from "@/lib/cv-profile";
import type { CvProfile } from "@/agents/agent-cv-parser";

type Props = { candidateId: string; hasCv: boolean };

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

  if (phase === "idle" || phase === "loading") {
    return (
      <AgentActionButton
        idleLabel="Extraer del CV"
        busyLabel="Analizando CV…"
        busy={phase === "loading"}
        onClick={extract}
        className="w-full"
      />
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

  // review | saving — marco canónico de propuesta editable (S2)
  const busy = phase === "saving";
  return (
    <div className="mt-1">
      <ProposalFrame
        provenance={aiStatus === "ok" ? "ia" : "heuristica"}
        busy={busy}
        onConfirm={confirm}
        onDiscard={() => setPhase("idle")}
      >
        <CvProfileFields profile={profile!} onChange={setProfile} disabled={busy} />
      </ProposalFrame>
    </div>
  );
}
