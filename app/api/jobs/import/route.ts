import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";
import {
  normalizeRow, parseCsv, parseXml, parseXlsx, parseJson, parseHtmlJob,
  type NormalizedJob,
} from "@/lib/import";
import { DEFAULT_STAGES } from "@/lib/types";

/**
 * Importación en dos pasos:
 *  - mode=preview: parsea la fuente, normaliza y marca duplicados sin escribir.
 *  - mode=commit: inserta las ofertas normalizadas (las no duplicadas).
 * El humano siempre ve el preview antes de confirmar.
 */
export async function POST(req: Request) {
  const { user, supabase, error } = await requireUser();
  if (error) return error;

  const contentType = req.headers.get("content-type") ?? "";

  // ── commit: recibe las filas ya normalizadas y aprobadas en el preview ────
  if (contentType.includes("application/json")) {
    const body = await req.json().catch(() => null);

    if (body?.mode === "commit") {
      const rows: NormalizedJob[] = body.rows ?? [];
      if (!rows.length) return jsonError("Nada que importar");

      const { data: company } = await supabase.from("companies").select("id").limit(1).maybeSingle();
      if (!company) return jsonError("Configura primero la empresa en Ajustes", 412);

      let inserted = 0;
      for (const row of rows) {
        const { data: job, error: insErr } = await supabase
          .from("jobs")
          .insert({
            ...row,
            company_id: company.id,
            status: "draft",
            source: body.source ?? "import_csv",
            created_by: user.id,
          })
          .select("id")
          .single();
        if (!insErr && job) {
          inserted++;
          await supabase.from("job_stages").insert(DEFAULT_STAGES.map((s) => ({ ...s, job_id: job.id })));
        }
      }
      return NextResponse.json({ inserted, skipped: rows.length - inserted });
    }

    // ── preview desde URL o payload JSON pegado ─────────────────────────────
    let rawRows: Record<string, unknown>[] = [];
    let source = "import_json";
    if (body?.url) {
      source = "import_url";
      try {
        const res = await fetch(body.url, {
          headers: { "user-agent": "TalentOS/0.1 (+job import)" },
          signal: AbortSignal.timeout(10000),
        });
        const text = await res.text();
        const ct = res.headers.get("content-type") ?? "";
        if (ct.includes("json") || text.trim().startsWith("{") || text.trim().startsWith("[")) {
          rawRows = parseJson(text);
        } else if (ct.includes("xml") || text.trim().startsWith("<?xml")) {
          rawRows = parseXml(text);
        } else {
          rawRows = parseHtmlJob(text, body.url);
        }
      } catch (e) {
        return jsonError(`No se pudo leer la URL: ${String(e)}`);
      }
    } else if (body?.payload) {
      const text: string = body.payload;
      try {
        if (text.trim().startsWith("<")) {
          source = "import_xml";
          rawRows = parseXml(text);
        } else if (text.trim().startsWith("{") || text.trim().startsWith("[")) {
          rawRows = parseJson(text);
        } else {
          source = "import_csv";
          rawRows = parseCsv(text);
        }
      } catch (e) {
        return jsonError(`No se pudo parsear el contenido: ${String(e)}`);
      }
    } else {
      return jsonError("Se requiere 'url', 'payload' o un fichero");
    }
    return preview(supabase, rawRows, source);
  }

  // ── preview desde fichero (CSV / XML / XLSX / JSON) ───────────────────────
  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file") as File | null;
  if (!file) return jsonError("Se requiere un fichero");

  const name = file.name.toLowerCase();
  let rawRows: Record<string, unknown>[] = [];
  let source = "import_csv";
  try {
    if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      source = "import_xlsx";
      rawRows = parseXlsx(await file.arrayBuffer());
    } else if (name.endsWith(".xml")) {
      source = "import_xml";
      rawRows = parseXml(await file.text());
    } else if (name.endsWith(".json")) {
      source = "import_json";
      rawRows = parseJson(await file.text());
    } else {
      rawRows = parseCsv(await file.text());
    }
  } catch (e) {
    return jsonError(`No se pudo parsear ${file.name}: ${String(e)}`);
  }
  return preview(supabase, rawRows, source);
}

async function preview(
  supabase: ReturnType<typeof import("@/lib/supabase/server").createClient>,
  rawRows: Record<string, unknown>[],
  source: string
) {
  const normalized = rawRows.map(normalizeRow).filter((r): r is NormalizedJob => r !== null);

  // Deduplicación: contra la BD y dentro del propio lote
  const hashes = normalized.map((r) => r.dedupe_hash);
  const { data: existing } = hashes.length
    ? await supabase.from("jobs").select("dedupe_hash").in("dedupe_hash", hashes)
    : { data: [] };
  const existingSet = new Set((existing ?? []).map((e: { dedupe_hash: string }) => e.dedupe_hash));

  const seen = new Set<string>();
  const rows = normalized.map((r) => {
    const duplicate = existingSet.has(r.dedupe_hash) || seen.has(r.dedupe_hash);
    seen.add(r.dedupe_hash);
    return { ...r, duplicate };
  });

  return NextResponse.json({
    mode: "preview",
    source,
    total_raw: rawRows.length,
    parsed: rows.length,
    duplicates: rows.filter((r) => r.duplicate).length,
    rows,
  });
}
