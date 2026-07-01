import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";

const DEFAULT_ALLOWANCE_TYPE = {
  name: "Días de vacaciones",
  unit: "days",
};

const DEFAULT_ALLOWANCE_POLICY = {
  name: "Política estándar (22 días)",
  amount: 22,
  cycle_type: "annual",
  assignment_timing: "start_of_cycle",
  expiry_rule: "after_period",
  expiry_period_months: 3,
  carryover_limit: 5,
  allow_negative: false,
  is_default: true,
};

const DEFAULT_ABSENCE_TYPES = [
  {
    name: "Vacaciones",
    color: "#0E5C4A",
    icon: "🌴",
    requires_approval: true,
    deducts_from_allowance: true,
    is_public: true,
    requires_document: false,
    allow_half_day: true,
  },
  {
    name: "Baja por enfermedad",
    color: "#946312",
    icon: "🤒",
    requires_approval: false,
    deducts_from_allowance: false,
    is_public: true,
    requires_document: false,
    allow_half_day: false,
  },
  {
    name: "Permiso familiar",
    color: "#2B5E8A",
    icon: "👨‍👩‍👧",
    requires_approval: true,
    deducts_from_allowance: false,
    is_public: true,
    requires_document: false,
    allow_half_day: true,
  },
  {
    name: "Asunto propio",
    color: "#5A4C86",
    icon: "📋",
    requires_approval: true,
    deducts_from_allowance: false,
    is_public: true,
    requires_document: false,
    allow_half_day: true,
  },
  {
    name: "Cita médica",
    color: "#BD4332",
    icon: "🏥",
    requires_approval: true,
    deducts_from_allowance: false,
    is_public: true,
    requires_document: false,
    allow_half_day: true,
  },
  {
    name: "Formación",
    color: "#1B6B4F",
    icon: "🎓",
    requires_approval: true,
    deducts_from_allowance: false,
    is_public: true,
    requires_document: false,
    allow_half_day: false,
  },
];

export async function POST() {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .limit(1)
    .maybeSingle();
  if (!company) return jsonError("Configura primero la empresa en Ajustes", 412);

  // Check if already seeded
  const { data: existing } = await supabase
    .from("absence_types")
    .select("id")
    .eq("company_id", company.id)
    .limit(1);
  if (existing && existing.length > 0) {
    return jsonError("Ya existen tipos de ausencia para esta empresa", 409);
  }

  // 1. Create allowance type (vacation days)
  const { data: allowanceType, error: atErr } = await supabase
    .from("allowance_types")
    .insert({ ...DEFAULT_ALLOWANCE_TYPE, company_id: company.id })
    .select()
    .single();
  if (atErr) return jsonError(atErr.message, 500);

  // 2. Create allowance policy linked to that type
  await supabase.from("allowance_policies").insert({
    ...DEFAULT_ALLOWANCE_POLICY,
    company_id: company.id,
    allowance_type_id: allowanceType.id,
  });

  // 3. Create absence types (Vacaciones links to the allowance type)
  const absenceTypeRows = DEFAULT_ABSENCE_TYPES.map((at) => ({
    ...at,
    company_id: company.id,
    allowance_type_id: at.deducts_from_allowance ? allowanceType.id : null,
  }));

  const { data: created, error: absErr } = await supabase
    .from("absence_types")
    .insert(absenceTypeRows)
    .select();
  if (absErr) return jsonError(absErr.message, 500);

  return NextResponse.json({
    seeded: true,
    absence_types: created,
    allowance_type: allowanceType,
  });
}
