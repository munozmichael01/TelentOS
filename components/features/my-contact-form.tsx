"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";

/**
 * Los datos que el empleado mantiene él mismo: contacto y persona a avisar en una emergencia.
 *
 * Todo lo demás de su ficha es de solo lectura y lo mantiene RR.HH. — ver el porqué de cada campo
 * en la migr. 0080. Aquí no se manda a qué empleado se aplica: el servidor resuelve la ficha de
 * quien llama.
 */

const FL = {
  fontFamily: "'Space Mono',monospace", fontSize: "9.5px", textTransform: "uppercase" as const,
  letterSpacing: "1px", color: "#79746B", display: "block", marginBottom: "5px",
};

export type MyContact = {
  phone: string | null;
  address: string | null;
  city: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
};

export function MyContactForm({ initial }: { initial: MyContact }) {
  const t = useTranslations("Portal.contact");
  const router = useRouter();
  const [form, setForm] = useState<MyContact>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof MyContact) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setSaved(false);
  };

  const dirty = (Object.keys(form) as (keyof MyContact)[])
    .some((k) => (form[k] ?? "") !== (initial[k] ?? ""));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/employees/self/contact", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    }).catch(() => null);
    setSaving(false);
    if (!res?.ok) {
      const d = await res?.json().catch(() => null);
      setError(d?.error ?? t("failed"));
      return;
    }
    setSaved(true);
    router.refresh();
  }

  const fields: { key: keyof MyContact; label: string; type?: string }[] = [
    { key: "phone", label: t("phone"), type: "tel" },
    { key: "city", label: t("city") },
    { key: "address", label: t("address") },
    { key: "emergency_contact_name", label: t("emergencyName") },
    { key: "emergency_contact_phone", label: t("emergencyPhone"), type: "tel" },
  ];

  return (
    <form onSubmit={submit} style={{ background: "#FCFAF6", border: "1px solid #E7E1D4", borderRadius: "16px", padding: "22px" }}>
      <h2 style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: "16px", letterSpacing: "-.3px", margin: "0 0 4px" }}>
        {t("title")}
      </h2>
      <p style={{ fontSize: "12.5px", color: "#79746B", margin: "0 0 18px" }}>{t("description")}</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
        {fields.map(({ key, label, type }) => (
          <div key={key} style={key === "address" ? { gridColumn: "1 / -1" } : undefined}>
            <label style={FL} htmlFor={`me-${key}`}>{label}</label>
            <Input id={`me-${key}`} type={type ?? "text"} value={form[key] ?? ""} onChange={set(key)} maxLength={200} />
          </div>
        ))}
      </div>

      {error && <p style={{ fontSize: "13px", color: "#BD4332", margin: "14px 0 0" }}>{error}</p>}

      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "18px" }}>
        <button
          type="submit"
          disabled={saving || !dirty}
          style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "13px", color: "#fff", background: "#0E5C4A", border: "2px solid #1A1A17", boxShadow: "3px 3px 0 #1A1A17", borderRadius: "11px", padding: "10px 20px", cursor: saving || !dirty ? "default" : "pointer", opacity: saving || !dirty ? .5 : 1 }}
        >
          {saving ? t("saving") : t("save")}
        </button>
        {saved && !dirty && (
          <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "11px", color: "#0E5C4A" }}>{t("saved")}</span>
        )}
      </div>
    </form>
  );
}
