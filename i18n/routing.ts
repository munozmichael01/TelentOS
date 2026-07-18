import { defineRouting } from "next-intl/routing";

// i18n de toda la app. El locale es idioma-PAÍS (BCP-47): un job board es geográfico
// (moneda, legal, ofertas y SERPs distintos por país), así que segmentamos por mercado,
// no solo por idioma. Arranca en Venezuela (es-VE); añadir es-ES/pt-BR/en-US después es
// trivial. El locale va en la URL en minúscula: /es-ve/..., /en-us/..., /pt-br/...
// Los mensajes se comparten por IDIOMA (es-VE y un futuro es-ES reusan messages/es/);
// la región solo afecta datos (moneda/legal/ofertas), no las traducciones de UI.
export const routing = defineRouting({
  locales: ["es-ve", "en-us", "pt-br"],
  defaultLocale: "es-ve",
});

export type Locale = (typeof routing.locales)[number];
