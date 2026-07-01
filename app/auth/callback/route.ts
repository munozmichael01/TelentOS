import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Handles email confirmation (type=signup) and password reset (type=recovery).
// Supabase may send either:
//   PKCE flow:       /auth/callback?code=XXX&type=recovery
//   Token-hash flow: /auth/callback?token_hash=XXX&type=recovery
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as "recovery" | "signup" | "email" | null;

  // Determine redirect destination from type, not from a query param
  // (avoids encoding issues when Supabase appends token to the redirectTo URL)
  const next = type === "recovery" ? "/auth/reset-password" : "/dashboard";

  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[]) =>
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          ),
      },
    }
  );

  // PKCE flow: exchange code for session
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }

  // Token-hash flow: verify OTP directly
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }

  return NextResponse.redirect(
    new URL("/login?error=El+enlace+es+inv%C3%A1lido+o+ha+expirado", url.origin)
  );
}
