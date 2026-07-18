"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { apiFetch, notifyError } from "@/lib/api-client";
import { Loader2, Plus, Pencil, Trash2, Calendar, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateField } from "@/components/ui/date-field";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HairlineTable, HairlineRow } from "@/components/hairline-table";

// ─── types ───────────────────────────────────────────────────────────────────

type AbsenceType = {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  requires_approval: boolean;
  deducts_from_allowance: boolean;
  allowance_type_id?: string | null;
  is_public: boolean;
  requires_document: boolean;
  allow_half_day: boolean;
  allowance_types?: { name: string } | null;
};

type AllowanceType = {
  id: string;
  name: string;
  unit: string;
  is_active: boolean;
};

type AllowancePolicy = {
  id: string;
  name: string;
  amount: number;
  cycle: string;
  carryover: number;
  is_default: boolean;
  allowance_types?: { name: string } | null;
};

type CompanyHoliday = {
  id: string;
  name: string;
  date: string;
  repeats_annually: boolean;
  is_half_day: boolean;
};

// ─── constants ───────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  "#F1543F",
  "#0E5C4A",
  "#C6F24E",
  "#2B5E8A",
  "#946312",
  "#BD4332",
];

const SECTION = {
  bg: "#FCFAF6",
  border: "2px solid #1A1A17",
  boxShadow: "3px 3px 0 #1A1A17",
  borderRadius: "14px",
  padding: "20px 24px",
  marginBottom: "12px",
};

// ─── helpers ─────────────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2 text-sm"
      style={{ fontFamily: "'Hanken Grotesk', system-ui" }}
    >
      <span
        style={{
          display: "inline-flex",
          width: "36px",
          height: "20px",
          borderRadius: "999px",
          background: checked ? "#0E5C4A" : "#E7E1D4",
          border: "2px solid #1A1A17",
          alignItems: "center",
          padding: "2px",
          transition: "background 0.15s",
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            display: "block",
            width: "12px",
            height: "12px",
            borderRadius: "999px",
            background: "#FCFAF6",
            border: "1.5px solid #1A1A17",
            transform: checked ? "translateX(16px)" : "translateX(0)",
            transition: "transform 0.15s",
          }}
        />
      </span>
      <span style={{ color: "#1A1A17" }}>{label}</span>
    </button>
  );
}

function ConfirmDelete({
  open,
  onClose,
  onConfirm,
  title,
  desc,
  cancelText,
  confirmText,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  desc: string;
  cancelText: string;
  confirmText: string;
  loading: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <p
          style={{
            fontFamily: "'Hanken Grotesk', system-ui",
            fontSize: "14px",
            color: "#79746B",
          }}
        >
          {desc}
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {cancelText}
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={loading}>
            {loading && <Loader2 className="animate-spin" />}
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Empty state with seed CTA ───────────────────────────────────────────────

function EmptyAbsenceTypes() {
  const router = useRouter();
  const t = useTranslations("Settings");
  const [seeding, setSeeding] = useState(false);
  const [err, setErr] = useState("");

  async function seed() {
    setSeeding(true);
    setErr("");
    try {
      const res = await fetch("/api/absence-types/seed-defaults", { method: "POST" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Error al crear los tipos por defecto");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setSeeding(false);
    }
  }

  // Auto-seed on first visit
  useEffect(() => { seed(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ background: "#FCFAF6", border: "1px solid #E7E1D4", borderRadius: "16px", padding: "48px 24px", textAlign: "center" }}>
      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#CFC7B5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", margin: "0 auto 14px" }}><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
      <p style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: "20px", color: "#1A1A17", marginBottom: "8px" }}>
        {t("absences.types.empty.title")}
      </p>
      <p style={{ fontSize: "14px", color: "#79746B", marginBottom: "24px", maxWidth: "380px", margin: "0 auto 24px" }}>
        {t.rich("absences.types.empty.desc", { strong: (chunks) => <strong>{chunks}</strong> })}
      </p>
      {err && <p style={{ fontSize: "13px", color: "#BD4332", marginBottom: "12px" }}>{err}</p>}
      <button
        onClick={seed}
        disabled={seeding}
        style={{
          fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "14px",
          color: "#fff", background: "#0E5C4A", border: "2px solid #1A1A17",
          borderRadius: "11px", padding: "11px 24px", boxShadow: "3px 3px 0 #1A1A17",
          cursor: seeding ? "not-allowed" : "pointer",
          display: "inline-flex", alignItems: "center", gap: "8px",
          opacity: seeding ? 0.7 : 1,
        }}
      >
        {seeding ? <Loader2 size={14} className="animate-spin" /> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2 7h7l-5.5 4 2 7L12 16l-5.5 4 2-7L3 9h7z"/></svg>}
        {t("absences.types.empty.btn")}
      </button>
      <div style={{ marginTop: "10px", fontSize: "12px", color: "#79746B" }}>
        {t("absences.types.empty.help")}
      </div>
    </div>
  );
}

// ─── Tab 1: Tipos de ausencia ─────────────────────────────────────────────────

function AbsenceTypesTab({
  absenceTypes,
  allowanceTypes,
}: {
  absenceTypes: AbsenceType[];
  allowanceTypes: AllowanceType[];
}) {
  const router = useRouter();
  const t = useTranslations("Settings");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const blankForm = {
    name: "",
    color: PRESET_COLORS[0],
    icon: "📅",
    requires_approval: true,
    deducts_from_allowance: false,
    allowance_type_id: "",
    is_public: true,
    requires_document: false,
    allow_half_day: false,
  };

  const [form, setForm] = useState(blankForm);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  function openCreate() {
    setEditId(null);
    setForm(blankForm);
    setError("");
    setOpen(true);
  }

  function openEdit(t: AbsenceType) {
    setEditId(t.id);
    setForm({
      name: t.name,
      color: t.color,
      icon: t.icon ?? "📅",
      requires_approval: t.requires_approval,
      deducts_from_allowance: t.deducts_from_allowance,
      allowance_type_id: t.allowance_type_id ?? "",
      is_public: t.is_public,
      requires_document: t.requires_document,
      allow_half_day: t.allow_half_day,
    });
    setError("");
    setOpen(true);
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        allowance_type_id: form.allowance_type_id || null,
      };
      const url = editId ? `/api/absence-types/${editId}` : "/api/absence-types";
      const method = editId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al guardar");
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setSaving(false);
    }
  }

  async function doDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/absence-types/${deleteId}`, { method: "DELETE" });
      setDeleteId(null);
      router.refresh();
    } catch (e) {
      notifyError("No se pudo eliminar el tipo de ausencia", e);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: "11px",
            letterSpacing: "1.5px",
            textTransform: "uppercase",
            color: "#79746B",
          }}
        >
          {t("absences.types.count", { count: absenceTypes.length })}
        </p>
        <Button size="sm" onClick={openCreate}>
          <Plus />
          {t("absences.types.newBtn")}
        </Button>
      </div>

      {absenceTypes.length === 0 ? (
        <EmptyAbsenceTypes />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {absenceTypes.map((typeItem) => (
            <div
              key={typeItem.id}
              style={{
                ...SECTION,
                marginBottom: 0,
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <span style={{ fontSize: "22px", flexShrink: 0 }}>
                {typeItem.icon ?? "📅"}
              </span>
              <span
                style={{
                  width: "14px",
                  height: "14px",
                  borderRadius: "4px",
                  background: typeItem.color,
                  border: "1.5px solid #1A1A17",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontFamily: "'Archivo', sans-serif",
                  fontWeight: 900,
                  fontSize: "15px",
                  color: "#1A1A17",
                  flex: 1,
                }}
              >
                {typeItem.name}
              </span>
              <div
                style={{ display: "flex", gap: "6px", alignItems: "center" }}
              >
                {typeItem.deducts_from_allowance && (
                  <Badge variant="brand">
                    {t("absences.types.deducts")}{typeItem.allowance_types?.name ? ` · ${typeItem.allowance_types.name}` : ` ${t("absences.types.permiso")}`}
                  </Badge>
                )}
                {typeItem.requires_approval && (
                  <Badge variant="warning">{t("absences.types.requiresApproval")}</Badge>
                )}
                {typeItem.is_public && <Badge variant="outline">{t("absences.types.public")}</Badge>}
              </div>
              <div style={{ display: "flex", gap: "6px" }}>
                <Button size="icon" variant="ghost" onClick={() => openEdit(typeItem)}>
                  <Pencil />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setDeleteId(typeItem.id)}
                  style={{ color: "#BD4332" }}
                >
                  <Trash2 />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? t("absences.types.modal.editTitle") : t("absences.types.modal.createTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("absences.types.modal.name")}</Label>
              <Input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder={t("absences.types.modal.namePlaceholder")}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("absences.types.modal.icon")}</Label>
              <Input
                value={form.icon}
                onChange={(e) => set("icon", e.target.value)}
                placeholder="📅"
                style={{ width: "80px" }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("absences.types.modal.color")}</Label>
              <div style={{ display: "flex", gap: "8px" }}>
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => set("color", c)}
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "6px",
                      background: c,
                      border:
                        form.color === c
                          ? "3px solid #1A1A17"
                          : "2px solid #E7E1D4",
                      cursor: "pointer",
                    }}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Toggle
                checked={form.requires_approval}
                onChange={(v) => set("requires_approval", v)}
                label={t("absences.types.modal.requiresApprovalLabel")}
              />
              <Toggle
                checked={form.deducts_from_allowance}
                onChange={(v) => {
                  set("deducts_from_allowance", v);
                  if (!v) set("allowance_type_id", "");
                }}
                label={t("absences.types.modal.deductsLabel")}
              />
              {form.deducts_from_allowance && (
                <div className="space-y-1.5" style={{ paddingLeft: "4px" }}>
                  <Label>{t("absences.types.modal.allowanceTypeLabel")}</Label>
                  <Select
                    value={form.allowance_type_id}
                    onValueChange={(v) => set("allowance_type_id", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("absences.types.modal.allowanceTypePlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {allowanceTypes.map((at) => (
                        <SelectItem key={at.id} value={at.id}>
                          {at.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Toggle
                checked={form.is_public}
                onChange={(v) => set("is_public", v)}
                label={t("absences.types.modal.publicLabel")}
              />
              <Toggle
                checked={form.requires_document}
                onChange={(v) => set("requires_document", v)}
                label={t("absences.types.modal.requiresDocumentLabel")}
              />
              <Toggle
                checked={form.allow_half_day}
                onChange={(v) => set("allow_half_day", v)}
                label={t("absences.types.modal.allowHalfDayLabel")}
              />
            </div>
            {error && (
              <p style={{ fontSize: "13px", color: "#BD4332" }}>{error}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("absences.types.modal.cancelBtn")}
            </Button>
            <Button
              onClick={save}
              disabled={
                !form.name.trim() ||
                (form.deducts_from_allowance && !form.allowance_type_id) ||
                saving
              }
            >
              {saving && <Loader2 className="animate-spin" />}
              {editId ? t("absences.types.modal.saveBtn") : t("absences.types.modal.createBtn")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDelete
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={doDelete}
        title={t("absences.types.delete.title")}
        desc={t("absences.types.delete.desc")}
        cancelText={t("absences.types.delete.cancel")}
        confirmText={t("absences.types.delete.confirm")}
        loading={deleting}
      />
    </div>
  );
}

// ─── Tab 2: Políticas de permisos ─────────────────────────────────────────────

function AllowancePoliciesTab({
  allowanceTypes,
  allowancePolicies,
}: {
  allowanceTypes: AllowanceType[];
  allowancePolicies: AllowancePolicy[];
}) {
  const router = useRouter();
  const t = useTranslations("Settings");
  const [typeOpen, setTypeOpen] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [typeForm, setTypeForm] = useState({
    name: "",
    unit: "days",
    is_active: true,
  });
  const [policyForm, setPolicyForm] = useState({
    name: "",
    allowance_type_id: "",
    amount: "20",
    cycle: "year",
    carryover: "0",
    is_default: false,
  });

  const CYCLE_LABELS: Record<string, string> = {
    year: t("absences.policies.policyTable.cycles.year"),
    month: t("absences.policies.policyTable.cycles.month"),
    quarter: t("absences.policies.policyTable.cycles.quarter"),
  };

  async function saveType() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/allowance-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(typeForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      setTypeOpen(false);
      setTypeForm({ name: "", unit: "days", is_active: true });
      router.refresh();
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setSaving(false);
    }
  }

  async function savePolicy() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/allowance-policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...policyForm,
          amount: Number(policyForm.amount),
          carryover: Number(policyForm.carryover),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      setPolicyOpen(false);
      setPolicyForm({
        name: "",
        allowance_type_id: "",
        amount: "20",
        cycle: "year",
        carryover: "0",
        is_default: false,
      });
      router.refresh();
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setSaving(false);
    }
  }

  async function doDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/allowance-policies/${deleteId}`, { method: "DELETE" });
      setDeleteId(null);
      router.refresh();
    } catch (e) {
      notifyError("No se pudo eliminar la política", e);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Tipos de saldo */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3
            style={{
              fontFamily: "'Archivo', sans-serif",
              fontWeight: 900,
              fontSize: "16px",
              color: "#1A1A17",
            }}
          >
            {t("absences.policies.saldoTitle")}
          </h3>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setError("");
              setTypeOpen(true);
            }}
          >
            <Plus />
            {t("absences.policies.saldoNew")}
          </Button>
        </div>
        {allowanceTypes.length === 0 ? (
          <div
            style={{
              ...SECTION,
              textAlign: "center",
              padding: "24px",
              color: "#79746B",
              fontSize: "14px",
              fontFamily: "'Hanken Grotesk', system-ui",
            }}
          >
            {t("absences.policies.saldoEmpty")}
          </div>
        ) : (
          <HairlineTable
            cols="2fr 1fr 1fr 0.5fr"
            headers={[t("absences.policies.saldoTable.name"), t("absences.policies.saldoTable.unit"), t("absences.policies.saldoTable.status"), t("absences.policies.saldoTable.action")]}
            align={["left", "left", "left", "right"]}
          >
            {allowanceTypes.map((tItem) => (
              <HairlineRow key={tItem.id} align={["left", "left", "left", "right"]}>
                <span style={{ fontWeight: 600, fontSize: "14px" }}>{tItem.name}</span>
                <span style={{ fontSize: "13px" }}>{tItem.unit === "days" ? t("absences.policies.saldoTable.days") : t("absences.policies.saldoTable.hours")}</span>
                <Badge variant={tItem.is_active ? "success" : "outline"}>
                  {tItem.is_active ? t("absences.policies.saldoTable.active") : t("absences.policies.saldoTable.inactive")}
                </Badge>
                <Button size="icon" variant="ghost">
                  <Pencil />
                </Button>
              </HairlineRow>
            ))}
          </HairlineTable>
        )}
      </div>

      {/* Políticas */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3
            style={{
              fontFamily: "'Archivo', sans-serif",
              fontWeight: 900,
              fontSize: "16px",
              color: "#1A1A17",
            }}
          >
            {t("absences.policies.policyTitle")}
          </h3>
          <Button
            size="sm"
            onClick={() => {
              setError("");
              setPolicyOpen(true);
            }}
          >
            <Plus />
            {t("absences.policies.policyNew")}
          </Button>
        </div>
        {allowancePolicies.length === 0 ? (
          <div
            style={{
              ...SECTION,
              textAlign: "center",
              padding: "24px",
              color: "#79746B",
              fontSize: "14px",
              fontFamily: "'Hanken Grotesk', system-ui",
            }}
          >
            {t("absences.policies.policyEmpty")}
          </div>
        ) : (
          <HairlineTable
            cols="2fr 1.2fr 0.6fr 1fr 0.7fr 1fr 0.7fr"
            headers={[t("absences.policies.policyTable.name"), t("absences.policies.policyTable.type"), t("absences.policies.policyTable.amount"), t("absences.policies.policyTable.cycle"), t("absences.policies.policyTable.carryover"), t("absences.policies.policyTable.status"), t("absences.policies.policyTable.action")]}
            align={["left", "left", "right", "left", "right", "left", "right"]}
          >
            {allowancePolicies.map((p) => (
              <HairlineRow key={p.id} align={["left", "left", "right", "left", "right", "left", "right"]}>
                <span style={{ fontWeight: 600, fontSize: "14px" }}>{p.name}</span>
                <span style={{ fontSize: "13px" }}>{p.allowance_types?.name ?? "—"}</span>
                <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "12px" }}>{p.amount}</span>
                <span style={{ fontSize: "13px" }}>{CYCLE_LABELS[p.cycle] ?? p.cycle}</span>
                <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "12px" }}>{p.carryover}</span>
                <span>{p.is_default && <Badge variant="lime">{t("absences.policies.policyTable.default")}</Badge>}</span>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "4px" }}>
                  <Button size="icon" variant="ghost">
                    <Pencil />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setDeleteId(p.id)}
                    style={{ color: "#BD4332" }}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </HairlineRow>
            ))}
          </HairlineTable>
        )}
      </div>

      {/* New allowance type dialog */}
      <Dialog open={typeOpen} onOpenChange={setTypeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("absences.policies.saldoModal.title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("absences.policies.saldoModal.name")}</Label>
              <Input
                value={typeForm.name}
                onChange={(e) =>
                  setTypeForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder={t("absences.policies.saldoModal.name")}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("absences.policies.saldoModal.unit")}</Label>
              <Select
                value={typeForm.unit}
                onValueChange={(v) =>
                  setTypeForm((f) => ({ ...f, unit: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="days">{t("absences.policies.saldoModal.days")}</SelectItem>
                  <SelectItem value="hours">{t("absences.policies.saldoModal.hours")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Toggle
              checked={typeForm.is_active}
              onChange={(v) => setTypeForm((f) => ({ ...f, is_active: v }))}
              label={t("absences.policies.saldoTable.active")}
            />
            {error && (
              <p style={{ fontSize: "13px", color: "#BD4332" }}>{error}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTypeOpen(false)}>
              {t("absences.policies.saldoModal.cancel")}
            </Button>
            <Button
              onClick={saveType}
              disabled={!typeForm.name.trim() || saving}
            >
              {saving && <Loader2 className="animate-spin" />}
              {t("absences.policies.saldoModal.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New policy dialog */}
      <Dialog open={policyOpen} onOpenChange={setPolicyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("absences.policies.policyModal.title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("absences.policies.policyModal.name")}</Label>
              <Input
                value={policyForm.name}
                onChange={(e) =>
                  setPolicyForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder={t("absences.policies.policyModal.name")}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("absences.policies.policyModal.type")}</Label>
              <Select
                value={policyForm.allowance_type_id}
                onValueChange={(v) =>
                  setPolicyForm((f) => ({ ...f, allowance_type_id: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("absences.policies.policyModal.typePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {allowanceTypes.map((tItem) => (
                    <SelectItem key={tItem.id} value={tItem.id}>
                      {tItem.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>{t("absences.policies.policyModal.amount")}</Label>
                <Input
                  type="number"
                  value={policyForm.amount}
                  onChange={(e) =>
                    setPolicyForm((f) => ({ ...f, amount: e.target.value }))
                  }
                  min={0}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("absences.policies.policyModal.cycle")}</Label>
                <Select
                  value={policyForm.cycle}
                  onValueChange={(v) =>
                    setPolicyForm((f) => ({ ...f, cycle: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="year">{t("absences.policies.policyModal.cycles.year")}</SelectItem>
                    <SelectItem value="month">{t("absences.policies.policyModal.cycles.month")}</SelectItem>
                    <SelectItem value="quarter">Trimestral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("absences.policies.policyModal.carryover")}</Label>
                <Input
                  type="number"
                  value={policyForm.carryover}
                  onChange={(e) =>
                    setPolicyForm((f) => ({
                      ...f,
                      carryover: e.target.value,
                    }))
                  }
                  min={0}
                />
              </div>
            </div>
            <Toggle
              checked={policyForm.is_default}
              onChange={(v) =>
                setPolicyForm((f) => ({ ...f, is_default: v }))
              }
              label={t("absences.policies.policyModal.default")}
            />
            {error && (
              <p style={{ fontSize: "13px", color: "#BD4332" }}>{error}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPolicyOpen(false)}>
              {t("absences.policies.policyModal.cancel")}
            </Button>
            <Button
              onClick={savePolicy}
              disabled={!policyForm.name.trim() || saving}
            >
              {saving && <Loader2 className="animate-spin" />}
              {t("absences.policies.policyModal.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDelete
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={doDelete}
        title={t("absences.policies.delete.title")}
        desc={t("absences.policies.delete.desc")}
        cancelText={t("absences.policies.delete.cancel")}
        confirmText={t("absences.policies.delete.confirm")}
        loading={deleting}
      />
    </div>
  );
}

// ─── Tab 3: Festivos ──────────────────────────────────────────────────────────

function HolidaysTab({ holidays }: { holidays: CompanyHoliday[] }) {
  const router = useRouter();
  const t = useTranslations("Settings");
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    date: "",
    repeats_annually: true,
    is_half_day: false,
  });

  const filtered = holidays.filter((h) =>
    h.date.startsWith(String(year))
  );

  async function save() {
    setSaving(true);
    setError("");
    try {
      await apiFetch("/api/company/holidays", { method: "POST", json: form });
      setOpen(false);
      setForm({ name: "", date: "", repeats_annually: true, is_half_day: false });
      router.refresh();
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setSaving(false);
    }
  }

  async function doDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/company/holidays/${deleteId}`, { method: "DELETE" });
      setDeleteId(null);
      router.refresh();
    } catch (e) {
      notifyError("No se pudo eliminar el festivo", e);
    } finally {
      setDeleting(false);
    }
  }

  const formatDate = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
    });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            onClick={() => setYear((y) => y - 1)}
            style={{
              padding: "4px 10px",
              border: "2px solid #1A1A17",
              borderRadius: "8px",
              background: "#FCFAF6",
              cursor: "pointer",
              fontFamily: "'Hanken Grotesk', system-ui",
              fontWeight: 600,
            }}
          >
            ‹
          </button>
          <span
            style={{
              fontFamily: "'Archivo', sans-serif",
              fontWeight: 900,
              fontSize: "18px",
              color: "#1A1A17",
              minWidth: "60px",
              textAlign: "center",
            }}
          >
            {year}
          </span>
          <button
            onClick={() => setYear((y) => y + 1)}
            style={{
              padding: "4px 10px",
              border: "2px solid #1A1A17",
              borderRadius: "8px",
              background: "#FCFAF6",
              cursor: "pointer",
              fontFamily: "'Hanken Grotesk', system-ui",
              fontWeight: 600,
            }}
          >
            ›
          </button>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setError("");
            setOpen(true);
          }}
        >
          <Calendar />
          {t("absences.holidays.newBtn")}
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div
          style={{
            ...SECTION,
            textAlign: "center",
            padding: "40px 24px",
          }}
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#0E5C4A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", margin: "0 auto 12px" }}><circle cx="12" cy="12" r="9"/><polyline points="9 12 11 14 15 10"/></svg>
          <p
            style={{
              fontFamily: "'Archivo', sans-serif",
              fontWeight: 900,
              fontSize: "18px",
              color: "#1A1A17",
              marginBottom: "8px",
            }}
          >
            {t("absences.holidays.empty")} en {year}
          </p>
          <p
            style={{
              fontFamily: "'Hanken Grotesk', system-ui",
              fontSize: "14px",
              color: "#79746B",
            }}
          >
            Añade los festivos oficiales de tu empresa para este año
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {filtered.map((h) => (
            <div
              key={h.id}
              style={{
                ...SECTION,
                marginBottom: 0,
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <div
                style={{
                  width: "52px",
                  height: "52px",
                  background: "#EAF7C4",
                  border: "2px solid #1A1A17",
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    fontFamily: "'Archivo', sans-serif",
                    fontWeight: 900,
                    fontSize: "13px",
                    color: "#46540F",
                    textAlign: "center",
                    lineHeight: 1.2,
                  }}
                >
                  {new Date(h.date + "T00:00:00").getDate()}
                  <br />
                  <span style={{ fontSize: "10px", fontWeight: 700 }}>
                    {new Date(h.date + "T00:00:00")
                      .toLocaleDateString("es-ES", { month: "short" })
                      .toUpperCase()}
                  </span>
                </span>
              </div>
              <div style={{ flex: 1 }}>
                <p
                  style={{
                    fontFamily: "'Archivo', sans-serif",
                    fontWeight: 900,
                    fontSize: "15px",
                    color: "#1A1A17",
                    marginBottom: "2px",
                  }}
                >
                  {h.name}
                </p>
                <p
                  style={{
                    fontFamily: "'Hanken Grotesk', system-ui",
                    fontSize: "13px",
                    color: "#79746B",
                  }}
                >
                  {formatDate(h.date)}
                </p>
              </div>
              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                {h.repeats_annually && (
                  <Badge variant="brand">{t("absences.holidays.table.repeats")}</Badge>
                )}
                {h.is_half_day && (
                  <Badge variant="warning">{t("absences.holidays.table.halfDay")}</Badge>
                )}
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setDeleteId(h.id)}
                style={{ color: "#BD4332" }}
              >
                <Trash2 />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("absences.holidays.modal.title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("absences.holidays.modal.name")}</Label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder={t("absences.holidays.modal.namePlaceholder")}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("absences.holidays.modal.date")}</Label>
              <DateField
                value={form.date}
                onChange={(v) => setForm((f) => ({ ...f, date: v }))}
              />
            </div>
            <div className="space-y-2">
              <Toggle
                checked={form.repeats_annually}
                onChange={(v) =>
                  setForm((f) => ({ ...f, repeats_annually: v }))
                }
                label={t("absences.holidays.modal.repeats")}
              />
              <Toggle
                checked={form.is_half_day}
                onChange={(v) =>
                  setForm((f) => ({ ...f, is_half_day: v }))
                }
                label={t("absences.holidays.modal.halfDay")}
              />
            </div>
            {error && (
              <p style={{ fontSize: "13px", color: "#BD4332" }}>{error}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("absences.holidays.modal.cancel")}
            </Button>
            <Button
              onClick={save}
              disabled={!form.name.trim() || !form.date || saving}
            >
              {saving && <Loader2 className="animate-spin" />}
              {t("absences.holidays.modal.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDelete
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={doDelete}
        title={t("absences.holidays.delete.title")}
        desc={t("absences.holidays.delete.desc")}
        cancelText={t("absences.holidays.delete.cancel")}
        confirmText={t("absences.holidays.delete.confirm")}
        loading={deleting}
      />
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function AbsenceSettingsPanel({
  absenceTypes,
  allowanceTypes,
  allowancePolicies,
  holidays,
}: {
  absenceTypes: AbsenceType[];
  allowanceTypes: AllowanceType[];
  allowancePolicies: AllowancePolicy[];
  holidays: CompanyHoliday[];
}) {
  const t = useTranslations("Settings");
  return (
    <Tabs defaultValue="types">
      <TabsList>
        <TabsTrigger value="types">{t("absences.title")}</TabsTrigger>
        <TabsTrigger value="policies">{t("absences.policies.title")}</TabsTrigger>
        <TabsTrigger value="holidays">{t("absences.holidays.title")}</TabsTrigger>
      </TabsList>

      <TabsContent value="types">
        <AbsenceTypesTab
          absenceTypes={absenceTypes}
          allowanceTypes={allowanceTypes}
        />
      </TabsContent>

      <TabsContent value="policies">
        <AllowancePoliciesTab
          allowanceTypes={allowanceTypes}
          allowancePolicies={allowancePolicies}
        />
      </TabsContent>

      <TabsContent value="holidays">
        <HolidaysTab holidays={holidays} />
      </TabsContent>
    </Tabs>
  );
}
