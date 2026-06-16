// Datos de mercado mock con estructura real. En producción esto vendría de un
// proveedor de salary benchmarking; el agente job-writer los consume vía tool.

type SalaryBand = { min: number; max: number };

const ROLE_FAMILIES: { keywords: string[]; band: SalaryBand; skills: string[]; sector: string }[] = [
  {
    keywords: ["frontend", "react", "vue", "angular"],
    band: { min: 38000, max: 62000 },
    skills: ["React", "TypeScript", "Next.js", "CSS", "Testing", "Git"],
    sector: "Tecnología",
  },
  {
    keywords: ["backend", "node", "python", "java", "golang", "api"],
    band: { min: 40000, max: 65000 },
    skills: ["Node.js", "PostgreSQL", "APIs REST", "Docker", "Testing", "AWS"],
    sector: "Tecnología",
  },
  {
    keywords: ["fullstack", "full stack", "full-stack"],
    band: { min: 40000, max: 64000 },
    skills: ["React", "Node.js", "TypeScript", "PostgreSQL", "Docker"],
    sector: "Tecnología",
  },
  {
    keywords: ["data", "machine learning", "ml engineer", "analytics"],
    band: { min: 42000, max: 70000 },
    skills: ["Python", "SQL", "Pandas", "dbt", "Machine Learning"],
    sector: "Tecnología",
  },
  {
    keywords: ["product manager", "producto"],
    band: { min: 45000, max: 70000 },
    skills: ["Discovery", "Roadmapping", "Analytics", "Stakeholder management"],
    sector: "Tecnología",
  },
  {
    keywords: ["customer success", "account manager", "cuentas"],
    band: { min: 28000, max: 45000 },
    skills: ["Customer Success", "CRM", "SaaS", "Inglés", "Comunicación"],
    sector: "Tecnología",
  },
  {
    keywords: ["sales", "ventas", "comercial", "sdr", "bdr"],
    band: { min: 24000, max: 45000 },
    skills: ["Prospección", "CRM", "Negociación", "Inglés"],
    sector: "Comercial",
  },
  {
    keywords: ["marketing", "growth", "seo", "sem"],
    band: { min: 26000, max: 48000 },
    skills: ["SEO", "SEM", "Analytics", "Contenido", "CRM"],
    sector: "Marketing",
  },
  {
    keywords: ["recruiter", "talent", "people", "rrhh", "recursos humanos"],
    band: { min: 26000, max: 45000 },
    skills: ["Reclutamiento", "ATS", "Employer branding", "Entrevistas"],
    sector: "Recursos Humanos",
  },
  {
    keywords: ["mantenimiento", "técnico", "electromec", "industrial", "operario"],
    band: { min: 21000, max: 32000 },
    skills: ["Electromecánica", "PLC", "Mantenimiento preventivo", "Prevención de riesgos"],
    sector: "Industrial",
  },
  {
    keywords: ["enfermer", "auxiliar", "sanitario", "médic"],
    band: { min: 24000, max: 38000 },
    skills: ["Atención al paciente", "Protocolos sanitarios", "Trabajo en equipo"],
    sector: "Sanidad",
  },
  {
    keywords: ["camarer", "cociner", "hostelería", "restaurante"],
    band: { min: 18000, max: 26000 },
    skills: ["Atención al cliente", "Trabajo bajo presión", "APPCC"],
    sector: "Hostelería",
  },
];

const LOCATION_MULTIPLIER: Record<string, number> = {
  madrid: 1.08,
  barcelona: 1.06,
  valencia: 0.95,
  sevilla: 0.92,
  bilbao: 1.02,
  zaragoza: 0.93,
  málaga: 0.94,
  remoto: 1.0,
  remote: 1.0,
};

const SENIORITY_MULTIPLIER: { keywords: string[]; mult: number }[] = [
  { keywords: ["junior", "trainee", "becari"], mult: 0.7 },
  { keywords: ["senior", "sr."], mult: 1.25 },
  { keywords: ["lead", "principal", "staff", "head"], mult: 1.45 },
  { keywords: ["director", "vp", "chief"], mult: 1.7 },
];

export function getMarketSalary(title: string, location?: string) {
  const t = title.toLowerCase();
  const family =
    ROLE_FAMILIES.find((f) => f.keywords.some((k) => t.includes(k))) ?? {
      band: { min: 24000, max: 40000 },
      skills: [],
      sector: "General",
      keywords: [],
    };

  let mult = 1;
  for (const s of SENIORITY_MULTIPLIER) {
    if (s.keywords.some((k) => t.includes(k))) {
      mult = s.mult;
      break;
    }
  }
  const loc = (location ?? "").toLowerCase();
  const locKey = Object.keys(LOCATION_MULTIPLIER).find((k) => loc.includes(k));
  if (locKey) mult *= LOCATION_MULTIPLIER[locKey];

  const round = (n: number) => Math.round(n / 500) * 500;
  return {
    min: round(family.band.min * mult),
    max: round(family.band.max * mult),
    currency: "EUR",
    sample_size: 120 + Math.floor(Math.random() * 300),
    source: "TalentOS Market Data (mock)",
  };
}

export function suggestSkills(title: string): { skills: string[]; sector: string } {
  const t = title.toLowerCase();
  const family = ROLE_FAMILIES.find((f) => f.keywords.some((k) => t.includes(k)));
  return {
    skills: family?.skills ?? ["Comunicación", "Trabajo en equipo", "Organización"],
    sector: family?.sector ?? "General",
  };
}
