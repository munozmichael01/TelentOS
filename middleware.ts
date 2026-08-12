import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing, ALL_LOCALES, LANG_PRIMARY, resolveLocale } from "./i18n/routing";
import { audiencesOf, PRODUCT_HOME, type Audience } from "./lib/auth/audiences";

// Compone i18n (next-intl) + auth (Supabase). El locale idioma-país va en la URL
// (/es-ve, /en-us, /pt-br); las comprobaciones de público/privado y los redirects se
// hacen sobre el path SIN el prefijo de idioma. `/api` queda fuera (no se localiza y se
// autoprotege por ruta).
const handleI18n = createIntlMiddleware(routing);
const localeRe = new RegExp(`^/(${routing.locales.join("|")})(?=/|$)`);
// Locales de mercados que aún no hemos abierto. next-intl no los conoce (no están en
// `routing.locales`), así que sin esto darían 404 y perderían el path. Se redirigen al
// equivalente abierto conservando el idioma, y el día que se abra el mercado la URL revive.
const closedLocaleRe = new RegExp(
  `^/(${ALL_LOCALES.filter((l) => !(routing.locales as readonly string[]).includes(l)).join("|")})(?=/|$)`,
);

/**
 * Los tres productos, cada uno con su namespace y su puerta.
 *
 * `door` es lo ÚNICO público del namespace: la pantalla de entrada. Todo lo demás exige el alta
 * de ese producto (`app_metadata.audiences`, ver lib/auth/audiences.ts).
 *
 * Regla dura: **nunca se redirige de un producto a otro**. Quien pide un producto en el que no
 * tiene alta va a la puerta DE ESE producto, que se lo explica. Mandarlo a otro sitio es lo que
 * producía el bucle infinito `/app/dashboard ⇄ /me/profile` de la auditoría.
 */
const PRODUCTS: { audience: Audience; root: string; door: string; open: string[] }[] = [
  { audience: "staff", root: "/employer", door: "/employer/sign-in", open: ["/employer/sign-in"] },
  { audience: "employee", root: "/employee", door: "/employee/sign-in", open: ["/employee/sign-in"] },
  { audience: "candidate", root: "/candidate", door: "/candidate/sign-in", open: ["/candidate/sign-in"] },
];

/**
 * Rutas anteriores al reparto por producto. Se mantienen redirigiendo porque hay enlaces vivos
 * (invitaciones ya enviadas, marcadores, los accesos que se repartieron para revisar).
 */
const LEGACY: [RegExp, string][] = [
  [/^\/login(\/|$)/, "/employer/sign-in"],
  [/^\/onboarding(\/|$)/, "/employer/onboarding"],
  [/^\/app(?=\/|$)/, "/employer"],
  [/^\/me(?=\/|$)/, "/employee"],
  [/^\/(cuenta|account|conta)\/(entrar|sign-in)(\/|$)/, "/candidate/sign-in"],
  [/^\/(cuenta|account|conta)\/(perfil|profile)(\/|$)/, "/candidate/profile"],
  [/^\/(cuenta|account|conta)(?=\/|$)/, "/candidate"],
];

export async function middleware(request: NextRequest) {
  // 0) Mercado cerrado → su equivalente abierto, antes de que next-intl lo dé por inexistente.
  const closed = request.nextUrl.pathname.match(closedLocaleRe);
  if (closed) {
    const target = resolveLocale(closed[1]);
    const rest = request.nextUrl.pathname.replace(closedLocaleRe, "");
    // Si además cambia el IDIOMA (cerramos `pt` entero, así que pt-br → es-ve), los slugs del
    // board dejan de valer: `/vagas` no existe en español. Se cae a la raíz del board en el
    // idioma destino en vez de a un 404. El resto de rutas no se localizan, así que se conservan.
    const langChanged = closed[1].split("-")[0] !== target.split("-")[0];
    const boardRoot: Record<string, string> = { es: "/empleos", en: "/jobs", pt: "/vagas" };
    const open = request.nextUrl.clone();
    open.pathname =
      langChanged && /^\/(empleos|jobs|vagas)(\/|$)/.test(rest)
        ? `/${target}${boardRoot[target.split("-")[0]] ?? "/empleos"}`
        : `/${target}${rest}`;
    return NextResponse.redirect(open);
  }

  // 1) next-intl: routing de locale (redirige / → /es-ve, añade/normaliza el prefijo).
  const response = handleI18n(request);
  // Si i18n decidió redirigir (p. ej. añadir el prefijo), hónralo; el auth corre en el
  // siguiente request ya con locale.
  if (response.headers.get("location")) return response;

  const { pathname } = request.nextUrl;
  const locale = pathname.match(localeRe)?.[1] ?? routing.defaultLocale;
  const bare = pathname.replace(localeRe, "") || "/";

  const go = (path: string, keepSearch = false) => {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = `/${locale}${path}`;
    if (!keepSearch) redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  };

  // 2) Rutas viejas → nuevas, antes de cualquier comprobación de sesión.
  for (const [re, to] of LEGACY) {
    if (re.test(bare)) return go(bare.replace(re, to) || to, true);
  }

  // 3) Fuera del board el país no significa nada, así que los mercados no primarios colapsan al
  // primario de su idioma → evita contenido duplicado. El board y la cuenta del candidato sí se
  // mantienen por mercado: ahí el país ordena los resultados (local primero, sin filtrar).
  const primary = LANG_PRIMARY[locale.split("-")[0]] ?? routing.defaultLocale;
  const isBoardNs = /^\/(empleos|jobs|vagas|candidate)(\/|$)/.test(bare);
  if (locale !== primary && !isBoardNs) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = `/${primary}${bare === "/" ? "" : bare}`;
    return NextResponse.redirect(redirectUrl);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return response; // sin env aún: no bloquear el arranque

  // 4) Refresco de sesión de Supabase (cookies sobre la respuesta de i18n).
  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[]) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  const audiences = audiencesOf(user);

  // 5) Producto pedido, si la ruta cae en alguno.
  const product = PRODUCTS.find((p) => bare === p.root || bare.startsWith(`${p.root}/`));
  if (!product) return response; // marketing, board y career sites: públicos

  const atDoor = product.open.some((o) => bare === o || bare.startsWith(`${o}/`));
  const enrolled = audiences.includes(product.audience);

  // Ya dentro y con alta: la puerta sobra.
  if (atDoor) return user && enrolled ? go(PRODUCT_HOME[product.audience]) : response;

  // Zona privada del producto: sin sesión o sin alta, a SU puerta. Nunca a otro producto.
  if (!user || !enrolled) return go(product.door);

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
