"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

const ARCHIVO = "'Archivo',sans-serif";
const MONO = "'Space Mono',monospace";

type Question = { id: string; type: string; prompt: string; options: string[]; required: boolean };

export function JobApplyBar({
  jobId, jobTitle, companyName, screening, locale,
}: {
  jobId: string; jobTitle: string; companyName: string; screening: Question[]; locale: string;
}) {
  const t = useTranslations("Board");
  const [saved, setSaved] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleSave() {
    const next = !saved;
    setSaved(next);
    const res = next
      ? await fetch("/api/board/saved", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobId }) })
      : await fetch(`/api/board/saved?jobId=${jobId}`, { method: "DELETE" });
    if (res.status === 401) { setSaved(false); window.location.href = `/${locale}/login`; }
    else if (!res.ok) setSaved(!next);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true); setError(null);
    const res = await fetch("/api/board/apply", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId, candidate: { name: form.name, email: form.email, phone: form.phone }, screeningAnswers: answers }),
    }).catch(() => null);
    setSubmitting(false);
    if (res?.ok) setDone(true);
    else setError(t("apply.error"));
  }

  const canSubmit = form.name.trim() && form.email.trim() &&
    screening.every((q) => !q.required || (answers[q.id] != null && String(answers[q.id]).trim() !== ""));

  const inputStyle: React.CSSProperties = { width: "100%", fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: "#1A1A17", background: "#FCFAF6", border: "1.5px solid #E7E1D4", borderRadius: 10, padding: "10px 12px", outline: "none" };
  const labelStyle: React.CSSProperties = { fontFamily: MONO, fontSize: 10, textTransform: "uppercase", letterSpacing: .5, color: "#79746B", marginBottom: 5, display: "block" };

  return (
    <>
      {/* Sticky apply bar */}
      <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, background: "rgba(252,250,246,.96)", backdropFilter: "blur(8px)", borderTop: "1px solid #E7E1D4", padding: "12px 16px 16px", zIndex: 30 }}>
        <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={toggleSave} aria-label="save" className="jb-hard" style={{ width: 46, height: 46, flexShrink: 0, borderRadius: 12, background: "#FCFAF6", border: "2px solid #1A1A17", boxShadow: "3px 3px 0 #1A1A17", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill={saved ? "#0E5C4A" : "none"}><path d="M6 4h12v17l-6-4-6 4V4Z" stroke={saved ? "#0E5C4A" : "#1A1A17"} strokeWidth="2" strokeLinejoin="round" /></svg>
          </button>
          <button onClick={() => { setOpen(true); setDone(false); setError(null); }} className="jb-hard" style={{ flex: 1, fontFamily: ARCHIVO, fontWeight: 800, fontSize: 15, color: "#fff", background: "#F1543F", border: "2px solid #1A1A17", borderRadius: 12, padding: 13, boxShadow: "3px 3px 0 #1A1A17", cursor: "pointer" }}>
            {t("detail.apply")} →
          </button>
        </div>
      </div>

      {/* Apply modal */}
      {open && (
        <div onClick={() => !submitting && setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(26,26,23,.45)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 560, maxHeight: "90%", overflowY: "auto", background: "#F4F0E8", borderRadius: "22px 22px 0 0", borderTop: "2px solid #1A1A17" }}>
            {done ? (
              <div style={{ padding: "40px 24px", textAlign: "center" }}>
                <div style={{ width: 52, height: 52, borderRadius: 16, background: "#DCEFE4", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5 9-11" stroke="#0E5C4A" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
                <div style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 20, letterSpacing: "-.5px", marginBottom: 8 }}>{t("apply.success")}</div>
                <p style={{ fontSize: 14, lineHeight: 1.5, color: "#54504A", margin: "0 0 20px" }}>{t("apply.successDesc")}</p>
                <button onClick={() => setOpen(false)} style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 14, color: "#fff", background: "#0E5C4A", border: "none", borderRadius: 11, padding: "11px 22px", cursor: "pointer" }}>OK</button>
              </div>
            ) : (
              <form onSubmit={submit} style={{ padding: "18px 20px 24px" }}>
                <div style={{ width: 38, height: 4, borderRadius: 999, background: "#CFC7B6", margin: "0 auto 14px" }} />
                <div style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 19, letterSpacing: "-.5px", lineHeight: 1.1 }}>{t("apply.title", { job: jobTitle })}</div>
                {companyName && <div style={{ fontFamily: MONO, fontSize: 12, color: "#79746B", marginTop: 3, marginBottom: 18 }}>{t("apply.at", { company: companyName })}</div>}

                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div><label style={labelStyle}>{t("apply.name")}</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} /></div>
                  <div><label style={labelStyle}>{t("apply.email")}</label><input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={inputStyle} /></div>
                  <div><label style={labelStyle}>{t("apply.phone")}</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} style={inputStyle} /></div>

                  {screening.length > 0 && (
                    <div style={{ borderTop: "1px solid #E7E1D4", paddingTop: 14 }}>
                      <div style={{ fontFamily: MONO, fontSize: 10, textTransform: "uppercase", letterSpacing: .5, color: "#79746B", marginBottom: 12 }}>{t("apply.screening")}</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        {screening.map((q) => (
                          <div key={q.id}>
                            <label style={{ ...labelStyle, textTransform: "none", fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, fontWeight: 600, color: "#1A1A17" }}>
                              {q.prompt}{q.required && <span style={{ color: "#F1543F" }}> *</span>}
                            </label>
                            {q.type === "yes_no" ? (
                              <div style={{ display: "flex", gap: 8 }}>
                                {[t("apply.yes"), t("apply.no")].map((opt) => {
                                  const on = answers[q.id] === opt;
                                  return <button type="button" key={opt} onClick={() => setAnswers({ ...answers, [q.id]: opt })} style={{ flex: 1, fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 700, fontSize: 13, padding: "9px", borderRadius: 10, border: `1.5px solid ${on ? "#1A1A17" : "#E7E1D4"}`, background: on ? "#DCEFE4" : "#FCFAF6", color: on ? "#0E5C4A" : "#54504A", cursor: "pointer" }}>{opt}</button>;
                                })}
                              </div>
                            ) : q.type === "single_choice" ? (
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                                {q.options.map((opt) => {
                                  const on = answers[q.id] === opt;
                                  return <button type="button" key={opt} onClick={() => setAnswers({ ...answers, [q.id]: opt })} style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 600, fontSize: 13, padding: "7px 13px", borderRadius: 999, border: `1.5px solid ${on ? "#1A1A17" : "#E7E1D4"}`, background: on ? "#DCEFE4" : "#FCFAF6", color: on ? "#0E5C4A" : "#54504A", cursor: "pointer" }}>{opt}</button>;
                                })}
                              </div>
                            ) : (
                              <input type={q.type === "url" ? "url" : "text"} value={(answers[q.id] as string) ?? ""} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} style={inputStyle} />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {error && <div style={{ marginTop: 14, fontSize: 13, color: "#C7402E" }}>{error}</div>}

                <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                  <button type="button" onClick={() => setOpen(false)} disabled={submitting} style={{ fontFamily: ARCHIVO, fontWeight: 700, fontSize: 14, color: "#54504A", background: "transparent", border: "1.5px solid #E7E1D4", borderRadius: 11, padding: "12px 18px", cursor: "pointer" }}>{t("apply.cancel")}</button>
                  <button type="submit" disabled={!canSubmit || submitting} className="jb-hard" style={{ flex: 1, fontFamily: ARCHIVO, fontWeight: 800, fontSize: 15, color: "#fff", background: canSubmit ? "#F1543F" : "#C7B9B0", border: "2px solid #1A1A17", borderRadius: 12, padding: 13, boxShadow: "3px 3px 0 #1A1A17", cursor: canSubmit ? "pointer" : "not-allowed" }}>
                    {submitting ? t("apply.sending") : t("apply.submit")}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
