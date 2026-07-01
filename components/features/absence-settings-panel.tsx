"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Pencil, Trash2, Calendar, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ─── types ───────────────────────────────────────────────────────────────────

type AbsenceType = {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  requires_approval: boolean;
  deducts_from_allowance: boolean;
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
  label,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  label: string;
  loading: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminar {label}</DialogTitle>
        </DialogHeader>
        <p
          style={{
            fontFamily: "'Hanken Grotesk', system-ui",
            fontSize: "14px",
            color: "#79746B",
          }}
        >
          Esta acción no se puede deshacer. ¿Estás seguro?
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={loading}>
            {loading && <Loader2 className="animate-spin" />}
            Eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Empty state with seed CTA ───────────────────────────────────────────────

function EmptyAbsenceTypes() {
  const router = useRouter();
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
      <div style={{ fontSize: "44px", marginBottom: "14px" }}>🗂️</div>
      <p style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: "20px", color: "#1A1A17", marginBottom: "8px" }}>
        Sin tipos de ausencia
      </p>
      <p style={{ fontSize: "14px", color: "#79746B", marginBottom: "24px", maxWidth: "380px", margin: "0 auto 24px" }}>
        Crea los tipos uno a uno o usa los <strong>6 tipos por defecto</strong> que incluyen vacaciones, baja por enfermedad, permiso familiar y más.
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
        {seeding ? <Loader2 size={14} className="animate-spin" /> : "✨"}
        Crear tipos por defecto
      </button>
      <div style={{ marginTop: "10px", fontSize: "12px", color: "#79746B" }}>
        También crea un tipo de saldo <em>Días de vacaciones (22 días)</em> y su política anual
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
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    color: PRESET_COLORS[0],
    icon: "📅",
    requires_approval: true,
    deducts_from_allowance: false,
    is_public: true,
    requires_document: false,
    allow_half_day: false,
  });

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  function openCreate() {
    setForm({
      name: "",
      color: PRESET_COLORS[0],
      icon: "📅",
      requires_approval: true,
      deducts_from_allowance: false,
      is_public: true,
      requires_document: false,
      allow_half_day: false,
    });
    setError("");
    setOpen(true);
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/absence-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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
      await fetch(`/api/absence-types/${deleteId}`, { method: "DELETE" });
      setDeleteId(null);
      router.refresh();
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
          {absenceTypes.length} tipos configurados
        </p>
        <Button size="sm" onClick={openCreate}>
          <Plus />
          Nuevo tipo
        </Button>
      </div>

      {absenceTypes.length === 0 ? (
        <EmptyAbsenceTypes />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {absenceTypes.map((t) => (
            <div
              key={t.id}
              style={{
                ...SECTION,
                marginBottom: 0,
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <span style={{ fontSize: "22px", flexShrink: 0 }}>
                {t.icon ?? "📅"}
              </span>
              <span
                style={{
                  width: "14px",
                  height: "14px",
                  borderRadius: "4px",
                  background: t.color,
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
                {t.name}
              </span>
              <div
                style={{ display: "flex", gap: "6px", alignItems: "center" }}
              >
                {t.deducts_from_allowance && (
                  <Badge variant="brand">Descuenta permiso</Badge>
                )}
                {t.requires_approval && (
                  <Badge variant="warning">Requiere aprobación</Badge>
                )}
                {t.is_public && <Badge variant="outline">Público</Badge>}
              </div>
              <div style={{ display: "flex", gap: "6px" }}>
                <Button size="icon" variant="ghost">
                  <Pencil />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setDeleteId(t.id)}
                  style={{ color: "#BD4332" }}
                >
                  <Trash2 />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo tipo de ausencia</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nombre *</Label>
              <Input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Ej. Vacaciones, Baja médica…"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Icono (emoji)</Label>
              <Input
                value={form.icon}
                onChange={(e) => set("icon", e.target.value)}
                placeholder="📅"
                style={{ width: "80px" }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Color</Label>
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
                label="Requiere aprobación"
              />
              <Toggle
                checked={form.deducts_from_allowance}
                onChange={(v) => set("deducts_from_allowance", v)}
                label="Descuenta de saldo de permisos"
              />
              <Toggle
                checked={form.is_public}
                onChange={(v) => set("is_public", v)}
                label="Visible para todos los empleados"
              />
              <Toggle
                checked={form.requires_document}
                onChange={(v) => set("requires_document", v)}
                label="Requiere documento justificativo"
              />
              <Toggle
                checked={form.allow_half_day}
                onChange={(v) => set("allow_half_day", v)}
                label="Permite medio día"
              />
            </div>
            {error && (
              <p style={{ fontSize: "13px", color: "#BD4332" }}>{error}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={!form.name.trim() || saving}>
              {saving && <Loader2 className="animate-spin" />}
              Crear tipo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDelete
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={doDelete}
        label="tipo de ausencia"
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
    year: "Anual",
    month: "Mensual",
    quarter: "Trimestral",
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
      await fetch(`/api/allowance-policies/${deleteId}`, { method: "DELETE" });
      setDeleteId(null);
      router.refresh();
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
            Tipos de saldo
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
            Nuevo tipo de saldo
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
            Sin tipos de saldo configurados
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Unidad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allowanceTypes.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell>
                    {t.unit === "days" ? "Días" : "Horas"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={t.is_active ? "success" : "outline"}>
                      {t.is_active ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost">
                      <Pencil />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
            Políticas
          </h3>
          <Button
            size="sm"
            onClick={() => {
              setError("");
              setPolicyOpen(true);
            }}
          >
            <Plus />
            Nueva política
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
            Sin políticas configuradas
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Ciclo</TableHead>
                <TableHead>Arrastre</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allowancePolicies.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.allowance_types?.name ?? "—"}</TableCell>
                  <TableCell>{p.amount}</TableCell>
                  <TableCell>{CYCLE_LABELS[p.cycle] ?? p.cycle}</TableCell>
                  <TableCell>{p.carryover}</TableCell>
                  <TableCell>
                    {p.is_default && (
                      <Badge variant="lime">Por defecto</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* New allowance type dialog */}
      <Dialog open={typeOpen} onOpenChange={setTypeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo tipo de saldo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nombre *</Label>
              <Input
                value={typeForm.name}
                onChange={(e) =>
                  setTypeForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Ej. Vacaciones, Asuntos propios…"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Unidad</Label>
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
                  <SelectItem value="days">Días</SelectItem>
                  <SelectItem value="hours">Horas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Toggle
              checked={typeForm.is_active}
              onChange={(v) => setTypeForm((f) => ({ ...f, is_active: v }))}
              label="Activo"
            />
            {error && (
              <p style={{ fontSize: "13px", color: "#BD4332" }}>{error}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTypeOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={saveType}
              disabled={!typeForm.name.trim() || saving}
            >
              {saving && <Loader2 className="animate-spin" />}
              Crear tipo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New policy dialog */}
      <Dialog open={policyOpen} onOpenChange={setPolicyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva política de permiso</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nombre *</Label>
              <Input
                value={policyForm.name}
                onChange={(e) =>
                  setPolicyForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Ej. 22 días vacaciones estándar"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo de saldo</Label>
              <Select
                value={policyForm.allowance_type_id}
                onValueChange={(v) =>
                  setPolicyForm((f) => ({ ...f, allowance_type_id: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un tipo…" />
                </SelectTrigger>
                <SelectContent>
                  {allowanceTypes.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Cantidad</Label>
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
                <Label>Ciclo</Label>
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
                    <SelectItem value="year">Anual</SelectItem>
                    <SelectItem value="month">Mensual</SelectItem>
                    <SelectItem value="quarter">Trimestral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Arrastre máx.</Label>
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
              label="Política por defecto"
            />
            {error && (
              <p style={{ fontSize: "13px", color: "#BD4332" }}>{error}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPolicyOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={savePolicy}
              disabled={!policyForm.name.trim() || saving}
            >
              {saving && <Loader2 className="animate-spin" />}
              Crear política
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDelete
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={doDelete}
        label="política"
        loading={deleting}
      />
    </div>
  );
}

// ─── Tab 3: Festivos ──────────────────────────────────────────────────────────

function HolidaysTab({ holidays }: { holidays: CompanyHoliday[] }) {
  const router = useRouter();
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
      const res = await fetch("/api/company-holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
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
      await fetch(`/api/company-holidays/${deleteId}`, { method: "DELETE" });
      setDeleteId(null);
      router.refresh();
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
          Añadir festivo
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
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>🎉</div>
          <p
            style={{
              fontFamily: "'Archivo', sans-serif",
              fontWeight: 900,
              fontSize: "18px",
              color: "#1A1A17",
              marginBottom: "8px",
            }}
          >
            Sin festivos en {year}
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
                  <Badge variant="brand">Se repite</Badge>
                )}
                {h.is_half_day && (
                  <Badge variant="warning">Medio día</Badge>
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
            <DialogTitle>Añadir festivo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nombre del festivo *</Label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Ej. Día de la Constitución"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Fecha *</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, date: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Toggle
                checked={form.repeats_annually}
                onChange={(v) =>
                  setForm((f) => ({ ...f, repeats_annually: v }))
                }
                label="Se repite cada año"
              />
              <Toggle
                checked={form.is_half_day}
                onChange={(v) =>
                  setForm((f) => ({ ...f, is_half_day: v }))
                }
                label="Medio día festivo"
              />
            </div>
            {error && (
              <p style={{ fontSize: "13px", color: "#BD4332" }}>{error}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={save}
              disabled={!form.name.trim() || !form.date || saving}
            >
              {saving && <Loader2 className="animate-spin" />}
              Añadir festivo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDelete
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={doDelete}
        label="festivo"
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
  return (
    <Tabs defaultValue="types">
      <TabsList>
        <TabsTrigger value="types">Tipos de ausencia</TabsTrigger>
        <TabsTrigger value="policies">Políticas de permisos</TabsTrigger>
        <TabsTrigger value="holidays">Festivos de empresa</TabsTrigger>
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
