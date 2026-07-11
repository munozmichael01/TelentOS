import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/server";

type LineRow = {
  id: string;
  gross: number;
  net: number;
  employer_cost: number;
  status: string;
  employees: { name: string; department: string | null; role_title: string | null } | null;
};

function csv(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return "";
  const s = String(val);
  return s.includes(",") || s.includes('"') || s.includes("\n")
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

const EXPORT_TYPE_LABEL: Record<string, string> = {
  payroll_csv: "Payroll Summary CSV",
  accounting_csv: "Accounting Export CSV",
};

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { companyId, user, error } = await requireApiRole(["owner", "hr_admin"]);
  if (error) return error;

  const url = new URL(req.url);
  const exportType = url.searchParams.get("type") ?? "payroll_csv";

  if (!["payroll_csv", "accounting_csv"].includes(exportType)) {
    return NextResponse.json({ error: `Tipo no soportado: ${exportType}` }, { status: 400 });
  }

  const db = createAdminClient();

  const { data: run } = await db
    .from("pay_runs")
    .select("*")
    .eq("id", params.id)
    .eq("company_id", companyId!)
    .maybeSingle();

  if (!run) return NextResponse.json({ error: "Corrida no encontrada" }, { status: 404 });

  const exportableStatuses = ["approved", "exported", "paid"];
  if (!exportableStatuses.includes(run.status)) {
    return NextResponse.json(
      { error: "Solo se puede exportar una corrida aprobada" },
      { status: 422 },
    );
  }

  const { data: lines } = await db
    .from("pay_run_lines")
    .select("id, gross, net, employer_cost, status, employees(name, department, role_title)")
    .eq("pay_run_id", params.id)
    .order("created_at");

  const lineRows = (lines ?? []) as unknown as LineRow[];
  const generatedAt = new Date().toISOString().split("T")[0];

  let csvContent = "";

  if (exportType === "payroll_csv") {
    const headers = ["Empleado", "Departamento", "Cargo", "Bruto", "Neto", "Costo Empresa", "Moneda", "Estado"];
    const dataRows = lineRows.map((l) => [
      l.employees?.name ?? "",
      l.employees?.department ?? "",
      l.employees?.role_title ?? "",
      l.gross.toFixed(2),
      l.net.toFixed(2),
      l.employer_cost.toFixed(2),
      run.currency,
      l.status,
    ]);

    const totalGross = lineRows.reduce((s, l) => s + l.gross, 0);
    const totalNet = lineRows.reduce((s, l) => s + l.net, 0);
    const totalEC = lineRows.reduce((s, l) => s + l.employer_cost, 0);
    const totalRow = [
      `TOTAL (${lineRows.length} empleados)`, "", "",
      totalGross.toFixed(2), totalNet.toFixed(2), totalEC.toFixed(2),
      run.currency, "",
    ];

    csvContent = [
      `CORRIDA DE NÓMINA — ${run.entity_name}`,
      `Período: ${run.period_label}`,
      `Generado: ${generatedAt}`,
      "",
      headers.map(csv).join(","),
      ...dataRows.map((r) => r.map(csv).join(",")),
      totalRow.map(csv).join(","),
    ].join("\n");
  } else {
    // accounting_csv — journal entry format
    const headers = ["Fecha", "Descripción", "Empleado", "Débito", "Crédito", "Moneda", "Referencia"];
    const acctRows: string[][] = [];

    for (let i = 0; i < lineRows.length; i++) {
      const l = lineRows[i];
      const ref = `${run.period_month}-${String(i + 1).padStart(4, "0")}`;
      acctRows.push([
        generatedAt,
        `Gasto nómina — ${l.employees?.department ?? "General"}`,
        l.employees?.name ?? "",
        l.gross.toFixed(2), "",
        run.currency, ref,
      ]);
      acctRows.push([
        generatedAt,
        "Pago por transferencia bancaria",
        l.employees?.name ?? "",
        "", l.net.toFixed(2),
        run.currency, ref,
      ]);
    }

    csvContent = [
      `CONTABILIDAD — ${run.entity_name} — ${run.period_label}`,
      `Generado: ${generatedAt}`,
      "",
      headers.map(csv).join(","),
      ...acctRows.map((r) => r.map(csv).join(",")),
    ].join("\n");
  }

  // Registrar en payroll_exports (AC-5a)
  await db.from("payroll_exports").insert({
    pay_run_id: params.id,
    export_type: exportType,
    generated_by: user?.email ?? "Sistema",
    file_path: null,
  });

  const filename = `${exportType}-${run.period_month}.csv`;
  return new NextResponse(csvContent, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
