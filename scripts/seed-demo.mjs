// scripts/seed-demo.mjs — seed multi-tenant de empresas demo (Nordia Labs / Café
// Andino / Volta Energia) para probar el job board público con volumen.
//
// Idempotente: re-ejecutar no duplica (busca por slug de empresa, email de user,
// email de empleado, dedupe_hash de oferta, email de candidato, etc.).
// Patrón de entorno: igual que scripts/_eval-common.mjs (.env.local + service_role).
//
//   node scripts/seed-demo.mjs
//
// No toca las empresas existentes (Acme Talent, Grupo Planeta).

import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(ROOT, "package.json"));
const { createClient } = require("@supabase/supabase-js");

const env = Object.fromEntries(
  readFileSync(join(ROOT, ".env.local"), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const PASSWORD = "TalentOS-Demo-2026!";
const TODAY = new Date().toISOString().split("T")[0];

// Mismo algoritmo que lib/import.ts (dedupeHash) — no se puede importar TS desde .mjs.
function dedupeHash(title, location) {
  const norm = (s) =>
    s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  return createHash("sha256").update(`${norm(title)}|${norm(location ?? "")}`).digest("hex").slice(0, 32);
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}
function daysFromNow(n) {
  return daysAgo(-n);
}

const failures = [];
function fail(company, section, message) {
  failures.push({ company, section, message });
  console.error(`  ✗ [${company}/${section}] ${message}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Datos demo
// ─────────────────────────────────────────────────────────────────────────────

const COMPANIES = [
  {
    name: "Nordia Labs",
    slug: "nordia-labs",
    description: "Plataforma SaaS de observabilidad para equipos de producto. Remoto-friendly, con hubs en Madrid y Barcelona.",
    website: "https://nordialabs.demo",
    address: "Calle de Serrano 41, 28001 Madrid",
    country: "ES",
    currency: "EUR",
    timezone: "Europe/Madrid",
    userDomain: "nordialabs.demo",
    scheduleName: "Jornada estándar (40h)",
    employees: [
      { name: "Marta Ferrer",     email: "marta.ferrer",     role_title: "CEO",                      department: "Dirección",   start_date: "2021-03-01", seniority: "exec",   city: "Madrid",    modality: "hibrido",    salary: 7500, manager: null },
      { name: "Iker Etxebarria",  email: "iker.etxebarria",  role_title: "CTO",                      department: "Ingeniería",  start_date: "2021-03-01", seniority: "exec",   city: "Bilbao",    modality: "remoto",     salary: 7000, manager: 0 },
      { name: "Laura Cifuentes",  email: "laura.cifuentes",  role_title: "Head of People",           department: "People",      start_date: "2021-09-15", seniority: "lead",   city: "Madrid",    modality: "hibrido",    salary: 5200, manager: 0 },
      { name: "Pablo Requena",    email: "pablo.requena",    role_title: "Senior Backend Engineer",  department: "Ingeniería",  start_date: "2022-01-10", seniority: "senior", city: "Madrid",    modality: "remoto",     salary: 4600, manager: 1 },
      { name: "Nuria Salvat",     email: "nuria.salvat",     role_title: "Frontend Engineer",        department: "Ingeniería",  start_date: "2022-06-01", seniority: "mid",    city: "Barcelona", modality: "hibrido",    salary: 3800, manager: 1 },
      { name: "Diego Anta",       email: "diego.anta",       role_title: "DevOps Engineer",          department: "Ingeniería",  start_date: "2022-10-03", seniority: "senior", city: "Valencia",  modality: "remoto",     salary: 4800, manager: 1 },
      { name: "Carmen Boluda",    email: "carmen.boluda",    role_title: "Product Manager",          department: "Producto",    start_date: "2023-02-13", seniority: "senior", city: "Madrid",    modality: "hibrido",    salary: 5000, manager: 0 },
      { name: "Xavier Pons",      email: "xavier.pons",      role_title: "Product Designer",         department: "Producto",    start_date: "2023-05-08", seniority: "mid",    city: "Barcelona", modality: "hibrido",    salary: 3600, manager: 6 },
      { name: "Alicia Vega",      email: "alicia.vega",      role_title: "QA Engineer",              department: "Ingeniería",  start_date: "2024-01-15", seniority: "junior", city: "Sevilla",   modality: "remoto",     salary: 2800, manager: 1 },
      { name: "Sergio Llanos",    email: "sergio.llanos",    role_title: "Data Engineer",            department: "Ingeniería",  start_date: "2024-04-01", seniority: "mid",    city: "Madrid",    modality: "hibrido",    salary: 4000, manager: 1 },
      { name: "Beatriz Ochoa",    email: "beatriz.ochoa",    role_title: "Customer Success Manager", department: "Operaciones", start_date: "2025-02-03", seniority: "mid",    city: "Madrid",    modality: "hibrido",    salary: 3200, manager: 2 },
      { name: "Hugo Manrique",    email: "hugo.manrique",    role_title: "Sales Executive",          department: "Ventas",      start_date: "2025-09-01", seniority: "mid",    city: "Madrid",    modality: "presencial", salary: 3000, manager: 0 },
    ],
    benefits: ["Seguro médico", "Ticket restaurante", "Presupuesto de formación"],
    phonePrefix: "+34 6",
    jobs: [
      { title: "Senior Full-Stack Engineer (Next.js)", department: "Ingeniería", sector: "Tecnología", location: "Madrid (híbrido)", city: "Madrid", cc: "ES", min: 52000, max: 65000, skills: ["TypeScript", "React", "Next.js", "PostgreSQL", "Node.js"],
        description: "Buscamos un/a full-stack senior para el núcleo de nuestra plataforma de observabilidad: Next.js App Router, Postgres y una capa de ingestión de eventos de alto volumen. Trabajarás con producto desde el descubrimiento y desplegarás a diario." },
      { title: "Platform Engineer (SRE)", department: "Ingeniería", sector: "Tecnología", location: "Remoto (España)", city: null, cc: "ES", min: 55000, max: 70000, skills: ["Kubernetes", "AWS", "Docker", "Terraform", "Go"],
        description: "Responsable de fiabilidad y coste de la plataforma: clústeres EKS, IaC con Terraform, observabilidad interna y guardias sostenibles. Remoto desde cualquier punto de España." },
      { title: "Product Manager — Growth", department: "Producto", sector: "Tecnología", location: "Madrid (híbrido)", city: "Madrid", cc: "ES", min: 48000, max: 60000, skills: ["Gestión de proyectos", "SQL", "Marketing"],
        description: "PM de growth para el funnel self-serve: activación, pricing y experimentación. Trabajarás con datos (SQL propio) y con diseño en ciclos de dos semanas." },
      { title: "Data Analyst", department: "Datos", sector: "Tecnología", location: "Barcelona (híbrido)", city: "Barcelona", cc: "ES", min: 34000, max: 42000, skills: ["SQL", "Python", "Excel"],
        description: "Primer perfil 100% analítico del equipo: modelado en dbt, dashboards de producto y soporte a ventas con datos. Reportarás al Data Engineer y trabajarás con toda la compañía." },
      { title: "Technical Support Specialist", department: "Operaciones", sector: "Tecnología", location: "Remoto (España)", city: null, cc: "ES", min: 26000, max: 32000, skills: ["Atención al cliente", "SQL", "JavaScript"],
        description: "Soporte técnico N1/N2 para clientes SaaS B2B: debugging de integraciones, docs y voz del cliente hacia producto. Horario europeo, remoto." },
    ],
    candidates: [
      { name: "Elena Baraja",       email: "elena.baraja@demomail.dev",       phone: "+34 611 22 33 44", location: "Madrid, España",    city: "Madrid",    cc: "ES", years: 7, skills: ["TypeScript", "React", "Next.js", "Node.js"], job: 0, stage: "Entrevista", fit: 88, summary: "Full-stack con 7 años en SaaS B2B; lideró migración a App Router en su empresa actual." },
      { name: "Rodrigo Almeida",    email: "rodrigo.almeida@demomail.dev",    phone: "+34 622 33 44 55", location: "Lisboa, Portugal",  city: "Lisboa",    cc: "PT", years: 6, skills: ["TypeScript", "React", "PostgreSQL"],          job: 0, stage: "Screening",  fit: 74, summary: "Frontend fuerte con experiencia en design systems; backend en crecimiento." },
      { name: "Sofía Garmendia",    email: "sofia.garmendia@demomail.dev",    phone: "+34 633 44 55 66", location: "Donostia, España",  city: "Donostia",  cc: "ES", years: 9, skills: ["Kubernetes", "AWS", "Terraform", "Go"],       job: 1, stage: "Oferta",     fit: 92, summary: "SRE con 9 años; redujo el coste de infraestructura un 35% en su último rol." },
      { name: "Marc Vilalta",       email: "marc.vilalta@demomail.dev",       phone: "+34 644 55 66 77", location: "Barcelona, España", city: "Barcelona", cc: "ES", years: 4, skills: ["Docker", "Kubernetes", "Python"],             job: 1, stage: "Aplicado",   fit: 61, summary: "DevOps mid con base sólida en CI/CD; sin experiencia previa en Terraform." },
      { name: "Irene Zubiri",       email: "irene.zubiri@demomail.dev",       phone: "+34 655 66 77 88", location: "Madrid, España",    city: "Madrid",    cc: "ES", years: 8, skills: ["Gestión de proyectos", "SQL"],                job: 2, stage: "Entrevista", fit: 81, summary: "PM de growth en marketplace; experimentos de pricing con impacto directo en ARR." },
      { name: "Tomás Echeverría",   email: "tomas.echeverria@demomail.dev",   phone: "+34 666 77 88 99", location: "Zaragoza, España",  city: "Zaragoza",  cc: "ES", years: 3, skills: ["SQL", "Python", "Excel"],                     job: 3, stage: "Screening",  fit: 77, summary: "Analista con 3 años en consultoría; dbt y Looker en proyectos recientes." },
      { name: "Claudia Miró",       email: "claudia.miro@demomail.dev",       phone: "+34 677 88 99 00", location: "Barcelona, España", city: "Barcelona", cc: "ES", years: 2, skills: ["SQL", "Excel"],                               job: 3, stage: "Aplicado",   fit: 58, summary: "Junior con buena base estadística; poca experiencia con Python en producción." },
      { name: "Andrés Quintana",    email: "andres.quintana@demomail.dev",    phone: "+34 688 99 00 11", location: "Sevilla, España",   city: "Sevilla",   cc: "ES", years: 5, skills: ["Atención al cliente", "SQL", "JavaScript"],   job: 4, stage: "Entrevista", fit: 84, summary: "Soporte técnico en dos SaaS; top performer en CSAT dos años seguidos." },
      { name: "Paula Berrocal",     email: "paula.berrocal@demomail.dev",     phone: "+34 699 00 11 22", location: "Valencia, España",  city: "Valencia",  cc: "ES", years: 1, skills: ["Atención al cliente"],                        job: 4, stage: "Descartado", fit: 39, summary: "Perfil de soporte generalista; sin experiencia técnica demostrable.", rejected: true },
      { name: "Nikola Petrov",      email: "nikola.petrov@demomail.dev",      phone: "+34 600 11 22 33", location: "Madrid, España",    city: "Madrid",    cc: "ES", years: 10, skills: ["Go", "Kubernetes", "AWS", "PostgreSQL"],     job: 1, stage: "Screening",  fit: 79, summary: "Backend/platform con 10 años; busca su primer rol 100% SRE." },
    ],
    absences: (e) => [
      { emp: 4,  type: "Vacaciones",          start: daysAgo(20), end: daysAgo(14), days: 5, status: "approved" },
      { emp: 3,  type: "Cita médica",         start: daysAgo(6),  end: daysAgo(6),  days: 1, status: "approved" },
      { emp: 8,  type: "Vacaciones",          start: daysFromNow(10), end: daysFromNow(21), days: 8, status: "pending" },
      { emp: 9,  type: "Formación",           start: daysFromNow(30), end: daysFromNow(31), days: 2, status: "pending" },
      { emp: 6,  type: "Vacaciones",          start: daysFromNow(4),  end: daysFromNow(8),  days: 3, status: "approved" },
    ],
    timeEmployees: [3, 4, 8],
    draftRun: { period_label: "Julio 2026", period_month: "2026-07", entity_name: "Nordia Labs SL" },
  },
  {
    name: "Café Andino",
    slug: "cafe-andino",
    description: "Cadena de cafeterías de especialidad con tres locales en Caracas. Café venezolano de origen y repostería propia.",
    website: "https://cafeandino.demo",
    address: "Av. Principal de Las Mercedes, Caracas 1060",
    country: "VE",
    rif: "J-40123456-7",
    currency: "USD",
    timezone: "America/Caracas",
    userDomain: "cafeandino.demo",
    scheduleName: "Turno tienda (44h)",
    employees: [
      { name: "Ronald Pacheco",          email: "ronald.pacheco",   role_title: "Gerente General",           department: "Dirección", start_date: "2022-02-01", seniority: "exec",   city: "Caracas", modality: "presencial", salary: 1500, manager: null, national_id: "V-14582930" },
      { name: "María Alejandra Rondón",  email: "maria.rondon",     role_title: "Coordinadora de RRHH",      department: "RRHH",      start_date: "2022-05-16", seniority: "mid",    city: "Caracas", modality: "hibrido",    salary: 800,  manager: 0, national_id: "V-17845210" },
      { name: "José Gregorio Blanco",    email: "jose.blanco",      role_title: "Gerente de Tienda — Altamira", department: "Tiendas", start_date: "2022-08-01", seniority: "senior", city: "Caracas", modality: "presencial", salary: 900,  manager: 0, national_id: "V-15926384" },
      { name: "Yusmery Castillo",        email: "yusmery.castillo", role_title: "Gerente de Tienda — Las Mercedes", department: "Tiendas", start_date: "2023-01-09", seniority: "senior", city: "Caracas", modality: "presencial", salary: 900, manager: 0, national_id: "V-19034756" },
      { name: "Luis Cabrera",            email: "luis.cabrera",     role_title: "Jefe de Cocina",            department: "Cocina",    start_date: "2023-03-06", seniority: "senior", city: "Caracas", modality: "presencial", salary: 700,  manager: 0, national_id: "V-16273849" },
      { name: "Daniela Paredes",         email: "daniela.paredes",  role_title: "Barista",                   department: "Tiendas",   start_date: "2023-11-13", seniority: "junior", city: "Caracas", modality: "presencial", salary: 350,  manager: 2, national_id: "V-26154873" },
      { name: "Kevin Aponte",            email: "kevin.aponte",     role_title: "Barista",                   department: "Tiendas",   start_date: "2024-04-15", seniority: "junior", city: "Caracas", modality: "presencial", salary: 340,  manager: 3, national_id: "V-27381940", contract: "temporal" },
      { name: "Génesis Mora",            email: "genesis.mora",     role_title: "Barista",                   department: "Tiendas",   start_date: "2025-01-20", seniority: "junior", city: "Caracas", modality: "presencial", salary: 330,  manager: 3, national_id: "V-28471056" },
      { name: "Carla Urdaneta",          email: "carla.urdaneta",   role_title: "Cajera Principal",          department: "Tiendas",   start_date: "2024-09-02", seniority: "mid",    city: "Caracas", modality: "presencial", salary: 380,  manager: 2, national_id: "V-21563498" },
      { name: "Ángel Salazar",           email: "angel.salazar",    role_title: "Encargado de Compras",      department: "Operaciones", start_date: "2023-07-03", seniority: "mid",  city: "Caracas", modality: "hibrido",    salary: 600,  manager: 0, national_id: "V-18659742" },
    ],
    benefits: ["Cestaticket", "Comida en turno", "Bono de transporte"],
    phonePrefix: "+58 41",
    jobs: [
      { title: "Barista — Las Mercedes", department: "Tiendas", sector: "Hostelería", location: "Caracas, Venezuela", city: "Caracas", cc: "VE", min: 320, max: 400, skills: ["Atención al cliente", "Trabajo en equipo"],
        description: "Barista para nuestro local de Las Mercedes: espresso, métodos filtrados y atención en barra. Valoramos experiencia en café de especialidad; formamos en tostado y catación. Turnos rotativos, propinas compartidas." },
      { title: "Encargado de Turno", department: "Tiendas", sector: "Hostelería", location: "Caracas, Venezuela", city: "Caracas", cc: "VE", min: 500, max: 620, skills: ["Liderazgo", "Atención al cliente"],
        description: "Responsable de apertura/cierre, arqueo de caja y coordinación de un equipo de 4-6 personas por turno. Experiencia previa liderando equipos en hostelería o retail." },
      { title: "Ayudante de Cocina", department: "Cocina", sector: "Hostelería", location: "Caracas, Venezuela", city: "Caracas", cc: "VE", min: 300, max: 360, skills: ["Trabajo en equipo"],
        description: "Apoyo en producción de repostería y cocina de desayunos. Manipulación de alimentos al día; turnos de mañana principalmente." },
      { title: "Community Manager", department: "Marketing", sector: "Hostelería", location: "Caracas (híbrido)", city: "Caracas", cc: "VE", min: 450, max: 550, skills: ["Marketing", "Comunicación"],
        description: "Gestión de redes (Instagram/TikTok), contenido en tienda y campañas locales. Portafolio con métricas reales; se valora fotografía de producto." },
    ],
    candidates: [
      { name: "Oriana Ledezma",   email: "oriana.ledezma@demomail.dev",   phone: "+58 412 555 0101", location: "Caracas, Venezuela", city: "Caracas", cc: "VE", years: 2, skills: ["Atención al cliente"],            job: 0, stage: "Entrevista", fit: 82, summary: "Barista con 2 años en café de especialidad; latte art y métodos." },
      { name: "Jesús Manuel Rivas", email: "jesus.rivas@demomail.dev",    phone: "+58 414 555 0202", location: "Caracas, Venezuela", city: "Caracas", cc: "VE", years: 1, skills: ["Trabajo en equipo"],              job: 0, stage: "Aplicado",   fit: 55, summary: "Sin experiencia en café; actitud excelente en entrevista telefónica previa." },
      { name: "Vanessa Colmenares", email: "vanessa.colmenares@demomail.dev", phone: "+58 424 555 0303", location: "Caracas, Venezuela", city: "Caracas", cc: "VE", years: 5, skills: ["Liderazgo", "Atención al cliente"], job: 1, stage: "Oferta", fit: 90, summary: "Encargada en cadena de comida rápida 3 años; manejo de caja y equipos grandes." },
      { name: "Miguel Ángel Terán", email: "miguel.teran@demomail.dev",   phone: "+58 416 555 0404", location: "Los Teques, Venezuela", city: "Los Teques", cc: "VE", years: 4, skills: ["Liderazgo"],               job: 1, stage: "Screening",  fit: 68, summary: "Supervisor de retail; sin experiencia en hostelería." },
      { name: "Rosmary Gutiérrez", email: "rosmary.gutierrez@demomail.dev", phone: "+58 412 555 0505", location: "Caracas, Venezuela", city: "Caracas", cc: "VE", years: 3, skills: ["Trabajo en equipo"],           job: 2, stage: "Entrevista", fit: 76, summary: "Ayudante de repostería con certificado de manipulación vigente." },
      { name: "Deivis Marcano",   email: "deivis.marcano@demomail.dev",   phone: "+58 426 555 0606", location: "Caracas, Venezuela", city: "Caracas", cc: "VE", years: 1, skills: ["Trabajo en equipo"],              job: 2, stage: "Descartado", fit: 35, summary: "No disponible para turnos de mañana.", rejected: true },
      { name: "Andreína Bolívar", email: "andreina.bolivar@demomail.dev", phone: "+58 414 555 0707", location: "Caracas, Venezuela", city: "Caracas", cc: "VE", years: 4, skills: ["Marketing", "Comunicación"],      job: 3, stage: "Entrevista", fit: 87, summary: "CM freelance para dos marcas gastro; creció una cuenta de 3k a 40k." },
      { name: "Samuel Oropeza",   email: "samuel.oropeza@demomail.dev",   phone: "+58 412 555 0808", location: "Valencia, Venezuela", city: "Valencia", cc: "VE", years: 2, skills: ["Marketing"],                    job: 3, stage: "Aplicado",   fit: 60, summary: "Diseñador gráfico migrando a social media; buen portafolio visual." },
    ],
    absences: (e) => [
      { emp: 5, type: "Vacaciones",   start: daysAgo(30), end: daysAgo(16), days: 10, status: "approved" },
      { emp: 2, type: "Cita médica",  start: daysAgo(3),  end: daysAgo(3),  days: 1,  status: "approved" },
      { emp: 8, type: "Vacaciones",   start: daysFromNow(14), end: daysFromNow(25), days: 8, status: "pending" },
      { emp: 6, type: "Asunto propio", start: daysFromNow(7), end: daysFromNow(7), days: 1, status: "pending" },
    ],
    timeEmployees: [5, 7, 8],
  },
  {
    name: "Volta Energia",
    slug: "volta-energia",
    description: "Engenharia e manutenção de ativos de energia renovável — solar e eólica — para clientes industriais no Brasil.",
    website: "https://voltaenergia.demo",
    address: "Av. Paulista 1374, São Paulo - SP",
    country: "BR",
    currency: "BRL",
    timezone: "America/Sao_Paulo",
    userDomain: "voltaenergia.demo",
    scheduleName: "Jornada CLT (40h)",
    employees: [
      { name: "Renata Albuquerque",      email: "renata.albuquerque", role_title: "Diretora de Operações",     department: "Direção",     start_date: "2021-06-01", seniority: "exec",   city: "São Paulo",      modality: "hibrido",    salary: 22000, manager: null },
      { name: "Thiago Nascimento",       email: "thiago.nascimento",  role_title: "Gerente de Engenharia",     department: "Engenharia",  start_date: "2021-10-04", seniority: "lead",   city: "São Paulo",      modality: "hibrido",    salary: 17000, manager: 0 },
      { name: "Camila Sarmento",         email: "camila.sarmento",    role_title: "Analista de RH",            department: "RH",          start_date: "2022-03-14", seniority: "mid",    city: "São Paulo",      modality: "hibrido",    salary: 7500,  manager: 0 },
      { name: "João Pedro Furtado",      email: "joao.furtado",       role_title: "Engenheiro Eletricista Sr", department: "Engenharia",  start_date: "2022-07-18", seniority: "senior", city: "Campinas",       modality: "presencial", salary: 13000, manager: 1 },
      { name: "Larissa Prado",           email: "larissa.prado",      role_title: "Engenheira de Projetos",    department: "Engenharia",  start_date: "2023-04-03", seniority: "mid",    city: "São Paulo",      modality: "hibrido",    salary: 11000, manager: 1 },
      { name: "Marcos Vinícius Teixeira", email: "marcos.teixeira",   role_title: "Técnico de Manutenção",     department: "Operações",   start_date: "2023-09-11", seniority: "mid",    city: "Sorocaba",       modality: "presencial", salary: 5200,  manager: 3 },
      { name: "Fernanda Cardoso",        email: "fernanda.cardoso",   role_title: "Analista Financeiro",       department: "Financeiro",  start_date: "2024-02-05", seniority: "mid",    city: "São Paulo",      modality: "hibrido",    salary: 8500,  manager: 0 },
      { name: "Gustavo Henrique Lima",   email: "gustavo.lima",       role_title: "Técnico de Campo",          department: "Operações",   start_date: "2025-05-12", seniority: "junior", city: "Ribeirão Preto", modality: "presencial", salary: 4800,  manager: 3, contract: "temporal" },
    ],
    benefits: ["Vale refeição", "Plano de saúde", "Vale transporte"],
    phonePrefix: "+55 11 9",
    jobs: [
      { title: "Engenheiro(a) de Energia Solar", department: "Engenharia", sector: "Energía", location: "São Paulo, Brasil", city: "São Paulo", cc: "BR", min: 9000, max: 13000, skills: ["Gestión de proyectos", "Excel"],
        description: "Dimensionamento e comissionamento de plantas fotovoltaicas industriais (1-10 MWp). CREA ativo, disponibilidade para viagens quinzenais e experiência com PVsyst." },
      { title: "Técnico(a) de Manutenção Eólica", department: "Operações", sector: "Energía", location: "Sorocaba, Brasil", city: "Sorocaba", cc: "BR", min: 4500, max: 6000, skills: ["Trabajo en equipo"],
        description: "Manutenção preventiva e corretiva de aerogeradores. NR-35 e NR-10 vigentes obrigatórias; regime de campo 14x7 com adicional." },
      { title: "Analista de Suprimentos", department: "Operações", sector: "Energía", location: "São Paulo (híbrido)", city: "São Paulo", cc: "BR", min: 5500, max: 7000, skills: ["Excel", "SQL"],
        description: "Compras técnicas e gestão de fornecedores de componentes elétricos. Cotações internacionais, follow-up de importação e KPIs de suprimentos." },
    ],
    candidates: [
      { name: "Bruno Cavalcanti", email: "bruno.cavalcanti@demomail.dev", phone: "+55 11 98555 0101", location: "São Paulo, Brasil", city: "São Paulo", cc: "BR", years: 6, skills: ["Gestión de proyectos", "Excel"], job: 0, stage: "Entrevista", fit: 85, summary: "Engenheiro eletricista com 6 anos em EPC solar; comissionou 40+ MWp." },
      { name: "Aline Rezende",    email: "aline.rezende@demomail.dev",    phone: "+55 19 98555 0202", location: "Campinas, Brasil", city: "Campinas", cc: "BR", years: 3, skills: ["Excel"],                          job: 0, stage: "Screening",  fit: 64, summary: "Engenheira júnior-pleno; projetos residenciais, sem porte industrial." },
      { name: "Wesley Fonseca",   email: "wesley.fonseca@demomail.dev",   phone: "+55 15 98555 0303", location: "Sorocaba, Brasil", city: "Sorocaba", cc: "BR", years: 5, skills: ["Trabajo en equipo"],              job: 1, stage: "Oferta",     fit: 91, summary: "Técnico eólico com NR-35/NR-10 vigentes; 5 anos em O&M de parques." },
      { name: "Patrícia Lourenço", email: "patricia.lourenco@demomail.dev", phone: "+55 11 98555 0404", location: "São Paulo, Brasil", city: "São Paulo", cc: "BR", years: 4, skills: ["Excel", "SQL"],              job: 2, stage: "Entrevista", fit: 79, summary: "Analista de compras técnicas em metalúrgica; SAP MM e cotações internacionais." },
      { name: "Diego Sant'Anna",  email: "diego.santanna@demomail.dev",   phone: "+55 11 98555 0505", location: "Guarulhos, Brasil", city: "Guarulhos", cc: "BR", years: 2, skills: ["Excel"],                       job: 2, stage: "Aplicado",   fit: 57, summary: "Comprador júnior; sem experiência no setor elétrico." },
      { name: "Juliana Peçanha",  email: "juliana.pecanha@demomail.dev",  phone: "+55 21 98555 0606", location: "Rio de Janeiro, Brasil", city: "Rio de Janeiro", cc: "BR", years: 8, skills: ["Gestión de proyectos"], job: 0, stage: "Aplicado", fit: 70, summary: "PM de infraestrutura migrando para renováveis; PMP ativo." },
    ],
    absences: (e) => [
      { emp: 4, type: "Vacaciones",  start: daysAgo(25), end: daysAgo(11), days: 10, status: "approved" },
      { emp: 5, type: "Baja por enfermedad", start: daysAgo(4), end: daysAgo(2), days: 3, status: "approved" },
      { emp: 3, type: "Vacaciones",  start: daysFromNow(20), end: daysFromNow(34), days: 10, status: "pending" },
      { emp: 6, type: "Cita médica", start: daysFromNow(5), end: daysFromNow(5), days: 1, status: "pending" },
    ],
    timeEmployees: [4, 5, 6],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers idempotentes
// ─────────────────────────────────────────────────────────────────────────────

async function ensureCompany(def) {
  const { data: existing, error: selErr } = await db
    .from("companies").select("id").eq("slug", def.slug).maybeSingle();
  if (selErr) throw new Error(`select company: ${selErr.message}`);
  if (existing) return { id: existing.id, created: false };

  const { data, error } = await db
    .from("companies")
    .insert({
      name: def.name,
      slug: def.slug,
      description: def.description,
      website: def.website,
      address: def.address,
      country: def.country,
      country_pack: "generic",
      ...(def.rif ? { rif: def.rif } : {}),
    })
    .select("id")
    .single();
  if (error) throw new Error(`insert company: ${error.message}`);
  return { id: data.id, created: true };
}

let _usersCache = null;
async function findUserByEmail(email) {
  if (!_usersCache) {
    _usersCache = [];
    let page = 1;
    for (;;) {
      const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw new Error(`listUsers: ${error.message}`);
      _usersCache.push(...data.users);
      if (data.users.length < 1000) break;
      page += 1;
    }
  }
  return _usersCache.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

async function ensureUser(email) {
  const existing = await findUserByEmail(email);
  if (existing) return existing.id;
  const { data, error } = await db.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error) throw new Error(`createUser ${email}: ${error.message}`);
  _usersCache?.push(data.user);
  return data.user.id;
}

async function ensureMember(companyId, userId, role) {
  const { data: existing } = await db
    .from("company_members").select("id").eq("user_id", userId).maybeSingle();
  if (existing) return false;
  const { error } = await db.from("company_members").insert({
    company_id: companyId,
    user_id: userId,
    role,
    joined_at: new Date().toISOString(),
  });
  if (error) throw new Error(`insert member (${role}): ${error.message}`);
  return true;
}

// Réplica exacta de lib/hris-seed.ts (seedHrisDefaults) — no importable desde .mjs.
// Misma guarda de idempotencia: si ya hay absence_types, no hace nada.
async function seedHrisDefaults(companyId) {
  const { data: existing } = await db
    .from("absence_types").select("id").eq("company_id", companyId).limit(1);
  if (existing && existing.length > 0) return;

  const { data: allowanceType, error: atErr } = await db
    .from("allowance_types")
    .insert({ name: "Días de vacaciones", unit: "days", company_id: companyId })
    .select()
    .single();
  if (atErr || !allowanceType) throw new Error(`allowance_types: ${atErr?.message}`);

  const { error: apErr } = await db.from("allowance_policies").insert({
    name: "Política estándar (22 días)",
    amount: 22,
    cycle_type: "annual",
    assignment_timing: "start_of_cycle",
    expiry_rule: "after_period",
    expiry_period_months: 3,
    carryover_limit: 5,
    allow_negative: false,
    is_default: true,
    company_id: companyId,
    allowance_type_id: allowanceType.id,
  });
  if (apErr) throw new Error(`allowance_policies: ${apErr.message}`);

  const TYPES = [
    { name: "Vacaciones",          color: "#0E5C4A", icon: "🌴", requires_approval: true,  deducts_from_allowance: true,  is_public: true, requires_document: false, allow_half_day: true  },
    { name: "Baja por enfermedad", color: "#946312", icon: "🤒", requires_approval: false, deducts_from_allowance: false, is_public: true, requires_document: false, allow_half_day: false },
    { name: "Permiso familiar",    color: "#2B5E8A", icon: "👨‍👩‍👧", requires_approval: true,  deducts_from_allowance: false, is_public: true, requires_document: false, allow_half_day: true  },
    { name: "Asunto propio",       color: "#5A4C86", icon: "📋", requires_approval: true,  deducts_from_allowance: false, is_public: true, requires_document: false, allow_half_day: true  },
    { name: "Cita médica",         color: "#BD4332", icon: "🏥", requires_approval: true,  deducts_from_allowance: false, is_public: true, requires_document: false, allow_half_day: true  },
    { name: "Formación",           color: "#1B6B4F", icon: "🎓", requires_approval: true,  deducts_from_allowance: false, is_public: true, requires_document: false, allow_half_day: false },
  ];
  const { error: abErr } = await db.from("absence_types").insert(
    TYPES.map((t) => ({
      ...t,
      company_id: companyId,
      allowance_type_id: t.deducts_from_allowance ? allowanceType.id : null,
    })),
  );
  if (abErr) throw new Error(`absence_types: ${abErr.message}`);
}

// Plantilla de horario por defecto (L-V 09:00-17:00, 8h/día) — mismo shape que
// crea POST /api/schedule-templates (template → week → days).
async function ensureScheduleTemplate(companyId, name) {
  const { data: existing } = await db
    .from("work_schedule_templates")
    .select("id").eq("company_id", companyId).eq("is_default", true).maybeSingle();
  if (existing) return existing.id;

  const { data: tpl, error: tplErr } = await db
    .from("work_schedule_templates")
    .insert({ company_id: companyId, name, week_type: "single", is_default: true, is_active: true })
    .select("id")
    .single();
  if (tplErr) throw new Error(`schedule template: ${tplErr.message}`);

  const { data: week, error: wkErr } = await db
    .from("work_schedule_weeks")
    .insert({ template_id: tpl.id, week_label: "A", week_index: 0 })
    .select("id")
    .single();
  if (wkErr) throw new Error(`schedule week: ${wkErr.message}`);

  const days = [0, 1, 2, 3, 4, 5, 6].map((d) => ({
    week_id: week.id,
    day_of_week: d,
    is_working_day: d < 5,
    slots: d < 5 ? [{ start: "09:00", end: "17:00" }] : [],
    total_minutes: d < 5 ? 480 : 0,
  }));
  const { error: dayErr } = await db.from("work_schedule_days").insert(days);
  if (dayErr) throw new Error(`schedule days: ${dayErr.message}`);
  return tpl.id;
}

// Catálogo de skills (patrón resolveSkillIds de lib/skills.ts): nombre o alias,
// crea la skill si no existe.
let _skillsCache = null;
async function resolveSkillId(name) {
  if (!_skillsCache) {
    const { data, error } = await db.from("skills").select("id, name, aliases");
    if (error) throw new Error(`select skills: ${error.message}`);
    _skillsCache = data;
  }
  const lower = name.toLowerCase();
  const hit = _skillsCache.find(
    (s) => s.name.toLowerCase() === lower || (s.aliases ?? []).some((a) => a.toLowerCase() === lower),
  );
  if (hit) return hit.id;
  const { data, error } = await db.from("skills").insert({ name }).select("id, name, aliases").single();
  if (error) throw new Error(`insert skill ${name}: ${error.message}`);
  _skillsCache.push(data);
  return data.id;
}

// ─────────────────────────────────────────────────────────────────────────────
// Seed por empresa
// ─────────────────────────────────────────────────────────────────────────────

async function seedCompany(def) {
  console.log(`\n━━ ${def.name} ━━`);

  // 1. Empresa
  let companyId;
  try {
    const r = await ensureCompany(def);
    companyId = r.id;
    console.log(`  empresa: ${r.created ? "creada" : "ya existía"} (${companyId})`);
  } catch (e) {
    fail(def.name, "company", e.message);
    return null;
  }

  // 2. Users + membership
  const roles = [
    ["owner", `owner@${def.userDomain}`],
    ["hr_admin", `hr@${def.userDomain}`],
    ["recruiter", `recruiter@${def.userDomain}`],
  ];
  let ownerId = null;
  try {
    let created = 0;
    for (const [role, email] of roles) {
      const uid = await ensureUser(email);
      if (role === "owner") ownerId = uid;
      if (await ensureMember(companyId, uid, role)) created += 1;
    }
    console.log(`  members: ${created} nuevos / ${roles.length} totales`);
  } catch (e) {
    fail(def.name, "users/members", e.message);
  }

  // 3. HRIS defaults + plantilla de horario
  let policyId = null;
  let templateId = null;
  try {
    await seedHrisDefaults(companyId);
    templateId = await ensureScheduleTemplate(companyId, def.scheduleName);
    const { data: pol } = await db
      .from("allowance_policies").select("id")
      .eq("company_id", companyId).eq("is_default", true).limit(1).maybeSingle();
    policyId = pol?.id ?? null;
    console.log(`  hris defaults: ok (policy ${policyId ? "✓" : "✗"}, template ✓)`);
  } catch (e) {
    fail(def.name, "hris-defaults", e.message);
  }

  // 4. Empleados (con cadena de managers) + allowances + schedules
  const employeeIds = [];
  try {
    let created = 0;
    for (const emp of def.employees) {
      const email = `${emp.email}@${def.userDomain}`;
      const { data: existing } = await db
        .from("employees").select("id").eq("company_id", companyId).eq("email", email).maybeSingle();
      if (existing) {
        employeeIds.push(existing.id);
        continue;
      }
      const managerId = emp.manager != null ? employeeIds[emp.manager] ?? null : null;
      const phone = `${def.phonePrefix}${String(10000000 + Math.floor(Math.random() * 89999999)).slice(0, 8)}`;
      const { data, error } = await db
        .from("employees")
        .insert({
          company_id: companyId,
          name: emp.name,
          email,
          role_title: emp.role_title,
          department: emp.department,
          start_date: emp.start_date,
          contract_type: emp.contract ?? "indefinido",
          manager_id: managerId,
          phone,
          seniority_level: emp.seniority,
          country: def.country,
          city: emp.city,
          work_modality: emp.modality,
          benefits: def.benefits,
          ...(emp.national_id ? { national_id: emp.national_id } : {}),
          status: "active",
        })
        .select("id")
        .single();
      if (error) throw new Error(`employee ${emp.name}: ${error.message}`);
      employeeIds.push(data.id);
      created += 1;

      // Mismo patrón que POST /api/employees: asignar policy + schedule por defecto
      if (policyId) {
        await db.from("employee_allowances").insert({
          employee_id: data.id, policy_id: policyId, valid_from: emp.start_date, valid_until: null,
        });
      }
      if (templateId) {
        await db.from("employee_schedules").insert({
          employee_id: data.id, template_id: templateId, valid_from: emp.start_date, valid_until: null,
        });
      }
    }
    console.log(`  employees: ${created} nuevos / ${employeeIds.length} totales`);
  } catch (e) {
    fail(def.name, "employees", e.message);
  }

  // 5. Ausencias
  try {
    const { data: types } = await db
      .from("absence_types").select("id, name").eq("company_id", companyId);
    const typeByName = Object.fromEntries((types ?? []).map((t) => [t.name, t.id]));
    const hrEmployeeId = employeeIds[def.employees.findIndex((e) => /RRHH|People|RH/i.test(e.department))] ?? employeeIds[0];
    let created = 0;
    for (const a of def.absences()) {
      const employeeId = employeeIds[a.emp];
      const typeId = typeByName[a.type];
      if (!employeeId || !typeId) throw new Error(`ausencia sin empleado/tipo (${a.type})`);
      const { data: dup } = await db
        .from("absence_requests").select("id")
        .eq("employee_id", employeeId).eq("start_date", a.start).limit(1).maybeSingle();
      if (dup) continue;
      const { error } = await db.from("absence_requests").insert({
        company_id: companyId,
        employee_id: employeeId,
        created_by_employee_id: employeeId,
        absence_type_id: typeId,
        start_date: a.start,
        end_date: a.end,
        working_days_count: a.days,
        status: a.status,
        ...(a.status === "approved"
          ? { approved_by_employee_id: hrEmployeeId, approved_at: new Date().toISOString() }
          : {}),
      });
      if (error) throw new Error(error.message);
      created += 1;
    }
    console.log(`  absence_requests: ${created} nuevas`);
  } catch (e) {
    fail(def.name, "absences", e.message);
  }

  // 6. Fichajes (últimos 5 días laborables, 09:00-17:30 con matices)
  try {
    let created = 0;
    for (const idx of def.timeEmployees) {
      const employeeId = employeeIds[idx];
      if (!employeeId) continue;
      let added = 0;
      for (let back = 1; added < 5 && back < 12; back += 1) {
        const d = new Date();
        d.setDate(d.getDate() - back);
        if (d.getDay() === 0 || d.getDay() === 6) continue; // fin de semana
        const date = d.toISOString().split("T")[0];
        added += 1;
        const { data: dup } = await db
          .from("time_entries").select("id")
          .eq("employee_id", employeeId).eq("date", date).limit(1).maybeSingle();
        if (dup) continue;
        const startMin = 9 * 60 + (idx % 3) * 10 + (added % 2) * 5;
        const durationMin = 8 * 60 + (added % 3) * 15 - (idx % 2) * 10;
        const start = new Date(`${date}T00:00:00Z`);
        start.setUTCMinutes(startMin);
        const end = new Date(start.getTime() + durationMin * 60000);
        const { error } = await db.from("time_entries").insert({
          company_id: companyId,
          employee_id: employeeId,
          date,
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          duration_minutes: durationMin,
          entry_type: "work",
          source: "manual",
          timezone: def.timezone,
        });
        if (error) throw new Error(error.message);
        created += 1;
      }
    }
    console.log(`  time_entries: ${created} nuevas`);
  } catch (e) {
    fail(def.name, "time-entries", e.message);
  }

  // 7. ATS: jobs + stages + skills estructuradas
  const jobIds = [];
  const stagesByJob = {}; // jobId -> {stageName: stageId}
  try {
    const DEFAULT_STAGES = [
      { name: "Aplicado", order_index: 0, is_terminal: false },
      { name: "Screening", order_index: 1, is_terminal: false },
      { name: "Entrevista", order_index: 2, is_terminal: false },
      { name: "Oferta", order_index: 3, is_terminal: false },
      { name: "Contratado", order_index: 4, is_terminal: true },
      { name: "Descartado", order_index: 5, is_terminal: true },
    ];
    let created = 0;
    for (const job of def.jobs) {
      const hash = dedupeHash(job.title, job.location);
      let jobId;
      const { data: existing } = await db
        .from("jobs").select("id").eq("company_id", companyId).eq("dedupe_hash", hash).maybeSingle();
      if (existing) {
        jobId = existing.id;
      } else {
        const { data, error } = await db
          .from("jobs")
          .insert({
            company_id: companyId,
            title: job.title,
            description: job.description,
            skills: job.skills,
            salary_min: job.min,
            salary_max: job.max,
            salary_currency: def.currency,
            location: job.location,
            city: job.city,
            country_code: job.cc,
            employment_type: "full_time",
            sector: job.sector,
            department: job.department,
            experience_min_years: 0,
            status: "active",
            source: "manual",
            dedupe_hash: hash,
            created_by: ownerId,
          })
          .select("id")
          .single();
        if (error) throw new Error(`job ${job.title}: ${error.message}`);
        jobId = data.id;
        created += 1;
        // job_skills contra el catálogo canónico (patrón de POST /api/jobs)
        for (const s of job.skills) {
          const skillId = await resolveSkillId(s);
          await db.from("job_skills").insert({ job_id: jobId, skill_id: skillId });
        }
      }
      jobIds.push(jobId);

      // Stages (pipeline por defecto de lib/types.ts)
      const { data: stages } = await db.from("job_stages").select("id, name").eq("job_id", jobId);
      if (!stages || stages.length === 0) {
        const { data: inserted, error: stErr } = await db
          .from("job_stages")
          .insert(DEFAULT_STAGES.map((s) => ({ ...s, job_id: jobId })))
          .select("id, name");
        if (stErr) throw new Error(`stages ${job.title}: ${stErr.message}`);
        stagesByJob[jobId] = Object.fromEntries(inserted.map((s) => [s.name, s.id]));
      } else {
        stagesByJob[jobId] = Object.fromEntries(stages.map((s) => [s.name, s.id]));
      }
    }
    console.log(`  jobs: ${created} nuevas / ${jobIds.length} totales (con stages)`);
  } catch (e) {
    fail(def.name, "jobs", e.message);
  }

  // 8. Candidatos + aplicaciones repartidas por etapas
  try {
    let created = 0;
    for (const c of def.candidates) {
      const jobId = jobIds[c.job];
      if (!jobId) continue;
      let candidateId;
      const { data: existing } = await db
        .from("candidates").select("id").ilike("email", c.email).maybeSingle();
      if (existing) {
        candidateId = existing.id;
      } else {
        const { data, error } = await db
          .from("candidates")
          .insert({
            name: c.name,
            email: c.email,
            phone: c.phone,
            location: c.location,
            city: c.city,
            country_code: c.cc,
            skills: c.skills,
            experience_years: c.years,
            summary: c.summary,
            source: "career_site",
          })
          .select("id")
          .single();
        if (error) throw new Error(`candidate ${c.name}: ${error.message}`);
        candidateId = data.id;
        // candidate_skills contra el catálogo
        for (const s of c.skills) {
          const skillId = await resolveSkillId(s);
          await db.from("candidate_skills")
            .insert({ candidate_id: candidateId, skill_id: skillId, source: "manual" });
        }
      }

      const { data: dupApp } = await db
        .from("applications").select("id")
        .eq("job_id", jobId).eq("candidate_id", candidateId).maybeSingle();
      if (dupApp) continue;

      const stageId = stagesByJob[jobId]?.[c.stage] ?? null;
      const { data: app, error: appErr } = await db
        .from("applications")
        .insert({
          job_id: jobId,
          candidate_id: candidateId,
          stage_id: stageId,
          fit_score: c.fit,
          source: "career_site",
          status: c.rejected ? "rejected" : "open",
        })
        .select("id")
        .single();
      if (appErr) throw new Error(`application ${c.name}: ${appErr.message}`);
      await db.from("application_events").insert({
        application_id: app.id,
        type: "created",
        to_stage: "Aplicado",
        actor_email: `recruiter@${def.userDomain}`,
      });
      created += 1;
    }
    console.log(`  candidates/applications: ${created} aplicaciones nuevas`);
  } catch (e) {
    fail(def.name, "candidates", e.message);
  }

  // 9. Payroll: pay_profiles (sin runs aprobados)
  try {
    let created = 0;
    for (let i = 0; i < def.employees.length; i += 1) {
      const employeeId = employeeIds[i];
      if (!employeeId) continue;
      const emp = def.employees[i];
      const { data: active } = await db
        .from("pay_profiles").select("id")
        .eq("company_id", companyId).eq("employee_id", employeeId)
        .is("effective_to", null).maybeSingle();
      if (active) continue;
      // Mismo shape que PUT /api/payroll/profiles/[employeeId]
      const { error } = await db.from("pay_profiles").insert({
        company_id: companyId,
        employee_id: employeeId,
        base_salary: emp.salary,
        currency: def.currency,
        frequency: "monthly",
        effective_from: emp.start_date,
        effective_to: null,
        payment_method: "transfer",
        bank_name: def.country === "ES" ? "BBVA" : def.country === "VE" ? "Banesco" : "Itaú",
        bank_account_last4: String(1000 + ((i * 37) % 9000)),
        country_pack: "generic",
        employer_cost: null,
      });
      if (error) throw new Error(`pay_profile ${emp.name}: ${error.message}`);
      created += 1;
    }
    console.log(`  pay_profiles: ${created} nuevos`);
  } catch (e) {
    fail(def.name, "pay-profiles", e.message);
  }

  // 10. Un pay_run DRAFT solo para Nordia (pack generic: net = gross = employer_cost)
  if (def.draftRun) {
    try {
      const { data: dup } = await db
        .from("pay_runs").select("id")
        .eq("company_id", companyId)
        .eq("period_month", def.draftRun.period_month)
        .eq("entity_name", def.draftRun.entity_name)
        .maybeSingle();
      if (dup) {
        console.log("  pay_run draft: ya existía");
      } else {
        const { data: run, error: runErr } = await db
          .from("pay_runs")
          .insert({
            company_id: companyId,
            period_label: def.draftRun.period_label,
            period_month: def.draftRun.period_month,
            entity_name: def.draftRun.entity_name,
            run_type: "monthly",
            status: "draft",
            currency: def.currency,
          })
          .select("id")
          .single();
        if (runErr) throw new Error(runErr.message);

        let gross = 0;
        let count = 0;
        for (let i = 0; i < def.employees.length; i += 1) {
          const employeeId = employeeIds[i];
          if (!employeeId) continue;
          const salary = def.employees[i].salary;
          const { data: line, error: lineErr } = await db
            .from("pay_run_lines")
            .insert({
              pay_run_id: run.id,
              employee_id: employeeId,
              gross: salary,
              net: salary,          // pack generic: sin retenciones
              employer_cost: salary, // pack generic: sin cargas
              status: "draft",
            })
            .select("id")
            .single();
          if (lineErr) throw new Error(lineErr.message);
          await db.from("pay_run_line_items").insert({
            line_id: line.id,
            category: "earning",
            label: "Salario base",
            amount: salary,
            quantity_label: "Mes completo",
            order_index: 0,
          });
          gross += salary;
          count += 1;
        }
        await db.from("pay_runs").update({
          gross, net: gross, employer_cost: gross, employee_count: count,
        }).eq("id", run.id);
        await db.from("pay_run_audit_log").insert({
          pay_run_id: run.id,
          text: `Líneas generadas: ${count} empleados.`,
          who: "Seed demo",
        });
        console.log(`  pay_run draft: creado (${count} líneas, gross ${gross} ${def.currency})`);
      }
    } catch (e) {
      fail(def.name, "pay-run-draft", e.message);
    }
  }

  return companyId;
}

// ─────────────────────────────────────────────────────────────────────────────
// Verificación
// ─────────────────────────────────────────────────────────────────────────────

async function countIn(table, col, values) {
  if (!values.length) return 0;
  const { count, error } = await db.from(table).select("id", { count: "exact", head: true }).in(col, values);
  if (error) return `err: ${error.message}`;
  return count ?? 0;
}

async function summarize(def, companyId) {
  const eq = async (table) => {
    const { count, error } = await db
      .from(table).select("id", { count: "exact", head: true }).eq("company_id", companyId);
    return error ? `err: ${error.message}` : count ?? 0;
  };
  const { data: jobs } = await db.from("jobs").select("id").eq("company_id", companyId);
  const jobIds = (jobs ?? []).map((j) => j.id);
  return {
    empresa: def.name,
    members: await eq("company_members"),
    employees: await eq("employees"),
    jobs: jobIds.length,
    applications: await countIn("applications", "job_id", jobIds),
    absences: await eq("absence_requests"),
    time_entries: await eq("time_entries"),
    pay_profiles: await eq("pay_profiles"),
    pay_runs: await eq("pay_runs"),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

const ids = {};
for (const def of COMPANIES) {
  const id = await seedCompany(def);
  if (id) ids[def.slug] = id;
}

console.log("\n━━ Verificación ━━");
const summary = [];
for (const def of COMPANIES) {
  if (ids[def.slug]) summary.push(await summarize(def, ids[def.slug]));
}
console.table(summary);

if (failures.length > 0) {
  console.log("\nSecciones con error:");
  console.table(failures);
  process.exit(1);
}
console.log("\nSeed completado sin errores.");
