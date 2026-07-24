"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";

// Picker de CARGO CANÓNICO (taxonomía ESCO) para publicar oferta. Busca por nombre/traducción/
// sinónimo contra /api/job-titles y, al elegir, devuelve el cargo + sus skills sugeridas
// (job_title_skills) para pre-rellenar. El título libre de la oferta es aparte.
type Suggestion = { id: string; label: string; category_key: string | null };

export function JobTitlePicker({
  valueLabel,
  onPick,
}: {
  valueLabel: string;
  onPick: (t: { id: string; label: string; category_key: string | null; skills: string[] }) => void;
}) {
  const [q, setQ] = useState(valueLabel);
  const [results, setResults] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setQ(valueLabel); }, [valueLabel]);

  function onChange(v: string) {
    setQ(v);
    setOpen(true);
    if (timer.current) clearTimeout(timer.current);
    if (v.trim().length < 2) { setResults([]); return; }
    timer.current = setTimeout(async () => {
      const r = await fetch(`/api/job-titles?q=${encodeURIComponent(v.trim())}`).then((x) => x.json()).catch(() => ({ titles: [] }));
      setResults(r.titles ?? []);
    }, 220);
  }

  async function pick(s: Suggestion) {
    setQ(s.label);
    setOpen(false);
    setResults([]);
    const detail = await fetch(`/api/job-titles?id=${s.id}`).then((x) => x.json()).catch(() => ({ skills: [] }));
    onPick({ id: s.id, label: s.label, category_key: s.category_key, skills: detail.skills ?? [] });
  }

  return (
    <div style={{ position: "relative" }}>
      <Input
        value={q}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => q.trim().length >= 2 && results.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Busca el cargo estándar… (cocinero, product manager)"
      />
      {open && results.length > 0 && (
        <div style={{ position: "absolute", zIndex: 20, top: "100%", left: 0, right: 0, marginTop: 4, background: "#FCFAF6", border: "1px solid #E7E1D4", borderRadius: 10, boxShadow: "0 6px 20px rgba(0,0,0,.08)", overflow: "hidden" }}>
          {results.map((s) => (
            <button
              key={s.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); pick(s); }}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 12px", fontSize: 13, border: "none", background: "transparent", cursor: "pointer" }}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
