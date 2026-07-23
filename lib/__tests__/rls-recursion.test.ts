import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// ── Prueba de regresión: recursión RLS candidates↔applications (fix migr. 0050) ──
//
// El bug (latente desde 0037): la política `candidates_tenant` leía `applications`, y
// `applications_candidate_read` leía `candidates` en su USING → recursión infinita
// (Postgres 42P17). CUALQUIER SELECT de un usuario autenticado sobre esas tablas fallaba,
// y la página de Candidatos del dashboard devolvía 0 para todas las empresas.
//
// Basta un usuario autenticado (sin datos) para disparar la evaluación de esas políticas,
// así que reproducimos el ciclo sin sembrar datos ni depender de ninguna cuenta real.
//
// DB-gated: necesita las claves de Supabase en el entorno. Si no están (p. ej. CI sin
// secretos), la suite se salta en vez de fallar.

function loadEnv(): Record<string, string> {
  const merged: Record<string, string> = { ...process.env } as Record<string, string>;
  try {
    const raw = readFileSync(join(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      if (!line.includes("=") || line.trimStart().startsWith("#")) continue;
      const k = line.slice(0, line.indexOf("=")).trim();
      const v = line.slice(line.indexOf("=") + 1).trim();
      if (!(k in merged) || !merged[k]) merged[k] = v;
    }
  } catch {
    /* sin .env.local: nos quedamos con process.env */
  }
  return merged;
}

const env = loadEnv();
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
const hasDb = Boolean(URL && ANON && SERVICE);

// Tablas cuyo aislamiento por tenant pasa por candidates/applications/jobs: si alguna
// política reintrodujera un ciclo, el SELECT autenticado lanzaría 42P17 aquí.
const SENSITIVE = [
  "candidates", "applications", "candidate_education", "candidate_experiences",
  "candidate_languages", "candidate_skills", "candidate_profiles", "job_stages",
  "screening_questions", "application_events", "saved_jobs",
];

describe.skipIf(!hasDb)("RLS: sin recursión bajo sesión autenticada (regresión migr. 0050)", () => {
  const admin = createClient(URL!, SERVICE!, { auth: { persistSession: false } });
  const email = "rls-selftest@talentos.test";
  const password = "rls-selftest-" + "x".repeat(12);
  let userId: string | null = null;
  let userClient: ReturnType<typeof createClient>;

  beforeAll(async () => {
    // Usuario efímero (idempotente: si quedó de una corrida anterior, lo borramos).
    const { data: list } = await admin.auth.admin.listUsers();
    const prev = list?.users.find((u) => u.email === email);
    if (prev) await admin.auth.admin.deleteUser(prev.id);
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) throw error;
    userId = data.user!.id;

    userClient = createClient(URL!, ANON!, { auth: { persistSession: false } });
    const { error: signInErr } = await userClient.auth.signInWithPassword({ email, password });
    if (signInErr) throw signInErr;
  }, 30_000);

  afterAll(async () => {
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  it.each(SENSITIVE)("SELECT sobre %s no dispara recursión (42P17)", async (table) => {
    const { error } = await userClient.from(table).select("*").limit(1);
    // No debe haber recursión. Un vacío/permiso (RLS niega filas) es OK; 42P17 no.
    expect(error?.code, `${table}: ${error?.message ?? ""}`).not.toBe("42P17");
    expect(error?.message ?? "").not.toMatch(/infinite recursion/i);
  }, 15_000);
});
