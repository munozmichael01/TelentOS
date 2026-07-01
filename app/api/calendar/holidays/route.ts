import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";

export async function GET(req: Request) {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .limit(1)
    .maybeSingle();
  if (!company)
    return jsonError("Configura primero la empresa en Ajustes", 412);

  const url = new URL(req.url);
  const year = parseInt(url.searchParams.get("year") ?? String(new Date().getFullYear()), 10);

  const { data: rows, error: dbError } = await supabase
    .from("company_holidays")
    .select("id, name, date, repeats_annually, is_half_day, deducts_from_allowance")
    .eq("company_id", company.id)
    .order("date", { ascending: true });

  if (dbError) return jsonError(dbError.message, 500);

  // Expand repeating holidays to the requested year; include fixed-date ones that fall in that year
  const holidays: Array<{
    id: string;
    name: string;
    date: string;
    repeats_annually: boolean;
    is_half_day: boolean;
    deducts_from_allowance: boolean;
    original_date: string;
  }> = [];

  for (const h of rows ?? []) {
    if (h.repeats_annually) {
      // Replace year portion of date with the requested year
      const dateSuffix = h.date.slice(5); // MM-DD
      const resolvedDate = `${year}-${dateSuffix}`;
      holidays.push({
        ...h,
        date: resolvedDate,
        original_date: h.date,
      });
    } else {
      // Only include if it falls within the requested year
      const holidayYear = new Date(h.date).getFullYear();
      if (holidayYear === year) {
        holidays.push({
          ...h,
          original_date: h.date,
        });
      }
    }
  }

  // Sort by resolved date
  holidays.sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json({ holidays });
}
