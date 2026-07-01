import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const { data: company } = await supabase.from("companies").select("id").limit(1).maybeSingle();
  if (!company) return jsonError("Empresa no configurada", 412);

  // Verify the employee belongs to this company
  const { data: employee } = await supabase
    .from("employees")
    .select("id")
    .eq("id", params.id)
    .eq("company_id", company.id)
    .maybeSingle();
  if (!employee) return jsonError("Empleado no encontrado", 404);

  // Fetch active employee_allowances with full policy + allowance_type context
  const today = new Date().toISOString().split("T")[0];
  const { data: allowances, error: allowancesError } = await supabase
    .from("employee_allowances")
    .select(
      "id, valid_from, valid_until, policy:allowance_policies(id, name, amount, allow_negative, allowance_type_id, allowance_type:allowance_types(id, name, unit))"
    )
    .eq("employee_id", params.id)
    .lte("valid_from", today);
  if (allowancesError) return jsonError(allowancesError.message, 500);

  if (!allowances || allowances.length === 0) {
    return NextResponse.json({ balances: [] });
  }

  // Fetch all adjustment log entries for these allowances in one query
  const allowanceIds = allowances.map((a) => a.id);
  const { data: adjustments, error: adjError } = await supabase
    .from("allowance_adjustment_log")
    .select("employee_allowance_id, amount, type")
    .in("employee_allowance_id", allowanceIds);
  if (adjError) return jsonError(adjError.message, 500);

  // Build a map of adjustments grouped by employee_allowance_id
  const adjByAllowance = new Map<string, typeof adjustments>();
  for (const adj of adjustments ?? []) {
    const list = adjByAllowance.get(adj.employee_allowance_id) ?? [];
    list.push(adj);
    adjByAllowance.set(adj.employee_allowance_id, list);
  }

  // Fetch absence_types that deduct from an allowance_type (for this company)
  const { data: deductingAbsenceTypes } = await supabase
    .from("absence_types")
    .select("id, allowance_type_id")
    .eq("company_id", company.id)
    .eq("deducts_from_allowance", true)
    .eq("is_active", true);

  // Build a map: allowance_type_id → set of absence_type ids that deduct from it
  const absenceTypesByAllowanceType = new Map<string, string[]>();
  for (const at of deductingAbsenceTypes ?? []) {
    if (!at.allowance_type_id) continue;
    const list = absenceTypesByAllowanceType.get(at.allowance_type_id) ?? [];
    list.push(at.id);
    absenceTypesByAllowanceType.set(at.allowance_type_id, list);
  }

  // Compute balances per allowance
  const balances = await Promise.all(
    allowances.map(async (allowance) => {
      const policy = allowance.policy as unknown as {
        id: string;
        name: string;
        amount: number;
        allow_negative: boolean;
        allowance_type_id: string;
        allowance_type: { id: string; name: string; unit: string };
      } | null;

      if (!policy) {
        return {
          employee_allowance_id: allowance.id,
          error: "Política no encontrada",
        };
      }

      const granted = Number(policy.amount ?? 0);
      const adjs = adjByAllowance.get(allowance.id) ?? [];

      const manualAdjustments = adjs
        .filter((a) => a.type !== "carryover" && a.type !== "expiry")
        .reduce((sum, a) => sum + Number(a.amount), 0);

      const carryover = adjs
        .filter((a) => a.type === "carryover")
        .reduce((sum, a) => sum + Number(a.amount), 0);

      const expired = Math.abs(
        adjs
          .filter((a) => a.type === "expiry")
          .reduce((sum, a) => sum + Number(a.amount), 0)
      );

      // Gather absence_type ids that deduct from this policy's allowance_type
      const relevantAbsenceTypeIds =
        absenceTypesByAllowanceType.get(policy.allowance_type_id) ?? [];

      let taken = 0;
      let pending = 0;

      if (relevantAbsenceTypeIds.length > 0) {
        // Approved absences
        const { data: approvedRequests } = await supabase
          .from("absence_requests")
          .select("working_days_count")
          .eq("employee_id", params.id)
          .eq("status", "approved")
          .in("absence_type_id", relevantAbsenceTypeIds);

        taken = (approvedRequests ?? []).reduce(
          (sum, r) => sum + Number(r.working_days_count ?? 0),
          0
        );

        // Pending absences
        const { data: pendingRequests } = await supabase
          .from("absence_requests")
          .select("working_days_count")
          .eq("employee_id", params.id)
          .eq("status", "pending")
          .in("absence_type_id", relevantAbsenceTypeIds);

        pending = (pendingRequests ?? []).reduce(
          (sum, r) => sum + Number(r.working_days_count ?? 0),
          0
        );
      }

      const available =
        granted + carryover + manualAdjustments - taken - pending - expired;

      return {
        employee_allowance_id: allowance.id,
        policy_id: policy.id,
        policy_name: policy.name,
        allowance_type: policy.allowance_type,
        valid_from: allowance.valid_from,
        valid_until: allowance.valid_until,
        granted,
        carryover,
        manual_adjustments: manualAdjustments,
        expired,
        taken,
        pending,
        available: policy.allow_negative ? available : Math.max(available, 0),
      };
    })
  );

  return NextResponse.json({ balances });
}
