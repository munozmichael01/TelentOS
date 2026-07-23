// scripts/create-turijobs-account.mjs — crea la cuenta de empresa "Turijobs" (usuario) y la
// enlaza como OWNER de la empresa matriz Turijobs. Aprovisionamiento por service_role (mismo
// patrón que seed-demo). Idempotente. Uso: node scripts/create-turijobs-account.mjs <email> <password>
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(ROOT, "package.json"));
const { createClient } = require("@supabase/supabase-js");
const env = Object.fromEntries(readFileSync(join(ROOT, ".env.local"), "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const email = (process.argv[2] || "").trim().toLowerCase();
const password = process.argv[3] || "";
if (!email || !password) { console.error("Uso: create-turijobs-account.mjs <email> <password>"); process.exit(1); }

async function main() {
  // 1) Empresa matriz
  const { data: company } = await db.from("companies").select("id, name").eq("slug", "turijobs").maybeSingle();
  if (!company) { console.error("No existe la empresa matriz 'turijobs'. Corre primero import-turijobs.mjs."); process.exit(1); }

  // 2) Usuario (crear o reutilizar)
  let userId;
  const { data: list } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existing = list?.users?.find((u) => u.email?.toLowerCase() === email);
  if (existing) { userId = existing.id; console.log("Usuario ya existía:", email); }
  else {
    const { data, error } = await db.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { full_name: "Turijobs", name: "Turijobs" },
    });
    if (error) { console.error("createUser:", error.message); process.exit(1); }
    userId = data.user.id; console.log("Usuario creado:", email);
  }

  // 3) Membresía owner de la matriz (idempotente por unique(company_id,user_id))
  const { data: mem } = await db.from("company_members").select("id").eq("company_id", company.id).eq("user_id", userId).maybeSingle();
  if (mem) console.log("Membresía ya existía.");
  else {
    const { error } = await db.from("company_members").insert({ company_id: company.id, user_id: userId, role: "owner", joined_at: new Date().toISOString() });
    if (error) { console.error("member:", error.message); process.exit(1); }
    console.log(`Owner enlazado a la matriz '${company.name}'.`);
  }
  console.log("Listo. La cuenta ve la matriz; con Push 3 verá también sus empresas hijas.");
}
main().catch((e) => { console.error(e); process.exit(1); });
