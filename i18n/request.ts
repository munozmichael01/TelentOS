import { getRequestConfig } from "next-intl/server";
import { routing, type Locale } from "./routing";

// Mensajes por locale, compuestos desde ficheros por página (messages/{locale}/*.json).
// Cada página de marketing tiene su namespace/fichero propio para poder trabajarlos
// (y traducirlos) de forma independiente. `common` va al nivel raíz.
async function loadMessages(locale: string) {
  const load = async (name: string) =>
    (await import(`../messages/${locale}/${name}.json`).catch(() => ({ default: {} }))).default;

  return {
    ...(await load("common")),
    Landing: await load("landing"),
    Ats: await load("ats"),
    Hris: await load("hris"),
    Nomina: await load("nomina"),
    Ai: await load("ai"),
    Pricing: await load("pricing"),
  };
}

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as Locale)) {
    locale = routing.defaultLocale;
  }
  return {
    locale,
    messages: await loadMessages(locale),
  };
});
