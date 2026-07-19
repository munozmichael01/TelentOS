// Plantillas de email para candidatos del job board. Copy por idioma (del locale).
// Diseño sobrio alineado al DS (Archivo/verde), inline styles por compatibilidad de clientes.

type Lang = "es" | "en" | "pt";

const COPY: Record<Lang, {
  subject: (company: string) => string;
  heading: string;
  body: (job: string, company: string) => string;
  cta: string;
  foot: string;
}> = {
  es: {
    subject: (c) => `Tu candidatura en ${c} — crea tu cuenta para seguirla`,
    heading: "Un paso más",
    body: (j, c) => `Recibimos tu candidatura para <b>${j}</b> en ${c}. Crea una contraseña para guardar tu perfil y seguir el estado de todas tus candidaturas.`,
    cta: "Crear mi cuenta",
    foot: "Si no aplicaste a esta oferta, puedes ignorar este correo.",
  },
  en: {
    subject: (c) => `Your application at ${c} — create your account to track it`,
    heading: "One more step",
    body: (j, c) => `We received your application for <b>${j}</b> at ${c}. Set a password to save your profile and follow all your applications.`,
    cta: "Create my account",
    foot: "If you didn't apply to this job, you can ignore this email.",
  },
  pt: {
    subject: (c) => `Sua candidatura em ${c} — crie sua conta para acompanhar`,
    heading: "Só mais um passo",
    body: (j, c) => `Recebemos sua candidatura para <b>${j}</b> em ${c}. Crie uma senha para salvar seu perfil e acompanhar todas as suas candidaturas.`,
    cta: "Criar minha conta",
    foot: "Se você não se candidatou a esta vaga, pode ignorar este email.",
  },
};

const RECOVERY: Record<Lang, { subject: string; heading: string; body: string; cta: string; foot: string }> = {
  es: {
    subject: "Tus candidaturas en TalentOS — crea tu cuenta para seguirlas",
    heading: "No pierdas tus candidaturas",
    body: "Aplicaste a una o más ofertas en TalentOS Empleos pero aún no tienes cuenta. Crea una contraseña para guardar tu perfil y seguir el estado de todas tus candidaturas en un solo lugar.",
    cta: "Crear mi cuenta",
    foot: "Si no aplicaste en TalentOS, puedes ignorar este correo.",
  },
  en: {
    subject: "Your applications on TalentOS — create your account to track them",
    heading: "Don't lose your applications",
    body: "You applied to one or more jobs on TalentOS but don't have an account yet. Set a password to save your profile and follow all your applications in one place.",
    cta: "Create my account",
    foot: "If you didn't apply on TalentOS, you can ignore this email.",
  },
  pt: {
    subject: "Suas candidaturas no TalentOS — crie sua conta para acompanhar",
    heading: "Não perca suas candidaturas",
    body: "Você se candidatou a uma ou mais vagas no TalentOS mas ainda não tem conta. Crie uma senha para salvar seu perfil e acompanhar todas as suas candidaturas em um só lugar.",
    cta: "Criar minha conta",
    foot: "Se você não se candidatou no TalentOS, pode ignorar este email.",
  },
};

// Email del barrido diario: no es por-oferta (el candidato puede tener varias candidaturas).
export function candidateRecoveryEmail(opts: { locale: string; url: string }): { subject: string; html: string } {
  const lang = (opts.locale.split("-")[0] as Lang) in RECOVERY ? (opts.locale.split("-")[0] as Lang) : "es";
  const c = RECOVERY[lang];
  return { subject: c.subject, html: shell(c.heading, c.body, c.cta, opts.url, c.foot) };
}

function shell(heading: string, body: string, cta: string, url: string, foot: string): string {
  return `<!doctype html><html><body style="margin:0;background:#F4F0E8;font-family:'Hanken Grotesk',Arial,sans-serif;color:#1A1A17">
  <div style="max-width:520px;margin:0 auto;padding:32px 20px">
    <div style="font-family:Archivo,Arial,sans-serif;font-weight:900;font-size:20px;color:#0E5C4A;margin-bottom:24px">TalentOS Empleos</div>
    <div style="background:#FCFAF6;border:1px solid #E7E1D4;border-radius:16px;padding:28px">
      <h1 style="font-family:Archivo,Arial,sans-serif;font-weight:900;font-size:23px;letter-spacing:-.5px;margin:0 0 12px">${heading}</h1>
      <p style="font-size:15px;line-height:1.6;color:#3A3833;margin:0 0 22px">${body}</p>
      <a href="${url}" style="display:inline-block;background:#0E5C4A;color:#fff;font-family:Archivo,Arial,sans-serif;font-weight:800;font-size:15px;text-decoration:none;padding:13px 22px;border-radius:12px">${cta}</a>
    </div>
    <p style="font-size:12px;line-height:1.5;color:#79746B;margin:18px 4px 0">${foot}</p>
  </div></body></html>`;
}

export function candidateActivationEmail(opts: {
  locale: string; jobTitle: string; company: string; url: string;
}): { subject: string; html: string } {
  const lang = (opts.locale.split("-")[0] as Lang) in COPY ? (opts.locale.split("-")[0] as Lang) : "es";
  const c = COPY[lang];
  const html = `<!doctype html><html><body style="margin:0;background:#F4F0E8;font-family:'Hanken Grotesk',Arial,sans-serif;color:#1A1A17">
  <div style="max-width:520px;margin:0 auto;padding:32px 20px">
    <div style="font-family:Archivo,Arial,sans-serif;font-weight:900;font-size:20px;color:#0E5C4A;margin-bottom:24px">TalentOS Empleos</div>
    <div style="background:#FCFAF6;border:1px solid #E7E1D4;border-radius:16px;padding:28px">
      <h1 style="font-family:Archivo,Arial,sans-serif;font-weight:900;font-size:23px;letter-spacing:-.5px;margin:0 0 12px">${c.heading}</h1>
      <p style="font-size:15px;line-height:1.6;color:#3A3833;margin:0 0 22px">${c.body(opts.jobTitle, opts.company)}</p>
      <a href="${opts.url}" style="display:inline-block;background:#0E5C4A;color:#fff;font-family:Archivo,Arial,sans-serif;font-weight:800;font-size:15px;text-decoration:none;padding:13px 22px;border-radius:12px">${c.cta}</a>
    </div>
    <p style="font-size:12px;line-height:1.5;color:#79746B;margin:18px 4px 0">${c.foot}</p>
  </div></body></html>`;
  return { subject: c.subject(opts.company), html };
}
