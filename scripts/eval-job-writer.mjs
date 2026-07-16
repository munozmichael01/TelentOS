// Eval del job-writer: briefs autocontenidos (sin datos del demo).
// Invariantes: JobDraft válido, descripción con las 4 secciones del prompt, 4–8 skills,
// banda salarial sana, y el TONO pedido se ejerce (se pasa en el payload).
//   Uso: node scripts/eval-job-writer.mjs   (npm run eval:jobwriter)
import { OWNER, sessionCookie, post, report } from "./_eval-common.mjs";

const SECTIONS = ["## Sobre el rol", "## Responsabilidades", "## Requisitos", "## Qué ofrecemos"];

const CASES = [
  { id: "designer-prof", brief: "Product designer senior para B2B SaaS, remoto, foco en design systems", tone: "profesional" },
  { id: "sdr-cercano", brief: "SDR junior para Barcelona, sin experiencia previa", tone: "cercano" },
  { id: "devops-creativo", brief: "Ingeniero DevOps con Kubernetes para fintech", tone: "creativo" },
];

const cookie = await sessionCookie(OWNER);

const rows = [];
for (const c of CASES) {
  try {
    const { status, json } = await post("/api/agents/job-writer", { brief: c.brief, tone: c.tone }, cookie);
    const o = json.output ?? {};
    const desc = typeof o.description === "string" ? o.description : "";
    const checks = {
      http: status === 200,
      title: typeof o.title === "string" && o.title.length > 0,
      sections: SECTIONS.every((s) => desc.includes(s)),
      skills: Array.isArray(o.skills) && o.skills.length >= 4 && o.skills.length <= 8,
      salary: Number(o.salary_min) > 0 && Number(o.salary_max) >= Number(o.salary_min),
    };
    const ok = Object.values(checks).every(Boolean);
    rows.push({ caso: c.id, tono: c.tone, estado: json.status ?? "?", ok: ok ? "PASS" : "FAIL",
      detalle: ok ? `${o.title} · ${o.skills.length} skills` : JSON.stringify(checks) });
  } catch (e) {
    rows.push({ caso: c.id, tono: c.tone, estado: "ERR", ok: "ERROR", detalle: String(e).slice(0, 80) });
  }
}
report("job-writer", rows);
