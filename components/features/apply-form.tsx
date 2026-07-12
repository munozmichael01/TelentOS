"use client";

import { useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { LocationAutocomplete } from "@/components/features/location-autocomplete";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { CvValidationModal } from "@/components/features/cv-validation-modal";
import { fromCvProfile, toProfilePayload, type EditableCvProfile } from "@/lib/cv-profile";
import type { CvProfile } from "@/agents/agent-cv-parser";

const fieldLabel: React.CSSProperties = {
  display: "block",
  fontSize: "12.5px",
  fontWeight: 700,
  marginBottom: "6px",
  color: "#3A3833",
};

/* ── Phone prefixes ────────────────────────────────────────────────────── */
const PREFIXES = [
  { code: "+34", label: "ES" },
  { code: "+52", label: "MX" },
  { code: "+54", label: "AR" },
  { code: "+57", label: "CO" },
  { code: "+56", label: "CL" },
  { code: "+51", label: "PE" },
  { code: "+58", label: "VE" },
  { code: "+593", label: "EC" },
  { code: "+1",  label: "US" },
  { code: "+44", label: "GB" },
  { code: "+33", label: "FR" },
  { code: "+49", label: "DE" },
  { code: "+39", label: "IT" },
  { code: "+351", label: "PT" },
  { code: "+55", label: "BR" },
];

/** Parse asistido: solo PDF/txt (unpdf no cubre Word). Sin bloquear al candidato. */
const PARSEABLE_MIME = ["application/pdf", "text/plain"];
const PARSE_TIMEOUT_MS = 15_000;

/* ── Main form ──────────────────────────────────────────────────────────── */

export function ApplyForm({ jobId, brandColor = "#0E5C4A" }: { jobId: string; brandColor?: string }) {
  const params = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [cvName, setCvName] = useState("");
  const [cvError, setCvError] = useState(false);
  const [prefix, setPrefix] = useState("+34");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  // Parse asistido del CV + modal de validación del candidato.
  const cvFileRef = useRef<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parsedProfile, setParsedProfile] = useState<EditableCvProfile | null>(null);
  const [aiStatus, setAiStatus] = useState<"ok" | "fallback">("ok");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  function buildFormData(profile?: EditableCvProfile): FormData {
    const fd = new FormData();
    fd.append("job_id", jobId);
    fd.set("name", (profile?.name || name).trim());
    fd.set("email", (profile?.email || email).trim());
    fd.set("phone", (profile?.phone || `${prefix} ${phone}`).trim());
    fd.set("location", profile?.location || location);
    if (cvFileRef.current) fd.set("cv", cvFileRef.current);
    if (profile) fd.set("cv_profile", JSON.stringify(toProfilePayload(profile)));
    for (const key of ["utm_source", "utm_medium", "utm_campaign"]) {
      const v = params.get(key);
      if (v) fd.append(key, v);
    }
    return fd;
  }

  async function postApplication(fd: FormData): Promise<void> {
    const res = await fetch("/api/careers/apply", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Error al enviar la candidatura");
    setDone(true);
  }

  /** Dispara el parse en cuanto se adjunta el CV. Nunca bloquea: si falla o
   *  tarda demasiado, el candidato sigue con el flujo normal (sin modal). */
  async function parseCv(file: File) {
    if (!PARSEABLE_MIME.includes(file.type)) return; // Word: se adjunta, no se parsea
    setParsing(true);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PARSE_TIMEOUT_MS);
    try {
      const fd = new FormData();
      fd.set("cv", file);
      const res = await fetch("/api/careers/parse-cv", { method: "POST", body: fd, signal: controller.signal });
      if (!res.ok) return;
      const data = (await res.json()) as { profile: CvProfile; status: "ok" | "fallback" };
      // Fusiona lo extraído con lo que el candidato ya haya escrito (prioriza lo suyo).
      const extracted = fromCvProfile(data.profile);
      setParsedProfile({
        ...extracted,
        name: name.trim() || extracted.name,
        email: email.trim() || extracted.email,
        phone: phone.trim() ? `${prefix} ${phone}`.trim() : extracted.phone,
        location: location.trim() || extracted.location,
      });
      setAiStatus(data.status);
      setModalError(null);
      setModalOpen(true);
    } catch {
      // Abort/red/parse fallido → sin modal, el candidato envía normal.
    } finally {
      clearTimeout(timer);
      setParsing(false);
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    cvFileRef.current = file;
    setCvName(file?.name ?? "");
    setCvError(false);
    setParsedProfile(null);
    if (file) void parseCv(file);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!cvName) { setCvError(true); return; }
    setCvError(false);
    setSubmitting(true);
    setError("");
    try {
      await postApplication(buildFormData());
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setSubmitting(false);
    }
  }

  async function onModalConfirm() {
    if (!parsedProfile) return;
    setSubmitting(true);
    setModalError(null);
    try {
      await postApplication(buildFormData(parsedProfile));
      setModalOpen(false);
    } catch (err) {
      setModalError(String(err instanceof Error ? err.message : err));
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div style={{ background: "#FCFAF6", border: "1.5px solid #1A1A17", borderRadius: "18px", padding: "48px 30px", textAlign: "center", boxShadow: "6px 6px 0 #1A1A17" }}>
        <div style={{ width: "58px", height: "58px", margin: "0 auto 16px", borderRadius: "50%", background: "#EAF7C4", border: "1.5px solid #1A1A17", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M5 13l4 4L19 7" stroke={brandColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: "24px", letterSpacing: "-.6px" }}>
          ¡Candidatura enviada!
        </div>
        <p style={{ fontSize: "14px", color: "#79746B", margin: "9px auto 0", maxWidth: "380px", lineHeight: 1.5 }}>
          Revisaremos tu perfil y te contactaremos pronto. Recibirás una copia en tu email.
        </p>
        <div style={{ marginTop: "14px", display: "inline-flex", alignItems: "center", gap: "7px", fontFamily: "'Space Mono',monospace", fontSize: "11px", color: "#79746B", background: "#F4F0E8", border: "1px solid #E7E1D4", borderRadius: "999px", padding: "5px 13px" }}>
          <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: brandColor, flexShrink: 0 }} />
          origen registrado · career_site
        </div>
      </div>
    );
  }

  return (
    <>
      <form onSubmit={onSubmit} style={{ background: "#FCFAF6", border: "1.5px solid #E7E1D4", borderRadius: "18px", padding: "28px 30px 30px" }}>
        <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "20px", letterSpacing: "-.4px" }}>
          Aplicar a esta oferta
        </div>
        <div style={{ fontSize: "13px", color: "#79746B", marginTop: "4px" }}>
          Los campos marcados con * son obligatorios.
        </div>

        <div className="career-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginTop: "22px" }}>
          <div>
            <label style={fieldLabel}>Nombre completo *</label>
            <Input name="name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label style={fieldLabel}>Email *</label>
            <Input name="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          {/* Phone with prefix */}
          <div>
            <label style={fieldLabel}>Teléfono *</label>
            <div style={{ display: "flex", gap: "6px" }}>
              <NativeSelect
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                className="w-auto min-w-[80px] flex-shrink-0"
              >
                {PREFIXES.map((p) => (
                  <option key={p.code} value={p.code}>{p.label} {p.code}</option>
                ))}
              </NativeSelect>
              <Input
                name="_phone_number"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="612 345 678"
                className="flex-1"
              />
            </div>
          </div>

          {/* Location with autocomplete */}
          <div>
            <label style={fieldLabel}>Ubicación *</label>
            <LocationAutocomplete
              value={location}
              onChange={setLocation}
              required
              className="pr-9"
            />
          </div>
        </div>

        {/* CV */}
        <div style={{ marginTop: "15px" }}>
          <label style={fieldLabel}>
            CV * <span style={{ fontWeight: 400, color: "#79746B" }}>(PDF, DOC · máx. 8 MB)</span>
          </label>
          <div style={{
            display: "flex", alignItems: "center", gap: "9px", fontSize: "13px",
            color: cvName ? "#1A1A17" : "#79746B",
            padding: "9px 12px",
            border: `1.5px ${cvError ? "solid #F1543F" : cvName ? `solid ${brandColor}` : "dashed #E7E1D4"}`,
            borderRadius: "10px",
            background: cvError ? "#FDE8E5" : cvName ? "#EAF7C4" : "#F4F0E8",
            cursor: "pointer", position: "relative", transition: "all .15s ease",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 16V4M7 9l5-5 5 5M5 20h14" stroke={cvError ? "#F1543F" : cvName ? brandColor : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
              {cvName || "Subir CV"}
            </span>
            <input
              name="cv"
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={onFileChange}
              style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" }}
            />
          </div>
          {cvError && <p style={{ fontSize: "12px", color: "#F1543F", marginTop: "5px" }}>El CV es obligatorio.</p>}
          {parsing && (
            <p style={{ fontSize: "12px", color: "#79746B", marginTop: "6px", display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <Loader2 size={12} className="animate-spin" />
              Leyendo tu CV para autocompletar…
            </p>
          )}
          {!parsing && parsedProfile && !modalOpen && (
            <button
              type="button"
              onClick={() => { setModalError(null); setModalOpen(true); }}
              style={{ fontSize: "12px", color: brandColor, marginTop: "6px", background: "none", border: "none", padding: 0, cursor: "pointer", textDecoration: "underline", fontWeight: 600 }}
            >
              Revisar los datos extraídos de tu CV
            </button>
          )}
        </div>

        {error && <p style={{ fontSize: "13px", color: "#BD4332", marginTop: "10px" }}>{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          style={{
            marginTop: "22px",
            fontFamily: "'Archivo',sans-serif",
            fontWeight: 800,
            fontSize: "14px",
            color: "#fff",
            background: brandColor,
            border: "2px solid #1A1A17",
            borderRadius: "12px",
            padding: "12px 24px",
            boxShadow: "3px 3px 0 #1A1A17",
            cursor: submitting ? "not-allowed" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            opacity: submitting ? 0.7 : 1,
          }}
        >
          {submitting && <Loader2 size={14} className="animate-spin" />}
          Enviar candidatura
        </button>
      </form>

      {parsedProfile && (
        <CvValidationModal
          open={modalOpen}
          profile={parsedProfile}
          aiStatus={aiStatus}
          submitting={submitting}
          error={modalError}
          onChange={setParsedProfile}
          onConfirm={onModalConfirm}
          onOpenChange={setModalOpen}
        />
      )}
    </>
  );
}
