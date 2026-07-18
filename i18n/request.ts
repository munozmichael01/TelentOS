import { getRequestConfig } from "next-intl/server";
import { routing, type Locale } from "./routing";

// Mensajes por IDIOMA (no por locale completo): es-VE y un futuro es-ES comparten
// messages/es/. Se deriva el idioma del locale idioma-país (es-ve → es). Cada página
// de marketing tiene su namespace/fichero propio para trabajarlos (y traducirlos) de
// forma independiente. `common` va al nivel raíz.
async function loadMessages(locale: string) {
  const lang = locale.split("-")[0]; // es-ve → es
  const load = async (name: string) =>
    (await import(`../messages/${lang}/${name}.json`).catch(() => ({ default: {} }))).default;

  return {
    ...(await load("common")),
    Landing: await load("landing"),
    Ats: await load("ats"),
    Hris: await load("hris"),
    Nomina: await load("nomina"),
    Ai: await load("ai"),
    Pricing: await load("pricing"),
    Board: await load("board"),
    Settings: await load("settings"),
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
