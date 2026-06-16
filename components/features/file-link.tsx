"use client";

import { useState } from "react";
import { FileText, Loader2 } from "lucide-react";

/** Abre ficheros de buckets privados vía signed URL temporal. */
export function FileLink({ bucket, path, label }: { bucket: "cvs" | "documents"; path: string; label: string }) {
  const [loading, setLoading] = useState(false);

  async function open() {
    setLoading(true);
    try {
      const res = await fetch("/api/files/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bucket, path }),
      });
      const data = await res.json();
      if (data.url) window.open(data.url, "_blank");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={open} className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline" disabled={loading}>
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
      {label}
    </button>
  );
}
