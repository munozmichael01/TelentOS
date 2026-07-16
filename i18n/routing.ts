import { defineRouting } from "next-intl/routing";

// i18n de toda la app. ES por defecto (mercado principal); EN/PT para expansión.
// El locale va en la URL: /es/..., /en/..., /pt/...
export const routing = defineRouting({
  locales: ["es", "en", "pt"],
  defaultLocale: "es",
});

export type Locale = (typeof routing.locales)[number];
