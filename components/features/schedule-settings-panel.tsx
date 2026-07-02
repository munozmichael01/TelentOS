"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Pencil, Trash2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TimeField } from "@/components/ui/time-field";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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

// ─── types ───────────────────────────────────────────────────────────────────

type ScheduleDay = {
  id: string;
  day_of_week: number;
  is_working: boolean;
  total_minutes: number;
  time_slots?: { start_time: string; end_time: string }[];
};

type ScheduleWeek = {
  id: string;
  week_number: number;
  days: ScheduleDay[];
};

type ScheduleTemplate = {
  id: string;
  name: string;
  week_type: "single" | "rotating";
  is_default: boolean;
  is_active: boolean;
  weeks: ScheduleWeek[];
};

// ─── constants ───────────────────────────────────────────────────────────────

const DAYS_ES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const DAY_FULL = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

const CARD_STYLE = {
  background: "#FCFAF6",
  border: "2px solid #1A1A17",
  boxShadow: "3px 3px 0 #1A1A17",
  borderRadius: "14px",
  padding: "20px",
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

function minutesToHours(m: number) {
  const h = Math.floor(m / 60);
  const min = m % 60;
  if (min === 0) return `${h}h`;
  return `${h}h ${min}m`;
}

function timeToMinutes(t: string) {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

// ─── Mini week grid ───────────────────────────────────────────────────────────

function WeekPreview({ week }: { week: ScheduleWeek }) {
  const totalMinutes = week.days
    .filter((d) => d.is_working)
    .reduce((sum, d) => sum + d.total_minutes, 0);

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: "4px",
          marginBottom: "8px",
        }}
      >
        {DAYS_ES.map((label, i) => {
          const day = week.days.find((d) => d.day_of_week === i);
          const active = day?.is_working ?? false;
          return (
            <div key={label} style={{ textAlign: "center" }}>
              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: "9px",
                  color: "#79746B",
                  letterSpacing: "0.5px",
                  marginBottom: "3px",
                  textTransform: "uppercase",
                }}
              >
                {label}
              </div>
              <div
                style={{
                  height: "32px",
                  borderRadius: "6px",
                  background: active ? "#EAF7C4" : "#F4F0E8",
                  border: active ? "1.5px solid #C6F24E" : "1.5px solid #E7E1D4",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {active && day && (
                  <span
                    style={{
                      fontFamily: "'Space Mono', monospace",
                      fontSize: "8px",
                      color: "#46540F",
                      fontWeight: 700,
                    }}
                  >
                    {Math.floor(day.total_minutes / 60)}h
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p
        style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: "10px",
          color: "#79746B",
          letterSpacing: "0.5px",
        }}
      >
        TOTAL: {minutesToHours(totalMinutes)} / semana
      </p>
    </div>
  );
}

// ─── Schedule builder (form sub-component) ────────────────────────────────────

type DayForm = {
  is_working: boolean;
  start: string;
  end: string;
};

type WeekForm = DayForm[];

function buildEmptyWeek(): WeekForm {
  return DAY_FULL.map((_, i) => ({
    is_working: i < 5, // Mon-Fri default
    start: "09:00",
    end: "18:00",
  }));
}

function ScheduleWeekBuilder({
  week,
  label,
  onChange,
}: {
  week: WeekForm;
  label: string;
  onChange: (w: WeekForm) => void;
}) {
  return (
    <div>
      {label && (
        <p
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: "11px",
            letterSpacing: "1.5px",
            textTransform: "uppercase",
            color: "#79746B",
            marginBottom: "10px",
          }}
        >
          {label}
        </p>
      )}
      <div className="space-y-2">
        {DAY_FULL.map((dayName, i) => {
          const d = week[i]!;
          return (
            <div
              key={dayName}
              style={{
                display: "grid",
                gridTemplateColumns: "120px 1fr 1fr",
                gap: "10px",
                alignItems: "center",
                padding: "8px 12px",
                background: d.is_working ? "#F4F0E8" : "transparent",
                borderRadius: "8px",
                border: "1.5px solid #E7E1D4",
              }}
            >
              <Toggle
                checked={d.is_working}
                onChange={(v) => {
                  const next = [...week] as WeekForm;
                  next[i] = { ...d, is_working: v };
                  onChange(next);
                }}
                label={dayName}
              />
              <div className="space-y-1">
                <Label
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: "9px",
                    letterSpacing: "1px",
                    textTransform: "uppercase",
                    color: "#79746B",
                  }}
                >
                  Entrada
                </Label>
                <TimeField
                  value={d.start}
                  disabled={!d.is_working}
                  onChange={(v) => {
                    const next = [...week] as WeekForm;
                    next[i] = { ...d, start: v };
                    onChange(next);
                  }}
                  style={{ height: "32px", fontSize: "13px" }}
                />
              </div>
              <div className="space-y-1">
                <Label
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: "9px",
                    letterSpacing: "1px",
                    textTransform: "uppercase",
                    color: "#79746B",
                  }}
                >
                  Salida
                </Label>
                <TimeField
                  value={d.end}
                  disabled={!d.is_working}
                  onChange={(v) => {
                    const next = [...week] as WeekForm;
                    next[i] = { ...d, end: v };
                    onChange(next);
                  }}
                  style={{ height: "32px", fontSize: "13px" }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function ScheduleSettingsPanel({
  templates,
}: {
  templates: ScheduleTemplate[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // form state
  const [name, setName] = useState("");
  const [weekType, setWeekType] = useState<"single" | "rotating">("single");
  const [isDefault, setIsDefault] = useState(false);
  const [activeWeekTab, setActiveWeekTab] = useState<"A" | "B">("A");
  const [weekA, setWeekA] = useState<WeekForm>(buildEmptyWeek());
  const [weekB, setWeekB] = useState<WeekForm>(buildEmptyWeek());

  function openCreate() {
    setName("");
    setWeekType("single");
    setIsDefault(false);
    setActiveWeekTab("A");
    setWeekA(buildEmptyWeek());
    setWeekB(buildEmptyWeek());
    setError("");
    setOpen(true);
  }

  function buildWeeksPayload() {
    const weeksToProcess = weekType === "single" ? [weekA] : [weekA, weekB];
    return weeksToProcess.map((week, wi) => ({
      week_index: wi,
      week_label: `Semana ${wi + 1}`,
      days: week.map((d, di) => ({
        day_of_week: di,        // 0=Mon … 6=Sun, matches calculate-days logic
        is_working_day: d.is_working,
        total_minutes: d.is_working
          ? Math.max(0, timeToMinutes(d.end) - timeToMinutes(d.start))
          : 0,
        slots: d.is_working
          ? [{ start: d.start, end: d.end }]
          : [],
      })),
    }));
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/schedule-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          week_type: weekType,
          is_default: isDefault,
          is_active: true,
          weeks: buildWeeksPayload(),
        }),
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

  async function setAsDefault(id: string) {
    await fetch(`/api/schedule-templates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_default: true }),
    });
    router.refresh();
  }

  async function doDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await fetch(`/api/schedule-templates/${deleteId}`, { method: "DELETE" });
      setDeleteId(null);
      setConfirmDelete(false);
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: "11px",
            letterSpacing: "1.5px",
            textTransform: "uppercase",
            color: "#79746B",
          }}
        >
          {templates.length} plantilla{templates.length !== 1 ? "s" : ""}
        </p>
        <Button onClick={openCreate}>
          <Plus />
          Nueva plantilla
        </Button>
      </div>

      {templates.length === 0 ? (
        <div
          style={{
            ...CARD_STYLE,
            textAlign: "center",
            padding: "60px 24px",
          }}
        >
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>📅</div>
          <p
            style={{
              fontFamily: "'Archivo', sans-serif",
              fontWeight: 900,
              fontSize: "22px",
              color: "#1A1A17",
              marginBottom: "10px",
            }}
          >
            Sin plantillas de horario
          </p>
          <p
            style={{
              fontFamily: "'Hanken Grotesk', system-ui",
              fontSize: "15px",
              color: "#79746B",
              maxWidth: "320px",
              margin: "0 auto 24px",
            }}
          >
            Crea plantillas de horario para asignarlas a tus empleados de
            forma sencilla
          </p>
          <Button onClick={openCreate}>
            <Plus />
            Crear primera plantilla
          </Button>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "14px",
          }}
        >
          {templates.map((t) => {
            const primaryWeek = t.weeks?.[0];
            const totalMinutes =
              primaryWeek?.days
                .filter((d) => d.is_working)
                .reduce((sum, d) => sum + d.total_minutes, 0) ?? 0;

            return (
              <div key={t.id} style={CARD_STYLE}>
                {/* Header */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "14px",
                  }}
                >
                  <div>
                    <p
                      style={{
                        fontFamily: "'Archivo', sans-serif",
                        fontWeight: 900,
                        fontSize: "17px",
                        color: "#1A1A17",
                        marginBottom: "6px",
                      }}
                    >
                      {t.name}
                    </p>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      <Badge variant="outline">
                        {t.week_type === "single"
                          ? "Semana única"
                          : "Semana rotativa"}
                      </Badge>
                      {t.is_default && (
                        <Badge variant="lime">Por defecto</Badge>
                      )}
                      {t.is_active && (
                        <Badge variant="success">Activo</Badge>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "4px" }}>
                    <Button size="icon" variant="ghost">
                      <Pencil />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      style={{ color: "#BD4332" }}
                      onClick={() => {
                        setDeleteId(t.id);
                        setConfirmDelete(true);
                      }}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>

                {/* Week preview */}
                {primaryWeek && <WeekPreview week={primaryWeek} />}

                {/* Actions */}
                {!t.is_default && (
                  <div style={{ marginTop: "14px" }}>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAsDefault(t.id)}
                    >
                      Establecer como defecto
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          style={{ maxWidth: "560px", maxHeight: "85vh", overflowY: "auto" }}
        >
          <DialogHeader>
            <DialogTitle>Nueva plantilla de horario</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label>Nombre de la plantilla *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Jornada completa L-V"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Tipo de semana</Label>
              <Select
                value={weekType}
                onValueChange={(v) =>
                  setWeekType(v as "single" | "rotating")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Semana única</SelectItem>
                  <SelectItem value="rotating">Semana rotativa (A/B)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Toggle
              checked={isDefault}
              onChange={setIsDefault}
              label="Plantilla por defecto"
            />

            {/* Week tabs for rotating */}
            {weekType === "rotating" && (
              <div style={{ display: "flex", gap: "8px", marginBottom: "-4px" }}>
                {(["A", "B"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveWeekTab(tab)}
                    style={{
                      padding: "6px 18px",
                      borderRadius: "8px",
                      border: "2px solid #1A1A17",
                      background:
                        activeWeekTab === tab ? "#1A1A17" : "#FCFAF6",
                      color: activeWeekTab === tab ? "#FCFAF6" : "#1A1A17",
                      fontFamily: "'Archivo', sans-serif",
                      fontWeight: 900,
                      fontSize: "13px",
                      cursor: "pointer",
                    }}
                  >
                    Semana {tab}
                  </button>
                ))}
              </div>
            )}

            {weekType === "single" ? (
              <ScheduleWeekBuilder
                week={weekA}
                label=""
                onChange={setWeekA}
              />
            ) : activeWeekTab === "A" ? (
              <ScheduleWeekBuilder
                week={weekA}
                label="Semana A"
                onChange={setWeekA}
              />
            ) : (
              <ScheduleWeekBuilder
                week={weekB}
                label="Semana B"
                onChange={setWeekB}
              />
            )}

            {error && (
              <p style={{ fontSize: "13px", color: "#BD4332" }}>{error}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={!name.trim() || saving}>
              {saving && <Loader2 className="animate-spin" />}
              Crear plantilla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog
        open={confirmDelete}
        onOpenChange={(v) => {
          if (!v) {
            setConfirmDelete(false);
            setDeleteId(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar plantilla</DialogTitle>
          </DialogHeader>
          <p
            style={{
              fontFamily: "'Hanken Grotesk', system-ui",
              fontSize: "14px",
              color: "#79746B",
            }}
          >
            Esta acción no se puede deshacer. Los empleados asignados a esta
            plantilla perderán su horario de referencia.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setConfirmDelete(false);
                setDeleteId(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={doDelete}
              disabled={deleting}
            >
              {deleting && <Loader2 className="animate-spin" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
