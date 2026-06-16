// Tipos del schema interno. Espejo manual de las tablas (las queries van por
// supabase-js sin codegen para mantener el eMVP ligero).

export type Company = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  website: string | null;
};

export type JobStatus = "draft" | "active" | "closed" | "archived";
export type EmploymentType = "full_time" | "part_time" | "contract" | "internship";

export type Job = {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  skills: string[];
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  location: string | null;
  employment_type: EmploymentType;
  sector: string | null;
  department: string | null;
  category: string | null;
  experience_min_years: number;
  status: JobStatus;
  source: string;
  external_id: string | null;
  dedupe_hash: string | null;
  created_at: string;
  updated_at: string;
};

export type JobStage = {
  id: string;
  job_id: string;
  name: string;
  order_index: number;
  is_terminal: boolean;
};

export type Channel = {
  id: string;
  name: string;
  kind: "job_board" | "aggregator" | "social";
  base_cpa: number;
  audience: string | null;
};

export type Campaign = {
  id: string;
  job_id: string;
  channel_id: string;
  status: "active" | "paused" | "finished";
  objective: "volume" | "quality" | "cpa";
  budget: number;
  priority: number;
  copy: string | null;
  views: number;
  applications: number;
  spend: number;
  started_at: string;
  channels?: Channel;
};

export type Candidate = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  location: string | null;
  skills: string[];
  experience_years: number;
  cv_url: string | null;
  summary: string | null;
  source: string;
  created_at: string;
};

export type Application = {
  id: string;
  job_id: string;
  candidate_id: string;
  stage_id: string | null;
  fit_score: number | null;
  source: string;
  utm: Record<string, string>;
  status: "open" | "hired" | "rejected";
  created_at: string;
  candidates?: Candidate;
  jobs?: Job;
  job_stages?: JobStage;
};

export type ApplicationEvent = {
  id: string;
  application_id: string;
  type: string;
  from_stage: string | null;
  to_stage: string | null;
  reason: string | null;
  actor_email: string | null;
  created_at: string;
};

export type Interview = {
  id: string;
  application_id: string;
  stage_id: string | null;
  scheduled_at: string;
  duration_min: number;
  interviewer: string | null;
  meeting_url: string | null;
  status: "scheduled" | "done" | "cancelled";
};

export type EvaluationTemplate = {
  id: string;
  name: string;
  stage_name: string | null;
  questions: { q: string; type: string }[];
};

export type Employee = {
  id: string;
  company_id: string;
  candidate_id: string | null;
  application_id: string | null;
  name: string;
  email: string | null;
  role_title: string | null;
  department: string | null;
  start_date: string | null;
  contract_type: string;
  manager_id: string | null;
  vacation_days_total: number;
  status: "active" | "offboarded";
  created_at: string;
};

export type OnboardingTask = {
  id: string;
  employee_id: string;
  title: string;
  description: string | null;
  assignee: string | null;
  due_date: string | null;
  status: "pending" | "in_progress" | "done";
  order_index: number;
  generated_by: "manual" | "agent";
};

export type Timesheet = {
  id: string;
  employee_id: string;
  work_date: string;
  hours: number;
  notes: string | null;
};

export type TimeOffRequest = {
  id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  days: number;
  type: "vacation" | "sick" | "other";
  status: "pending" | "approved" | "rejected";
  approver: string | null;
  comment: string | null;
  employees?: Employee;
};

// Pipeline por defecto al crear una oferta (configurable después por oferta)
export const DEFAULT_STAGES = [
  { name: "Aplicado", order_index: 0, is_terminal: false },
  { name: "Screening", order_index: 1, is_terminal: false },
  { name: "Entrevista", order_index: 2, is_terminal: false },
  { name: "Oferta", order_index: 3, is_terminal: false },
  { name: "Contratado", order_index: 4, is_terminal: true },
  { name: "Descartado", order_index: 5, is_terminal: true },
];
