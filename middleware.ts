import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Compone i18n (next-intl) + auth (Supabase). El locale idioma-país va en la URL
// (/es-ve, /en-us, /pt-br); las comprobaciones de público/privado y los redirects se
// hacen sobre el path SIN el prefijo de idioma. `/api` queda fuera (no se localiza y se
// autoprotege por ruta).
const handleI18n = createIntlMiddleware(routing);
const localeRe = new RegExp(`^/(${routing.locales.join("|")})(?=/|$)`);
// Slug localizado de la cuenta del candidato (espeja `pathnames` de i18n/routing.ts;
// se duplica aquí porque el middleware no usa los helpers de navegación tipada).
const CUENTA: Record<string, string> = { "es-ve": "/cuenta", "en-us": "/account", "pt-br": "/conta" };

export async function middleware(request: NextRequest) {
  // 1) next-intl: routing de locale (redirige / → /es, añade/normaliza el prefijo).
  const response = handleI18n(request);
  // Si i18n decidió redirigir (p. ej. añadir el prefijo), hónralo; el auth corre en el
  // siguiente request ya con locale.
  if (response.headers.get("location")) return response;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return response; // sin env aún: no bloquear el arranque

  // 2) Refresco de sesión de Supabase (cookies sobre la respuesta de i18n).
  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[]) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 3) Protección de rutas sobre el path SIN prefijo de idioma.
  // El dashboard B2B autenticado vive bajo /app/* (privado); TODO lo demás es público
  // (marketing, career sites, job board, login/auth). Regla simple: /app/* = privado.
  const { pathname } = request.nextUrl;
  const locale = pathname.match(localeRe)?.[1] ?? routing.defaultLocale;
  const bare = pathname.replace(localeRe, "") || "/";

  const isPrivate = bare === "/app" || bare.startsWith("/app/");
  const isCandidate = user?.app_metadata?.audience === "candidate";

  // /app/* es SOLO para usuarios de empresa. Un candidato es un `user` pero no tiene
  // company_members (RLS es la barrera real); aquí lo mandamos a su cuenta.
  if (isPrivate && (!user || isCandidate)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = isCandidate ? `/${locale}${CUENTA[locale] ?? "/cuenta"}` : `/${locale}/login`;
    return NextResponse.redirect(redirectUrl);
  }
  // Usuario de EMPRESA logueado: fuera de la home pública y del login (a su dashboard).
  // A los candidatos NO se les redirige: pueden navegar el marketing y el board libremente.
  if (user && !isCandidate && (bare.startsWith("/login") || bare === "/")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = `/${locale}/app/dashboard`;
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
