"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DateField } from "@/components/ui/date-field";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ModalitySelector, type WorkModality } from "@/components/ui/modality-selector";
import { JobTitlePicker } from "@/components/features/job-title-picker";
import type { Employee } from "@/lib/types";

/** Cabecera de grupo de la ficha (DS §3.1): legend Space Mono uppercase + divisor. */
function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3 border-0 p-0 m-0">
      <legend
        className="w-full border-b border-[#E7E1D4] pb-1.5 text-[10px] uppercase tracking-[1px] text-[#79746B]"
        style={{ fontFamily: "'Space Mono', monospace" }}
      >
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

/** Beneficios como chips multi-selección (DS §3.1): pill r-999, seleccionado brand-soft + borde brand. */
function BenefitsInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const t = useTranslations("People");
  const [draft, setDraft] = useState("");
  const add = () => {
    const val = draft.trim();
    if (val && !value.includes(val)) onChange([...value, val]);
    setDraft("");
  };
  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2" style={{ minHeight: value.length ? undefined : 0 }}>
        {value.map((b) => (
          <span
            key={b}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#0E5C4A] bg-[#E4F0EA] px-3 py-1 text-[13px] text-[#0E5C4A]"
          >
            {b}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== b))} aria-label={t("form.fields.benefitsRemove", { name: b })}>
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
        onBlur={add}
        placeholder={t("form.fields.benefitsPlaceholder")}
      />
    </div>
  );
}

/** Alta manual de empleado, o edición de ficha si recibe `employee`. */
export function EmployeeForm({
  managers,
  employee,
  trigger,
}: {
  managers: { id: string; name: string }[];
  employee?: Employee;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const t = useTranslations("People");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // Etiqueta del cargo canónico vinculado. No se persiste (vive en la taxonomía), así que se
  // resuelve al abrir la ficha en edición y se mantiene fuera de `form` para que el payload
  // siga siendo exactamente lo que se guarda.
  const [jobTitleLabel, setJobTitleLabel] = useState("");
  const [form, setForm] = useState({
    name: employee?.name ?? "",
    email: employee?.email ?? "",
    phone: employee?.phone ?? "",
    national_id: employee?.national_id ?? "",
    birth_date: employee?.birth_date ?? "",
    emergency_contact_name: employee?.emergency_contact_name ?? "",
    emergency_contact_phone: employee?.emergency_contact_phone ?? "",
    role_title: employee?.role_title ?? "",
    job_title_id: employee?.job_title_id ?? "",
    department: employee?.department ?? "",
    seniority_level: employee?.seniority_level ?? "",
    start_date: employee?.start_date ?? new Date().toISOString().slice(0, 10),
    contract_type: employee?.contract_type ?? "indefinido",
    manager_id: employee?.manager_id ?? "",
    country: employee?.country ?? "",
    city: employee?.city ?? "",
    work_location: employee?.work_location ?? "",
    address: employee?.address ?? "",
    work_modality: (employee?.work_modality ?? null) as WorkModality | null,
    legal_entity: employee?.legal_entity ?? "",
    benefits: employee?.benefits ?? [],
  });

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  // Al abrir en edición, resuelve la etiqueta localizada del cargo vinculado (el canónico de
  // ESCO está en inglés). Solo cuando hace falta: si no hay cargo, no se pide nada.
  useEffect(() => {
    if (!open || !form.job_title_id || jobTitleLabel) return;
    let alive = true;
    fetch(`/api/job-titles?id=${form.job_title_id}&locale=${locale}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d?.title?.label) setJobTitleLabel(d.title.label); })
      .catch(() => {});
    return () => { alive = false; };
  }, [open, form.job_title_id, jobTitleLabel, locale]);

  async function save() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(employee ? `/api/employees/${employee.id}` : "/api/employees", {
        method: employee ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, manager_id: form.manager_id || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("form.saveError"));
      setOpen(false);
      router.refresh();
      if (!employee) router.push(`/app/employees/${data.employee.id}`);
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <span onClick={() => setOpen(true)}>
        {trigger ?? (
          <Button>
            <Plus />
            {t("form.newBtn")}
          </Button>
        )}
      </span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{employee ? t("form.editTitle") : t("form.createTitle")}</DialogTitle>
          </DialogHeader>

          <div className="max-h-[65vh] space-y-6 overflow-y-auto pr-1">
            {/* ── Personales ── */}
            <Group title={t("form.groups.personal")}>
              <div className="space-y-1.5">
                <Label>{t("form.fields.name")}</Label>
                <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t("form.fields.email")}</Label>
                  <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("form.fields.phone")}</Label>
                  <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("form.fields.nationalId")}</Label>
                  <Input value={form.national_id} onChange={(e) => set("national_id", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("form.fields.birthDate")}</Label>
                  <DateField value={form.birth_date} onChange={(v) => set("birth_date", v)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("form.fields.emergencyContact")}</Label>
                  <Input value={form.emergency_contact_name} onChange={(e) => set("emergency_contact_name", e.target.value)} placeholder={t("form.fields.emergencyContactPlaceholder")} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("form.fields.emergencyPhone")}</Label>
                  <Input value={form.emergency_contact_phone} onChange={(e) => set("emergency_contact_phone", e.target.value)} />
                </div>
              </div>
            </Group>

            {/* ── Puesto y organización ── */}
            <Group title={t("form.groups.org")}>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t("form.fields.role")}</Label>
                  <Input value={form.role_title} onChange={(e) => set("role_title", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("form.fields.seniority")}</Label>
                  <Input value={form.seniority_level} onChange={(e) => set("seniority_level", e.target.value)} placeholder={t("form.fields.seniorityPlaceholder")} />
                </div>
                {/* Cargo canónico de la taxonomía: de aquí salen las competencias evaluables.
                    Reutiliza el picker compartido con el formulario de ofertas. */}
                <div className="col-span-2 space-y-1.5">
                  <Label>
                    {t("form.fields.jobTitle")}{" "}
                    <span className="font-normal text-[#79746B]">{t("form.fields.jobTitleHint")}</span>
                  </Label>
                  {form.job_title_id ? (
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#0E5C4A] bg-[#E4F0EA] px-3 py-1 text-[13px] text-[#0E5C4A]">
                        {jobTitleLabel || form.role_title}
                        <button
                          type="button"
                          onClick={() => { set("job_title_id", ""); setJobTitleLabel(""); }}
                          aria-label={t("form.fields.jobTitleClear")}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    </div>
                  ) : (
                    <JobTitlePicker
                      valueLabel=""
                      placeholder={t("form.fields.jobTitlePlaceholder")}
                      onPick={(jt) => {
                        set("job_title_id", jt.id);
                        setJobTitleLabel(jt.label);
                        // Si la ficha aún no tiene cargo escrito, se propone el de la taxonomía.
                        if (!form.role_title.trim()) set("role_title", jt.label);
                      }}
                    />
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>{t("form.fields.dept")}</Label>
                  <Input value={form.department} onChange={(e) => set("department", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("form.fields.joined")}</Label>
                  <DateField value={form.start_date} onChange={(v) => set("start_date", v)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("form.fields.contract")}</Label>
                  <Select value={form.contract_type} onValueChange={(v) => set("contract_type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="indefinido">{t("form.contracts.indefinido")}</SelectItem>
                      <SelectItem value="temporal">{t("form.contracts.temporal")}</SelectItem>
                      <SelectItem value="practicas">{t("form.contracts.practicas")}</SelectItem>
                      <SelectItem value="freelance">{t("form.contracts.freelance")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t("form.fields.reportsTo")}</Label>
                  <Select value={form.manager_id} onValueChange={(v) => set("manager_id", v)}>
                    <SelectTrigger><SelectValue placeholder={t("form.fields.reportsToPlaceholder")} /></SelectTrigger>
                    <SelectContent>
                      {managers
                        .filter((m) => m.id !== employee?.id)
                        .map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Group>

            {/* ── Ubicación y modalidad ── */}
            <Group title={t("form.groups.location")}>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>{t("form.fields.country")}</Label>
                  <Input value={form.country} onChange={(e) => set("country", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("form.fields.city")}</Label>
                  <Input value={form.city} onChange={(e) => set("city", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("form.fields.location")}</Label>
                  <Input value={form.work_location} onChange={(e) => set("work_location", e.target.value)} placeholder={t("form.fields.locationPlaceholder")} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t("form.fields.address")}</Label>
                <Textarea value={form.address} onChange={(e) => set("address", e.target.value)} rows={2} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("form.fields.modality")}</Label>
                <ModalitySelector value={form.work_modality} onChange={(m) => set("work_modality", m)} />
              </div>
            </Group>

            {/* ── Legal y compensación ── */}
            <Group title={t("form.groups.legal")}>
              <div className="space-y-1.5">
                <Label>{t("form.fields.legalEntity")}</Label>
                <Input value={form.legal_entity} onChange={(e) => set("legal_entity", e.target.value)} placeholder={t("form.fields.legalEntityPlaceholder")} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("form.fields.benefits")}</Label>
                <BenefitsInput value={form.benefits} onChange={(v) => set("benefits", v)} />
              </div>
            </Group>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t("form.cancelBtn")}</Button>
            <Button onClick={save} disabled={!form.name.trim() || saving}>
              {saving && <Loader2 className="animate-spin" />}
              {t("form.saveBtn")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
