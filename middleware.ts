import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Compone i18n (next-intl) + auth (Supabase). El locale va en la URL (/es, /en, /pt);
// las comprobaciones de público/privado y los redirects se hacen sobre el path SIN el
// prefijo de idioma. `/api` queda fuera (no se localiza y se autoprotege por ruta).
const handleI18n = createIntlMiddleware(routing);
const localeRe = new RegExp(`^/(${routing.locales.join("|")})(?=/|$)`);

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
  const { pathname } = request.nextUrl;
  const locale = pathname.match(localeRe)?.[1] ?? routing.defaultLocale;
  const bare = pathname.replace(localeRe, "") || "/";

  const isPublic =
    bare === "/" ||
    bare.startsWith("/login") ||
    bare.startsWith("/auth/") ||
    bare.startsWith("/careers");

  if (!user && !isPublic) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = `/${locale}/login`;
    return NextResponse.redirect(redirectUrl);
  }
  if (user && (bare.startsWith("/login") || bare === "/")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = `/${locale}/dashboard`;
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
