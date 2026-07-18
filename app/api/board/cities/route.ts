import { NextResponse } from "next/server";
import { searchCities } from "@/lib/board/geo";

// Autocompletado público de ciudades del board (lista canónica GeoNames, no solo las con
// ofertas). country por defecto según el mercado (lo pasa el cliente desde su locale).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const country = url.searchParams.get("country") ?? "VE";
  const cities = searchCities(q, country, 8);
  return NextResponse.json({ cities });
}
