// Tipos del schema interno. Espejo manual de las tablas (las queries van por
// supabase-js sin codegen para mantener el eMVP ligero).

export type Company = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  website: string | null;
  country: string | null;
  rif: string | null;
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
  kind: "job_board" | "aggregator" | "social" | "career_site";
  base_cpa: number;
  audience: string | null;
  utm_source: string | null;
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

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 1 — Tipos de ausencia y políticas de permisos
// ─────────────────────────────────────────────────────────────────────────────

export type AllowanceUnit = "days" | "hours";

export type AllowanceType = {
  id: string;
  company_id: string;
  name: string;
  unit: AllowanceUnit;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AbsenceType = {
  id: string;
  company_id: string;
  name: string;
  color: string;
  icon: string;
  requires_approval: boolean;
  deducts_from_allowance: boolean;
  allowance_type_id: string | null;
  is_public: boolean;
  requires_document: boolean;
  allow_half_day: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  allowance_types?: AllowanceType;
};

export type AllowanceCycleType = "annual" | "monthly";
export type AllowanceAssignmentTiming = "start_of_cycle" | "end_of_cycle";
export type AllowanceExpiryRule = "immediate" | "never" | "after_period";

export type AllowancePolicy = {
  id: string;
  company_id: string;
  allowance_type_id: string;
  name: string;
  amount: number;
  cycle_type: AllowanceCycleType;
  cycle_start_month: number | null;
  assignment_timing: AllowanceAssignmentTiming;
  expiry_rule: AllowanceExpiryRule;
  expiry_period_months: number | null;
  carryover_limit: number | null;
  allow_negative: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  allowance_types?: AllowanceType;
};

export type EmployeeAllowance = {
  id: string;
  employee_id: string;
  policy_id: string;
  valid_from: string;
  valid_until: string | null;
  created_at: string;
  updated_at: string;
  allowance_policies?: AllowancePolicy;
};

export type AdjustmentType = "manual_hr" | "carryover" | "expiry" | "company_holiday";

export type AllowanceAdjustmentLog = {
  id: string;
  employee_allowance_id: string;
  adjusted_by_employee_id: string | null;
  amount: number;
  reason: string;
  type: AdjustmentType;
  created_at: string;
};

export type CompanyHoliday = {
  id: string;
  company_id: string;
  name: string;
  date: string;
  repeats_annually: boolean;
  is_half_day: boolean;
  deducts_from_allowance: boolean;
  created_at: string;
  updated_at: string;
};

// Calculated balance — not stored, derived at query time
export type AllowanceBalance = {
  allowance_type: AllowanceType;
  policy: AllowancePolicy;
  employee_allowance: EmployeeAllowance;
  granted: number;
  carryover: number;
  adjustments: number;
  taken: number;
  pending: number;
  holidays: number;
  expired: number;
  available: number; // granted + carryover + adjustments - taken - pending - holidays - expired
};

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 2 — Solicitudes de ausencia
// ─────────────────────────────────────────────────────────────────────────────

export type AbsencePeriod = "morning" | "afternoon" | "full";
export type AbsenceStatus = "pending" | "approved" | "rejected" | "cancelled";

export type AbsenceRequest = {
  id: string;
  company_id: string;
  employee_id: string;
  created_by_employee_id: string | null;
  absence_type_id: string;
  start_date: string;
  start_period: AbsencePeriod;
  end_date: string;
  end_period: AbsencePeriod;
  working_days_count: number;
  status: AbsenceStatus;
  approved_by_employee_id: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  comment: string | null;
  document_url: string | null;
  substitute_employee_id: string | null;
  notify_employee_ids: string[];
  created_at: string;
  updated_at: string;
  employees?: Employee;
  absence_types?: AbsenceType;
  approved_by?: Employee;
};

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 4 — Horarios de trabajo
// ─────────────────────────────────────────────────────────────────────────────

export type WeekType = "single" | "rotating";

export type TimeSlot = {
  start: string; // "HH:MM"
  end: string;
};

export type WorkScheduleTemplate = {
  id: string;
  company_id: string;
  name: string;
  week_type: WeekType;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  weeks?: WorkScheduleWeek[];
};

export type WorkScheduleWeek = {
  id: string;
  template_id: string;
  week_label: string;
  week_index: number;
  days?: WorkScheduleDay[];
};

export type WorkScheduleDay = {
  id: string;
  week_id: string;
  day_of_week: number; // 0=Mon … 6=Sun
  is_working_day: boolean;
  slots: TimeSlot[];
  total_minutes: number;
};

export type EmployeeSchedule = {
  id: string;
  employee_id: string;
  template_id: string;
  valid_from: string;
  valid_until: string | null;
  created_at: string;
  updated_at: string;
  work_schedule_templates?: WorkScheduleTemplate;
};

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 5 — Registro de horas (Time Tracking)
// ─────────────────────────────────────────────────────────────────────────────

export type TimeEntryType = "work" | "break";
export type TimeEntrySource = "manual" | "timer" | "terminal";

export type TimeEntry = {
  id: string;
  company_id: string;
  employee_id: string;
  date: string;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  entry_type: TimeEntryType;
  comment: string | null;
  timezone: string;
  source: TimeEntrySource;
  created_at: string;
  updated_at: string;
  employees?: Employee;
};

export type TimerState = {
  id: string;
  employee_id: string;
  started_at: string;
  entry_type: TimeEntryType;
};

export type DailySummary = {
  date: string;
  work_minutes: number;
  break_minutes: number;
  entries: TimeEntry[];
  has_open_timer: boolean;
  scheduled_minutes: number;
  balance_minutes: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 6 — Compensación (Banco de horas)
// ─────────────────────────────────────────────────────────────────────────────

export type CompensationType = "time_off" | "payment";

export type CompensationRecord = {
  id: string;
  company_id: string;
  employee_id: string;
  processed_by_employee_id: string | null;
  period_start: string;
  period_end: string;
  scheduled_minutes: number;
  worked_minutes: number;
  balance_minutes: number;
  compensated_minutes: number;
  compensation_type: CompensationType;
  conversion_factor: number;
  comment: string | null;
  created_at: string;
  employees?: Employee;
};

export type CompensationBalance = {
  accumulated_minutes: number;      // total balance uncompensated
  compensated_minutes: number;      // already compensated
  pending_minutes: number;          // balance - compensated
};

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 7 — Compliance
// ─────────────────────────────────────────────────────────────────────────────

export type BreakRule = {
  after_minutes: number;
  min_break_minutes: number;
};

export type ComplianceConfig = {
  id: string;
  company_id: string;
  max_work_minutes_per_day: number | null;
  max_start_time_minutes: number | null;
  min_break_minutes: number | null;
  allow_start_with_break: boolean;
  allow_end_with_break: boolean;
  break_rules: BreakRule[];
  alert_on_max_hours: boolean;
  alert_on_overtime_threshold_minutes: number | null;
  alert_on_missing_break: boolean;
  updated_at: string;
  updated_by: string | null;
};

export type ViolationType =
  | "max_hours_exceeded"
  | "early_start"
  | "missing_break"
  | "insufficient_break";

export type ComplianceViolation = {
  id: string;
  company_id: string;
  employee_id: string;
  date: string;
  time_entry_id: string | null;
  violation_type: ViolationType;
  description: string;
  acknowledged_at: string | null;
  acknowledged_by_employee_id: string | null;
  created_at: string;
  employees?: Employee;
};

// ─────────────────────────────────────────────────────────────────────────────
// Payroll
// ─────────────────────────────────────────────────────────────────────────────

export type PayRunStatus     = "draft" | "in_review" | "approved" | "exported" | "paid";
export type PayRunLineStatus = "draft" | "reviewed" | "approved";
export type PayComponentType = "fixed" | "variable" | "conditional";
export type LineItemCategory = "earning" | "deduction" | "employer";
export type CountryPackCode  = "ve" | "br" | "es" | "co" | "mx";
export type PaymentFrequency = "monthly" | "biweekly" | "weekly";
export type PayrollExportType = "payslips_pdf" | "payroll_csv" | "accounting_csv" | "bank_file" | "compliance";

export type PayProfile = {
  id: string;
  company_id: string;
  employee_id: string;
  base_salary: number;
  currency: string;
  frequency: PaymentFrequency;
  effective_from: string;
  payment_method: string;
  bank_name: string | null;
  bank_account_last4: string | null;
  country_pack: CountryPackCode;
  tax_profile: string | null;
  legal_entity: string | null;
  employer_cost: number | null;
  created_at: string;
  updated_at: string;
};

export type PayComponent = {
  id: string;
  pay_profile_id: string;
  name: string;
  component_type: PayComponentType;
  amount: number | null;
  formula: string | null;
  active: boolean;
  order_index: number;
  created_at: string;
};

export type PayRun = {
  id: string;
  company_id: string;
  period_label: string;
  period_month: string;
  entity_name: string;
  run_type: string;
  status: PayRunStatus;
  gross: number;
  net: number;
  employer_cost: number;
  employee_count: number;
  currency: string;
  created_at: string;
  updated_at: string;
};

export type PayRunLine = {
  id: string;
  pay_run_id: string;
  employee_id: string;
  gross: number;
  net: number;
  employer_cost: number;
  status: PayRunLineStatus;
  has_bank_issue: boolean;
  has_adjustment_issue: boolean;
  has_salary_change: boolean;
  has_unconfirmed_input: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  employees?: Employee;
};

export type PayRunLineItem = {
  id: string;
  line_id: string;
  category: LineItemCategory;
  label: string;
  amount: number;
  quantity_label: string | null;
  order_index: number;
};

export type PayRunAuditLog = {
  id: string;
  pay_run_id: string;
  text: string;
  who: string;
  created_at: string;
};

export type Payslip = {
  id: string;
  pay_run_line_id: string;
  slip_number: string;
  file_path: string | null;
  generated_at: string;
  sent_at: string | null;
};

export type PayrollExport = {
  id: string;
  pay_run_id: string;
  export_type: PayrollExportType;
  generated_by: string;
  file_path: string | null;
  created_at: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Pipeline por defecto al crear una oferta (configurable después por oferta)
// ─────────────────────────────────────────────────────────────────────────────

// Pipeline por defecto al crear una oferta (configurable después por oferta)
export const DEFAULT_STAGES = [
  { name: "Aplicado", order_index: 0, is_terminal: false },
  { name: "Screening", order_index: 1, is_terminal: false },
  { name: "Entrevista", order_index: 2, is_terminal: false },
  { name: "Oferta", order_index: 3, is_terminal: false },
  { name: "Contratado", order_index: 4, is_terminal: true },
  { name: "Descartado", order_index: 5, is_terminal: true },
];
