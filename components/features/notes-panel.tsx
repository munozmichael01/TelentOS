"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

type Note = { id: string; body: string; author_email: string | null; created_at: string };

export function NotesPanel({ applicationId, notes }: { applicationId: string; notes: Note[] }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  async function addNote() {
    if (!body.trim()) return;
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
    <div style={{ maxWidth: "720px" }}>
      {/* composer */}
      <div style={{ background: "#FCFAF6", border: "1px solid #E7E1D4", borderRadius: "16px", padding: "18px 20px", marginBottom: "12px" }}>
        <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", textTransform: "uppercase", letterSpacing: ".5px", color: "#79746B", marginBottom: "10px" }}>
          Nota interna
        </div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Añadir una nota interna sobre el candidato…"
          style={{ width: "100%", resize: "none", height: "62px", fontFamily: "'Hanken Grotesk',sans-serif", fontSize: "13.5px", color: "#1A1A17", background: "#F4F0E8", border: "1.5px solid #E7E1D4", borderRadius: "11px", padding: "10px 12px", outline: "none" }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "#0E5C4A"; e.currentTarget.style.boxShadow = "0 0 0 3px #DCEFE4"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "#E7E1D4"; e.currentTarget.style.boxShadow = "none"; }}
        />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginTop: "10px" }}>
          <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", color: "#79746B" }}>
            Solo el equipo · no visible para el candidato
          </span>
          <button
            onClick={addNote}
            disabled={!body.trim() || saving}
            style={{
              fontFamily: "'Archivo',sans-serif",
              fontWeight: 800,
              fontSize: "13px",
              color: "#fff",
              background: body.trim() ? "#0E5C4A" : "#C2B8A4",
              border: "2px solid #1A1A17",
              borderRadius: "11px",
              padding: "9px 16px",
              boxShadow: body.trim() ? "3px 3px 0 #1A1A17" : "none",
              cursor: body.trim() && !saving ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {saving && <Loader2 size={13} className="animate-spin" />}
            Guardar nota
          </button>
        </div>
      </div>

      {/* notes list */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {notes.map((n) => (
          <div key={n.id} style={{ background: "#FCFAF6", border: "1px solid #E7E1D4", borderRadius: "13px", padding: "14px 16px" }}>
            <p style={{ fontSize: "14px", lineHeight: 1.55, color: "#3A3833", margin: 0, whiteSpace: "pre-wrap" }}>{n.body}</p>
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", color: "#79746B", marginTop: "9px" }}>
              {n.author_email ?? "—"} · {formatDateTime(n.created_at)}
            </div>
          </div>
        ))}
        {notes.length === 0 && (
          <p style={{ fontSize: "13px", color: "#79746B" }}>Sin notas todavía.</p>
        )}
      </div>
    </div>
  );
}
