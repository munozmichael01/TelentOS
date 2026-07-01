import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import { getCompany } from "@/lib/workspace";
import type { CareerSiteContent } from "@/lib/career-site-types";

// Campos de texto plano en la raíz del contenido
const ROOT_TEXT_FIELDS: (keyof CareerSiteContent)[] = [
  "headline", "aboutTitle", "aboutDescription", "brandsTitle",
  "cultureTitle", "cultureDescription", "lookingForTitle", "lookingForDescription",
  "benefitsTitle", "teamTitle", "teamDescription", "faqsTitle",
];

// Arrays con sus subcampos de texto
const ARRAY_SPECS: { key: keyof CareerSiteContent; fields: string[] }[] = [
  { key: "aboutMetrics",   fields: ["label", "value"] },
  { key: "brands",         fields: ["name"] },
  { key: "cultureValues",  fields: ["name"] },
  { key: "benefits",       fields: ["name"] },
  { key: "teamProfiles",   fields: ["name", "position"] },
  { key: "testimonials",   fields: ["name", "position", "text"] },
  { key: "faqs",           fields: ["question", "answer"] },
];

function extractTexts(content: CareerSiteContent): string[] {
  const texts: string[] = [];
  for (const field of ROOT_TEXT_FIELDS) {
    const v = content[field];
    if (v && typeof v === "string") texts.push(v);
  }
  for (const { key, fields } of ARRAY_SPECS) {
    const arr = content[key] as Record<string, string>[] | undefined;
    if (!arr) continue;
    for (const item of arr) {
      for (const f of fields) {
        if (item[f]) texts.push(item[f]);
      }
    }
  }
  return texts;
}

function applyTranslations(
  content: CareerSiteContent,
  original: string[],
  translated: string[]
): CareerSiteContent {
  let idx = 0;
  const result: CareerSiteContent = { ...content };

  for (const field of ROOT_TEXT_FIELDS) {
    const v = content[field];
    if (v && typeof v === "string") {
      (result as Record<string, unknown>)[field] = translated[idx++];
    }
  }

  for (const { key, fields } of ARRAY_SPECS) {
    const arr = content[key] as Record<string, string>[] | undefined;
    if (!arr) continue;
    (result as Record<string, unknown>)[key] = arr.map((item) => {
      const newItem = { ...item };
      for (const f of fields) {
        if (item[f]) newItem[f] = translated[idx++];
      }
      return newItem;
    });
  }

  return result;
}

export async function POST(req: Request) {
  const company = await getCompany();
  if (!company) return NextResponse.json({ error: "No company" }, { status: 401 });

  const { lang } = await req.json();
  if (!["en", "pt"].includes(lang)) {
    return NextResponse.json({ error: "lang must be 'en' or 'pt'" }, { status: 400 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OpenAI no configurado" }, { status: 503 });
  }

  const supabase = createClient();
  const { data: page } = await supabase
    .from("career_site_pages")
    .select("draft_content, translations")
    .eq("company_id", company.id)
    .maybeSingle();

  if (!page) return NextResponse.json({ error: "Sin página de career site" }, { status: 404 });

  const content = page.draft_content as CareerSiteContent;
  const texts = extractTexts(content);
  if (!texts.length) return NextResponse.json({ error: "Sin texto para traducir" }, { status: 400 });

  const langName = lang === "en" ? "English" : "Portuguese (Brazil)";
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: `Translate the following JSON array of strings from Spanish to ${langName}.
Rules:
- Keep URLs, emails, numbers, brand names, and proper nouns unchanged.
- Return ONLY valid JSON: { "translations": ["...","...",...] }
- Same number of elements as input.

Input: ${JSON.stringify(texts)}`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.15,
  });

  let translated: string[];
  try {
    const parsed = JSON.parse(completion.choices[0].message.content ?? "{}");
    translated = parsed.translations ?? parsed.result ?? Object.values(parsed)[0];
    if (!Array.isArray(translated) || translated.length !== texts.length) {
      throw new Error("Respuesta inválida");
    }
  } catch {
    return NextResponse.json({ error: "Error parseando traducción" }, { status: 500 });
  }

  const translatedContent = applyTranslations(content, texts, translated);
  const newTranslations = { ...(page.translations as Record<string, unknown>), [lang]: translatedContent };

  await supabase
    .from("career_site_pages")
    .update({ translations: newTranslations, updated_at: new Date().toISOString() })
    .eq("company_id", company.id);

  return NextResponse.json({ ok: true, lang, content: translatedContent });
}
