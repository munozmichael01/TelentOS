"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/utils";

type Note = { id: string; body: string; author_email: string | null; created_at: string };

export function NotesPanel({ applicationId, notes }: { applicationId: string; notes: Note[] }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  async function addNote() {
    setSaving(true);
    await fetch(`/api/applications/${applicationId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    setBody("");
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Textarea rows={2} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Añadir nota interna…" />
        <Button onClick={addNote} disabled={!body.trim() || saving}>
          {saving ? <Loader2 className="animate-spin" /> : "Guardar"}
        </Button>
      </div>
      <div className="space-y-2">
        {notes.map((n) => (
          <div key={n.id} className="rounded-md border bg-muted/40 p-3 text-sm">
            <p className="whitespace-pre-wrap">{n.body}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {n.author_email ?? "—"} · {formatDateTime(n.created_at)}
            </p>
          </div>
        ))}
        {notes.length === 0 && <p className="text-sm text-muted-foreground">Sin notas todavía.</p>}
      </div>
    </div>
  );
}
