// Envío transaccional vía Resend (REST, sin SDK). Degrada a no-op silencioso si no
// hay RESEND_API_KEY (dev sin credenciales) — nunca rompe el flujo que lo dispara.
// FROM configurable: para envíos reales hay que verificar un dominio en Resend y
// poner RESEND_FROM (p.ej. "TalentOS <no-reply@tudominio.com>"); onboarding@resend.dev
// solo entrega al dueño de la cuenta (modo test).

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export type SendEmailInput = { to: string; subject: string; html: string; replyTo?: string };

export async function sendEmail({ to, subject, html, replyTo }: SendEmailInput): Promise<{ ok: boolean; skipped?: boolean }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, skipped: true };
  const from = process.env.RESEND_FROM || "TalentOS <onboarding@resend.dev>";
  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html, ...(replyTo ? { reply_to: replyTo } : {}) }),
    });
    return { ok: res.ok };
  } catch {
    return { ok: false };
  }
}
