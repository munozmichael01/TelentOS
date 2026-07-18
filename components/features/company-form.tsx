"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LocationAutocomplete } from "@/components/features/location-autocomplete";
import { createClient } from "@/lib/supabase/client";
import { apiFetch } from "@/lib/api-client";
import { slugify } from "@/lib/utils";
import type { Company } from "@/lib/types";
import { useTranslations } from "next-intl";

const COUNTRIES = [
  { code: "ES", label: "España", currency: "EUR" },
  { code: "VE", label: "Venezuela", currency: "USD" },
  { code: "BR", label: "Brasil", currency: "BRL" },
  { code: "CO", label: "Colombia", currency: "COP" },
  { code: "MX", label: "México", currency: "MXN" },
] as const;

/** Configuración del workspace y del career site público. */
export function CompanyForm({ company }: { company: Company | null }) {
  const router = useRouter();
  const t = useTranslations("Settings");
  const [form, setForm] = useState({
    name: company?.name ?? "",
    slug: company?.slug ?? "",
    description: company?.description ?? "",
    website: company?.website ?? "",
    logo_url: company?.logo_url ?? "",
    address: (company as (Company & { address?: string }) | null)?.address ?? "",
    country: company?.country ?? "",
    rif: company?.rif ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function uploadLogo(file: File) {
    setUploading(true);
    try {
      const supabase = createClient();
      const path = `logo-${Date.now()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("logos").upload(path, file);
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("logos").getPublicUrl(path);
      set("logo_url", data.publicUrl);
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      await apiFetch("/api/company", {
        method: "POST",
        json: {
          ...form,
          address: form.address || null,
          country: form.country || null,
          rif: form.rif || null,
        },
      });
      setSaved(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("company.form.errorMsg"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl space-y-4">
      <div className="space-y-1.5">
        <Label>{t("company.form.nameLabel")}</Label>
        <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>{t("company.form.slugLabel")}</Label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">/careers/</span>
          <Input
            value={form.slug}
            onChange={(e) => set("slug", e.target.value)}
            onBlur={(e) => set("slug", slugify(e.target.value || form.name))}
            placeholder={slugify(form.name) || t("company.form.slugPlaceholder")}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>{t("company.form.descriptionLabel")}</Label>
        <Textarea rows={4} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder={t("company.form.descriptionPlaceholder")} />
      </div>
      <div className="space-y-1.5">
        <Label>{t("company.form.websiteLabel")}</Label>
        <Input value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://…" />
      </div>
      <div className="space-y-1.5">
        <Label>{t("company.form.addressLabel")}</Label>
        <LocationAutocomplete
          value={form.address}
          onChange={(v) => set("address", v)}
          placeholder={t("company.form.addressPlaceholder")}
          className=""
        />
        <p className="text-xs text-muted-foreground">{t("company.form.addressHelp")}</p>
      </div>

      {/* ── Nómina ──────────────────────────────────────────────────── */}
      <div className="border-t border-line pt-4">
        <p className="mb-3 text-xs font-mono uppercase tracking-wide text-soft">{t("company.form.payrollSection")}</p>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t("company.form.countryLabel")}</Label>
            <select
              value={form.country}
              onChange={(e) => set("country", e.target.value)}
              className="h-9 w-full rounded-[11px] border border-line bg-surface px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/30"
            >
              <option value="">{t("company.form.countryDefault")}</option>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {t("countries." + c.code)}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              {t("company.form.countryHelp")}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>{t("company.form.rifLabel")}</Label>
            <Input value={form.rif} onChange={(e) => set("rif", e.target.value)} placeholder={t("company.form.rifPlaceholder")} />
          </div>
        </div>
      </div>

      {/* ── Logo ─────────────────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <Label>{t("company.form.logoLabel")}</Label>
        <div className="flex items-center gap-3">
          {form.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={form.logo_url} alt="logo" className="h-12 w-12 rounded-md border object-contain" />
          )}
          <Input type="file" accept="image/*" className="max-w-xs" disabled={uploading} onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {saved && <p className="text-sm text-emerald-600">{t("company.form.savedMsg")}</p>}
      <Button onClick={save} disabled={!form.name.trim() || saving}>
        {saving && <Loader2 className="animate-spin" />}
        {saving ? t("company.form.savingBtn") : t("company.form.saveBtn")}
      </Button>
    </div>
  );
}
