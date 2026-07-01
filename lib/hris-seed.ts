import type { SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_ALLOWANCE_TYPE = { name: "Días de vacaciones", unit: "days" };

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
  { name: "Vacaciones",          color: "#0E5C4A", icon: "🌴", requires_approval: true,  deducts_from_allowance: true,  is_public: true, requires_document: false, allow_half_day: true  },
  { name: "Baja por enfermedad", color: "#946312", icon: "🤒", requires_approval: false, deducts_from_allowance: false, is_public: true, requires_document: false, allow_half_day: false },
  { name: "Permiso familiar",    color: "#2B5E8A", icon: "👨‍👩‍👧", requires_approval: true,  deducts_from_allowance: false, is_public: true, requires_document: false, allow_half_day: true  },
  { name: "Asunto propio",       color: "#5A4C86", icon: "📋", requires_approval: true,  deducts_from_allowance: false, is_public: true, requires_document: false, allow_half_day: true  },
  { name: "Cita médica",         color: "#BD4332", icon: "🏥", requires_approval: true,  deducts_from_allowance: false, is_public: true, requires_document: false, allow_half_day: true  },
  { name: "Formación",           color: "#1B6B4F", icon: "🎓", requires_approval: true,  deducts_from_allowance: false, is_public: true, requires_document: false, allow_half_day: false },
];

/**
 * Seeds HRIS defaults for a company. Safe to call multiple times —
 * checks if absence_types already exist before inserting.
 */
export async function seedHrisDefaults(
  supabase: SupabaseClient,
  companyId: string
): Promise<void> {
  const { data: existing } = await supabase
    .from("absence_types")
    .select("id")
    .eq("company_id", companyId)
    .limit(1);

  if (existing && existing.length > 0) return; // already seeded

  const { data: allowanceType, error: atErr } = await supabase
    .from("allowance_types")
    .insert({ ...DEFAULT_ALLOWANCE_TYPE, company_id: companyId })
    .select()
    .single();

  if (atErr || !allowanceType) return;

  await supabase.from("allowance_policies").insert({
    ...DEFAULT_ALLOWANCE_POLICY,
    company_id: companyId,
    allowance_type_id: allowanceType.id,
  });

  await supabase.from("absence_types").insert(
    DEFAULT_ABSENCE_TYPES.map((at) => ({
      ...at,
      company_id: companyId,
      allowance_type_id: at.deducts_from_allowance ? allowanceType.id : null,
    }))
  );
}
