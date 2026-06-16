"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Loader2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatDateTime } from "@/lib/utils";
import type { EvaluationTemplate, Interview, JobStage } from "@/lib/types";

type InterviewWithFeedback = Interview & {
  interview_feedback?: { id: string; overall: number; comments: string | null; author_email: string | null; ratings: Record<string, number> }[];
};

/** Scheduling básico + feedback estructurado con plantillas por etapa. */
export function InterviewPanel({
  applicationId,
  interviews,
  templates,
  stages,
}: {
  applicationId: string;
  interviews: InterviewWithFeedback[];
  templates: EvaluationTemplate[];
  stages: JobStage[];
}) {
  const router = useRouter();
  const [scheduling, setScheduling] = useState(false);
  const [feedbackFor, setFeedbackFor] = useState<InterviewWithFeedback | null>(null);
  const [saving, setSaving] = useState(false);

  // formulario de scheduling
  const [when, setWhen] = useState("");
  const [interviewer, setInterviewer] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [stageId, setStageId] = useState("");

  // formulario de feedback
  const [templateId, setTemplateId] = useState("");
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [overall, setOverall] = useState(0);
  const [comments, setComments] = useState("");

  const activeTemplate = templates.find((t) => t.id === templateId);

  async function schedule() {
    setSaving(true);
    await fetch("/api/interviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        application_id: applicationId,
        scheduled_at: new Date(when).toISOString(),
        interviewer: interviewer || null,
        meeting_url: meetingUrl || null,
        stage_id: stageId || null,
      }),
    });
    setSaving(false);
    setScheduling(false);
    setWhen(""); setInterviewer(""); setMeetingUrl("");
    router.refresh();
  }

  async function submitFeedback() {
    if (!feedbackFor) return;
    setSaving(true);
    await fetch(`/api/interviews/${feedbackFor.id}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ template_id: templateId || null, ratings, overall, comments }),
    });
    setSaving(false);
    setFeedbackFor(null);
    setRatings({}); setOverall(0); setComments(""); setTemplateId("");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={() => setScheduling(true)}>
          <CalendarPlus />
          Programar entrevista
        </Button>
      </div>

      {interviews.length === 0 && <p className="text-sm text-muted-foreground">Sin entrevistas programadas.</p>}
      {interviews.map((iv) => (
        <div key={iv.id} className="rounded-md border p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="font-medium">{formatDateTime(iv.scheduled_at)}</span>
              <span className="text-muted-foreground"> · {iv.duration_min} min</span>
              {iv.interviewer && <span className="text-muted-foreground"> · {iv.interviewer}</span>}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={iv.status === "done" ? "success" : "secondary"}>{iv.status === "done" ? "completada" : iv.status === "scheduled" ? "programada" : "cancelada"}</Badge>
              {iv.status === "scheduled" && (
                <Button size="sm" variant="ghost" className="h-7" onClick={() => setFeedbackFor(iv)}>
                  Registrar feedback
                </Button>
              )}
            </div>
          </div>
          {iv.meeting_url && (
            <a href={iv.meeting_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">
              {iv.meeting_url}
            </a>
          )}
          {iv.interview_feedback?.map((fb) => (
            <div key={fb.id} className="mt-2 rounded bg-muted/50 p-2">
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`h-3.5 w-3.5 ${i < fb.overall ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`} />
                ))}
                <span className="ml-2 text-xs text-muted-foreground">{fb.author_email}</span>
              </div>
              {Object.keys(fb.ratings ?? {}).length > 0 && (
                <ul className="mt-1 text-xs text-muted-foreground">
                  {Object.entries(fb.ratings).map(([q, r]) => (
                    <li key={q}>{q}: {r}/5</li>
                  ))}
                </ul>
              )}
              {fb.comments && <p className="mt-1 text-xs">{fb.comments}</p>}
            </div>
          ))}
        </div>
      ))}

      {/* Diálogo: programar */}
      <Dialog open={scheduling} onOpenChange={setScheduling}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Programar entrevista</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Fecha y hora</Label>
              <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Entrevistador/a</Label>
              <Input value={interviewer} onChange={(e) => setInterviewer(e.target.value)} placeholder="Nombre" />
            </div>
            <div className="space-y-1.5">
              <Label>Enlace de la reunión (opcional)</Label>
              <Input value={meetingUrl} onChange={(e) => setMeetingUrl(e.target.value)} placeholder="https://meet…" />
            </div>
            <div className="space-y-1.5">
              <Label>Etapa</Label>
              <Select value={stageId} onValueChange={setStageId}>
                <SelectTrigger><SelectValue placeholder="Etapa asociada" /></SelectTrigger>
                <SelectContent>
                  {stages.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduling(false)}>Cancelar</Button>
            <Button onClick={schedule} disabled={!when || saving}>
              {saving && <Loader2 className="animate-spin" />}
              Programar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo: feedback estructurado */}
      <Dialog open={!!feedbackFor} onOpenChange={(o) => !o && setFeedbackFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Feedback de entrevista</DialogTitle>
            <DialogDescription>Usa una plantilla de evaluación o valora libremente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Plantilla</Label>
              <Select value={templateId} onValueChange={(v) => { setTemplateId(v); setRatings({}); }}>
                <SelectTrigger><SelectValue placeholder="Sin plantilla" /></SelectTrigger>
                <SelectContent>
                  {templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {activeTemplate?.questions.map((q) => (
              <div key={q.q} className="flex items-center justify-between gap-3">
                <span className="text-sm">{q.q}</span>
                <StarPicker value={ratings[q.q] ?? 0} onChange={(v) => setRatings((r) => ({ ...r, [q.q]: v }))} />
              </div>
            ))}
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">Valoración global *</span>
              <StarPicker value={overall} onChange={setOverall} />
            </div>
            <div className="space-y-1.5">
              <Label>Comentarios</Label>
              <Textarea rows={3} value={comments} onChange={(e) => setComments(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFeedbackFor(null)}>Cancelar</Button>
            <Button onClick={submitFeedback} disabled={!overall || saving}>
              {saving && <Loader2 className="animate-spin" />}
              Guardar feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} type="button" onClick={() => onChange(i)}>
          <Star className={`h-5 w-5 ${i <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`} />
        </button>
      ))}
    </div>
  );
}
