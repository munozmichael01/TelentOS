import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/resend";
import { candidateRecoveryEmail } from "@/lib/email/candidate-emails";

export const dynamic = "force-dynamic";

/**
 * Barrido diario (Vercel Cron): contacta a los candidatos que aplicaron desde el job board,
 * NO crearon cuenta (user_id null) y aún no han sido contactados. Un solo email de
 * recuperación con link a signup pre-relleno. Se marca activation_email_sent_at para no
 * reenviar. Solo invitados recientes (7 días) para no molestar a fichas viejas.
 *
 * Seguridad: Vercel Cron envía `Authorization: Bearer <CRON_SECRET>`. Si CRON_SECRET está
 * configurado, se exige; así el endpoint no es disparable por cualquiera.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: candidates, error } = await admin
    .from("candidates")
    .select("id, email, name")
    .is("user_id", null)
    .is("activation_email_sent_at", null)
    .eq("source", "job_board")
    .gte("created_at", since)
    .limit(300);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const base = process.env.NEXT_PUBLIC_APP_URL || "";
  const now = new Date().toISOString();
  let sent = 0, skipped = 0;

  for (const c of candidates ?? []) {
    if (!c.email) continue;
    const url = `${base}/es-ve/cuenta/entrar?email=${encodeURIComponent(c.email)}`;
    const { subject, html } = candidateRecoveryEmail({ locale: "es-ve", url });
    const r = await sendEmail({ to: c.email, subject, html });
    if (r.skipped) { skipped++; continue; } // sin RESEND_API_KEY → no marcar, reintenta otro día
    await admin.from("candidates").update({ activation_email_sent_at: now }).eq("id", c.id);
    sent++;
  }

  return NextResponse.json({ ok: true, eligible: candidates?.length ?? 0, sent, skipped });
}
