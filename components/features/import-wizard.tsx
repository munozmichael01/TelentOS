"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Globe, ClipboardPaste, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type PreviewRow = {
  title: string;
  location: string | null;
  salary_min: number | null;
  salary_max: number | null;
  skills: string[];
  duplicate: boolean;
  [k: string]: unknown;
};

type Preview = {
  source: string;
  total_raw: number;
  parsed: number;
  duplicates: number;
  rows: PreviewRow[];
};

/** Wizard de importación: fuente → preview normalizado + dedupe → confirmar. */
export function ImportWizard() {
  const router = useRouter();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [url, setUrl] = useState("");
  const [payload, setPayload] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ inserted: number; skipped: number } | null>(null);

  async function handleResponse(res: Response) {
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Error en la importación");
    setPreview(data);
  }

  async function previewFile(file: File) {
    setLoading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      await handleResponse(await fetch("/api/jobs/import", { method: "POST", body: fd }));
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setLoading(false);
    }
  }

  async function previewBody(body: Record<string, string>) {
    setLoading(true);
    setError("");
    try {
      await handleResponse(
        await fetch("/api/jobs/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      );
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setLoading(false);
    }
  }

  async function commit() {
    if (!preview) return;
    setLoading(true);
    setError("");
    try {
      const rows = preview.rows.filter((r) => !r.duplicate);
      const res = await fetch("/api/jobs/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "commit", rows, source: preview.source }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al importar");
      setDone(data);
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <CheckCircle2 className="h-10 w-10 text-emerald-500" />
          <p className="font-semibold">{done.inserted} ofertas importadas</p>
          {done.skipped > 0 && (
            <p className="text-sm text-muted-foreground">{done.skipped} omitidas (duplicados o errores)</p>
          )}
          <Button onClick={() => { router.push("/jobs"); router.refresh(); }}>Ver ofertas</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {!preview && (
        <Tabs defaultValue="file">
          <TabsList>
            <TabsTrigger value="file"><FileUp className="mr-1.5 h-3.5 w-3.5" />Fichero</TabsTrigger>
            <TabsTrigger value="url"><Globe className="mr-1.5 h-3.5 w-3.5" />URL / API</TabsTrigger>
            <TabsTrigger value="paste"><ClipboardPaste className="mr-1.5 h-3.5 w-3.5" />Pegar contenido</TabsTrigger>
          </TabsList>

          <TabsContent value="file">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Subir fichero</CardTitle>
                <CardDescription>CSV, Excel (.xlsx), XML o JSON. Las columnas se mapean automáticamente al schema interno.</CardDescription>
              </CardHeader>
              <CardContent>
                <Input
                  type="file"
                  accept=".csv,.xlsx,.xls,.xml,.json"
                  onChange={(e) => e.target.files?.[0] && previewFile(e.target.files[0])}
                  disabled={loading}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="url">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Importar desde URL</CardTitle>
                <CardDescription>Feed XML, endpoint JSON de una API externa, o la URL de una oferta publicada (se extrae el JSON-LD).</CardDescription>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Input placeholder="https://feeds.example.com/jobs.xml" value={url} onChange={(e) => setUrl(e.target.value)} />
                <Button onClick={() => previewBody({ url })} disabled={!url.trim() || loading}>
                  {loading ? <Loader2 className="animate-spin" /> : "Analizar"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="paste">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pegar contenido</CardTitle>
                <CardDescription>Pega directamente CSV, XML o JSON.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea rows={8} value={payload} onChange={(e) => setPayload(e.target.value)} placeholder="title,location,salary_min,salary_max,skills&#10;..." />
                <Button onClick={() => previewBody({ payload })} disabled={!payload.trim() || loading}>
                  {loading ? <Loader2 className="animate-spin" /> : "Analizar"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {loading && !preview && <p className="text-sm text-muted-foreground">Procesando…</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {preview && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preview de importación</CardTitle>
            <CardDescription>
              {preview.parsed} ofertas normalizadas de {preview.total_raw} registros ·{" "}
              {preview.duplicates > 0 ? `${preview.duplicates} duplicados detectados (se omitirán)` : "sin duplicados"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Ubicación</TableHead>
                  <TableHead>Salario</TableHead>
                  <TableHead>Skills</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.rows.slice(0, 50).map((r, i) => (
                  <TableRow key={i} className={r.duplicate ? "opacity-50" : ""}>
                    <TableCell className="font-medium">{r.title}</TableCell>
                    <TableCell>{r.location ?? "—"}</TableCell>
                    <TableCell>
                      {r.salary_min || r.salary_max ? `${r.salary_min ?? "?"}–${r.salary_max ?? "?"} €` : "—"}
                    </TableCell>
                    <TableCell className="max-w-48 truncate text-xs">{r.skills.join(", ") || "—"}</TableCell>
                    <TableCell>
                      {r.duplicate ? <Badge variant="warning">duplicado</Badge> : <Badge variant="success">nuevo</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex gap-2">
              <Button onClick={commit} disabled={loading || preview.rows.every((r) => r.duplicate)}>
                {loading ? <Loader2 className="animate-spin" /> : null}
                Importar {preview.rows.filter((r) => !r.duplicate).length} ofertas
              </Button>
              <Button variant="outline" onClick={() => setPreview(null)}>Volver</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
