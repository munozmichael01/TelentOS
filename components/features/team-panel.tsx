"use client";

import { useState, useMemo, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RoleBadge } from "@/components/role-badge";
import { HairlineTable, HairlineRow } from "@/components/hairline-table";
import {
  inviteMember,
  changeRole,
  revokeMember,
  unlinkEmployee,
  cancelInvite,
  resendInvite,
} from "@/app/[locale]/(dashboard)/settings/team/actions";

/* ── Types ── */
export type MemberRow = {
  id: string;
  name: string;
  email: string;
  role: "owner" | "hr_admin" | "recruiter" | "manager";
  employeeId: string | null;
  employeeName: string | null;
  employeeTitle: string | null;
  joinedAt: string;
  isYou: boolean;
};

export type PendingRow = {
  id: string;
  email: string;
  role: "hr_admin" | "recruiter" | "manager";
  invitedAt: string;
  inviterName: string | null;
};

export type EmployeeOption = {
  id: string;
  name: string;
  email: string | null;
  roleTitle: string | null;
  managerId: string | null;
};

/* ── Helpers ── */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const ROLE_AVATAR: Record<string, { bg: string; color: string }> = {
  owner:    { bg: "#DCEFE4", color: "#0E5C4A" },
  hr_admin: { bg: "#E6F1EC", color: "#2C7A5E" },
  recruiter:{ bg: "#FAE3DE", color: "#C7402E" },
  manager:  { bg: "#F8E7C4", color: "#946312" },
};

const ROLE_HINTS: Record<string, string> = {
  hr_admin:  "Todo salvo billing",
  recruiter: "Solo selección",
  manager:   "Su equipo",
};

/* ── Icon atoms ── */
const IconPlus = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
  </svg>
);
const IconDots = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="5" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="12" cy="19" r="1.6" />
  </svg>
);
const IconMail = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
    <path d="M4 7l8 6 8-6" stroke="currentColor" strokeWidth="2" />
  </svg>
);
const IconWarn = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
    <path d="M12 9v4M12 17h.01M10.3 3.9L2 18a2 2 0 001.7 3h16.6a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0Z" stroke="#946312" strokeWidth="2" strokeLinejoin="round" />
  </svg>
);
const IconError = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
    <circle cx="12" cy="12" r="9" stroke="#BD4332" strokeWidth="2" />
    <path d="M12 8v4M12 16h.01" stroke="#BD4332" strokeWidth="2" strokeLinecap="round" />
  </svg>
);
const IconX = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M18 6L6 18M6 6l12 12" stroke="#BD4332" strokeWidth="2.4" strokeLinecap="round" />
  </svg>
);

/* ── Props ── */
interface TeamPanelProps {
  members: MemberRow[];
  pending: PendingRow[];
  allEmployees: EmployeeOption[];
  memberEmpIds: string[];
  currentUserId: string;
}

/* ══════════ TEAM PANEL ══════════ */
export function TeamPanel({ members, pending, allEmployees, memberEmpIds: memberEmpIdsArr }: TeamPanelProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  /* kebab open state */
  const [openKebab, setOpenKebab] = useState<string | null>(null);

  /* modal state machine */
  const [modal, setModal] = useState<"none" | "invite" | "role" | "revoke">("none");
  const [targetId, setTargetId] = useState<string | null>(null);

  /* invite modal state */
  const [inviteText, setInviteText]     = useState("");
  const [pickedEmpId, setPickedEmpId]   = useState<string | null>(null);
  const [inviteRole, setInviteRole]     = useState<"hr_admin" | "recruiter" | "manager">("hr_admin");
  const [inviteErr, setInviteErr]       = useState<string | null>(null);
  const [invitePending, setInvitePending] = useState(false);

  /* change-role modal state */
  const [changeRoleVal, setChangeRoleVal] = useState<"hr_admin" | "recruiter" | "manager">("hr_admin");
  const [rolePending, setRolePending]     = useState(false);

  /* revoke state */
  const [revokePending, setRevokePending] = useState(false);

  /* success toast */
  const [toast, setToast] = useState<string | null>(null);

  const memberEmpIds = useMemo(() => new Set(memberEmpIdsArr), [memberEmpIdsArr]);
  const target = members.find((m) => m.id === targetId);

  /* close kebab on outside click */
  useEffect(() => {
    if (!openKebab) return;
    function close() { setOpenKebab(null); }
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [openKebab]);

  /* auto-clear toast */
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  /* ── Modal helpers ── */
  function closeModal() { setModal("none"); setTargetId(null); setInviteErr(null); }

  function openInvite() {
    setModal("invite");
    setInviteText(""); setPickedEmpId(null); setInviteRole("hr_admin"); setInviteErr(null);
    setOpenKebab(null);
  }

  function openRoleModal(memberId: string) {
    const m = members.find((x) => x.id === memberId);
    const initialRole = (m?.role === "owner" ? "hr_admin" : m?.role) as "hr_admin" | "recruiter" | "manager";
    setTargetId(memberId);
    setChangeRoleVal(initialRole ?? "hr_admin");
    setModal("role");
    setOpenKebab(null);
  }

  function openRevokeModal(memberId: string) {
    setTargetId(memberId);
    setModal("revoke");
    setOpenKebab(null);
  }

  /* ── Invite computed state (mirrors DC inviteVals()) ── */
  const inv = useMemo(() => {
    const text = inviteText.trim();
    const low  = text.toLowerCase();
    const looksEmail = low.includes("@");
    const validEmail = looksEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(low);

    const picked     = pickedEmpId ? allEmployees.find((e) => e.id === pickedEmpId) : null;
    const emailMatch = looksEmail  ? allEmployees.find((e) => e.email?.toLowerCase() === low) : null;
    const linkedRaw  = picked || emailMatch || null;
    const linkedIsMember = linkedRaw ? memberEmpIds.has(linkedRaw.id) : false;
    const linkedEmp  = linkedRaw ? { ...linkedRaw, isMember: linkedIsMember } : null;

    const nameResults = (!linkedEmp && !looksEmail && low.length > 0)
      ? allEmployees.filter((e) => e.name.toLowerCase().includes(low)).slice(0, 5)
          .map((e) => ({ ...e, isMember: memberEmpIds.has(e.id) }))
      : [];

    const isExternal = !linkedEmp && validEmail;
    const destEmail  = linkedEmp ? linkedEmp.email : (validEmail ? text : null);

    const reports      = linkedEmp ? allEmployees.filter((e) => e.managerId === linkedEmp.id) : [];
    const isManagerRole = inviteRole === "manager";
    const managerOk    = !isManagerRole || (!!linkedEmp && reports.length > 0);
    const canSend      = !!destEmail && managerOk && !linkedIsMember;

    return {
      linkedEmp, linkedIsMember, isExternal, destEmail,
      nameResults, showResults: nameResults.length > 0,
      reports, isManagerRole,
      showNeedLink:     isManagerRole && !linkedEmp,
      showTeamPreview:  isManagerRole && !!linkedEmp && reports.length > 0,
      showNoTeamWarn:   isManagerRole && !!linkedEmp && reports.length === 0,
      canSend,
      invalidEmail: looksEmail && !validEmail,
    };
  }, [inviteText, pickedEmpId, inviteRole, allEmployees, memberEmpIds]);

  /* ── Action handlers ── */
  async function handleInvite() {
    if (!inv.canSend || !inv.destEmail) return;
    setInvitePending(true);
    setInviteErr(null);
    const fd = new FormData();
    fd.set("email",  inv.destEmail);
    fd.set("role",   inviteRole);
    if (inv.linkedEmp?.id) fd.set("employeeId", inv.linkedEmp.id);
    const res = await inviteMember(fd);
    setInvitePending(false);
    if (res.success) {
      closeModal();
      setToast(res.message ?? "Invitación enviada");
      startTransition(() => router.refresh());
    } else {
      setInviteErr(res.error ?? "Error al enviar invitación");
    }
  }

  async function handleChangeRole() {
    if (!targetId) return;
    setRolePending(true);
    const fd = new FormData();
    fd.set("memberId", targetId);
    fd.set("role",     changeRoleVal);
    const res = await changeRole(fd);
    setRolePending(false);
    if (res.success) { closeModal(); startTransition(() => router.refresh()); }
  }

  async function handleRevoke() {
    if (!targetId) return;
    setRevokePending(true);
    const fd = new FormData();
    fd.set("memberId", targetId);
    const res = await revokeMember(fd);
    setRevokePending(false);
    if (res.success) { closeModal(); startTransition(() => router.refresh()); }
  }

  async function handleUnlink(memberId: string) {
    setOpenKebab(null);
    const fd = new FormData();
    fd.set("memberId", memberId);
    const res = await unlinkEmployee(fd);
    if (res.success) startTransition(() => router.refresh());
  }

  async function handleResend(email: string) {
    const fd = new FormData();
    fd.set("email", email);
    const res = await resendInvite(fd);
    if (res.success) setToast(res.message ?? "Invitación reenviada");
  }

  async function handleCancelInvite(memberId: string) {
    const fd = new FormData();
    fd.set("memberId", memberId);
    const res = await cancelInvite(fd);
    if (res.success) startTransition(() => router.refresh());
  }

  /* ── Shared styles ── */
  const S = {
    surface:   "#FCFAF6",
    bg:        "#F4F0E8",
    line:      "#E7E1D4",
    ink:       "#1A1A17",
    soft:      "#79746B",
    brand:     "#0E5C4A",
    brandSoft: "#DCEFE4",
    accent:    "#F1543F",
  };

  const monoSm = { fontFamily: "'Space Mono', monospace" as const };

  /* ══════════ RENDER ══════════ */
  return (
    <>
      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: "28px", left: "50%", transform: "translateX(-50%)", zIndex: 60, background: S.ink, color: "#F4F0E8", borderRadius: "12px", padding: "10px 20px", fontSize: "13px", fontWeight: 600, boxShadow: "0 6px 20px rgba(0,0,0,.25)", whiteSpace: "nowrap" }}>
          {toast}
        </div>
      )}

      {/* ── Section A: Miembros activos ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
        <div>
          <h2 style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: "17px", margin: 0 }}>Miembros activos</h2>
          <div style={{ ...monoSm, fontSize: "10.5px", color: S.soft, marginTop: "3px" }}>{members.length} personas con acceso</div>
        </div>
        <button
          onClick={openInvite}
          className="di-hard"
          style={{ display: "flex", alignItems: "center", gap: "7px", fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: "13px", color: "#fff", background: S.brand, border: "2px solid " + S.ink, borderRadius: "11px", padding: "10px 15px", boxShadow: "2px 2px 0 " + S.ink, cursor: "pointer" }}
        >
          <IconPlus /> Invitar persona
        </button>
      </div>

      {/* Members table */}
      <HairlineTable cols="2.3fr 1fr 1.4fr 1fr 40px" headers={["Miembro", "Rol", "Empleado vinculado", "Incorporación", ""]}>
        {members.map((m) => {
          const av = ROLE_AVATAR[m.role] ?? ROLE_AVATAR.hr_admin;
          return (
            <HairlineRow key={m.id} style={{ padding: "13px 18px" }}>

              {/* Miembro */}
              <div style={{ display: "flex", alignItems: "center", gap: "11px", minWidth: 0 }}>
                <span style={{ width: "34px", height: "34px", flexShrink: 0, borderRadius: "50%", background: av.bg, color: av.color, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: "12px" }}>
                  {getInitials(m.name)}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: "14px", display: "flex", alignItems: "center", gap: "7px", flexWrap: "wrap" }}>
                    {m.name}
                    {m.isYou && (
                      <span style={{ ...monoSm, fontSize: "9px", color: S.soft, background: S.bg, border: "1px solid " + S.line, borderRadius: "999px", padding: "1px 7px" }}>tú</span>
                    )}
                  </div>
                  <div style={{ fontSize: "12px", color: S.soft, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.email}</div>
                </div>
              </div>

              {/* Rol */}
              <div><RoleBadge role={m.role} /></div>

              {/* Empleado vinculado */}
              <div style={{ fontSize: "12.5px", color: m.employeeName ? S.ink : S.soft }}>
                {m.employeeName
                  ? m.employeeTitle ? `${m.employeeName} · ${m.employeeTitle}` : m.employeeName
                  : "Sin vincular"}
              </div>

              {/* Incorporación */}
              <div style={{ ...monoSm, fontSize: "11px", color: S.soft }}>{m.joinedAt}</div>

              {/* Kebab */}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                {!m.isYou && (
                  <div style={{ position: "relative" }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setOpenKebab((prev) => prev === m.id ? null : m.id); }}
                      style={{ width: "30px", height: "30px", borderRadius: "8px", border: "1px solid transparent", background: "none", color: S.soft, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                      <IconDots />
                    </button>
                    {openKebab === m.id && (
                      <div style={{ position: "absolute", top: "34px", right: 0, zIndex: 20, width: "186px", background: S.surface, border: "1.5px solid " + S.ink, borderRadius: "11px", boxShadow: "4px 4px 0 " + S.ink, padding: "5px", textAlign: "left" }}>
                        <button onClick={() => openRoleModal(m.id)}  style={menuItemStyle}>Cambiar rol</button>
                        <button onClick={() => handleUnlink(m.id)}    style={menuItemStyle}>Desvincular empleado</button>
                        <div style={{ height: "1px", background: S.line, margin: "4px 6px" }} />
                        <button onClick={() => openRevokeModal(m.id)} style={{ ...menuItemStyle, fontWeight: 700, color: "#BD4332" }}>Revocar acceso</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </HairlineRow>
          );
        })}
      </HairlineTable>

      {/* ── Section B: Invitaciones pendientes ── */}
      {pending.length > 0 && (
        <div style={{ marginTop: "30px" }}>
          <h2 style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: "17px", margin: "0 0 4px" }}>Invitaciones pendientes</h2>
          <div style={{ ...monoSm, fontSize: "10.5px", color: S.soft, marginBottom: "14px" }}>{pending.length} sin aceptar</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
            {pending.map((p) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: "14px", background: S.surface, border: "1px dashed " + S.line, borderRadius: "13px", padding: "13px 16px" }}>
                <span style={{ width: "34px", height: "34px", flexShrink: 0, borderRadius: "50%", background: S.bg, border: "1px solid " + S.line, color: S.soft, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <IconMail />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: "13.5px" }}>{p.email}</div>
                  <div style={{ ...monoSm, fontSize: "10.5px", color: S.soft, marginTop: "2px" }}>
                    Invitado por {p.inviterName ?? "Sistema"} · {p.invitedAt}
                  </div>
                </div>
                <RoleBadge role={p.role} />
                <div style={{ display: "flex", gap: "7px" }}>
                  <button
                    className="di-hard"
                    onClick={() => handleResend(p.email)}
                    style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: "12px", color: S.ink, background: S.surface, border: "1.5px solid " + S.ink, borderRadius: "9px", padding: "7px 12px", boxShadow: "2px 2px 0 " + S.ink, cursor: "pointer" }}
                  >
                    Reenviar
                  </button>
                  <button
                    onClick={() => handleCancelInvite(p.id)}
                    style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 600, fontSize: "12px", color: S.soft, background: "none", border: "none", cursor: "pointer", padding: "7px 6px" }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════ MODALS ══════════ */}
      {modal !== "none" && (
        <div
          onClick={closeModal}
          style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(26,26,23,.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}
        >

          {/* ── INVITE ── */}
          {modal === "invite" && (
            <div onClick={(e) => e.stopPropagation()} style={{ width: "440px", maxWidth: "100%", background: S.surface, border: "1.5px solid " + S.ink, borderRadius: "18px", boxShadow: "6px 6px 0 " + S.ink, padding: "24px 26px" }}>
              <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 900, fontSize: "19px", marginBottom: "4px" }}>Invitar persona</div>
              <p style={{ fontSize: "12.5px", color: S.soft, margin: "0 0 18px" }}>Se enviará un enlace de acceso por email.</p>

              <label style={{ ...monoSm, fontSize: "10px", textTransform: "uppercase", letterSpacing: ".5px", color: S.soft, display: "block", marginBottom: "6px" }}>Persona</label>

              {/* Linked employee chip */}
              {inv.linkedEmp && (
                <div style={{ display: "flex", alignItems: "center", gap: "10px", background: S.bg, border: "1.5px solid " + S.brand, borderRadius: "10px", padding: "9px 12px", marginBottom: "8px" }}>
                  <span style={{ width: "30px", height: "30px", borderRadius: "50%", background: S.brandSoft, color: S.brand, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: "11px", flexShrink: 0 }}>
                    {getInitials(inv.linkedEmp.name)}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: "13.5px" }}>{inv.linkedEmp.name}</div>
                    <div style={{ ...monoSm, fontSize: "10px", color: S.soft }}>{inv.linkedEmp.email}</div>
                  </div>
                  <button onClick={() => { setPickedEmpId(null); setInviteText(""); }} style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "11px", fontWeight: 600, color: S.soft, background: "none", border: "none", cursor: "pointer" }}>Quitar</button>
                </div>
              )}

              {/* Already member error */}
              {inv.linkedIsMember && (
                <div style={{ display: "flex", gap: "9px", background: "#F6D9D2", border: "1px solid #E3A99C", borderRadius: "10px", padding: "10px 13px", marginBottom: "8px" }}>
                  <IconError />
                  <span style={{ fontSize: "12px", color: "#8A2D20", lineHeight: 1.5 }}><b>{inv.linkedEmp?.name}</b> ya es miembro activo del equipo — no se puede volver a invitar.</span>
                </div>
              )}

              {/* Input field (visible when no linked employee) */}
              {!inv.linkedEmp && (
                <div style={{ position: "relative", marginBottom: "8px" }}>
                  <input
                    value={inviteText}
                    onChange={(e) => setInviteText(e.target.value)}
                    placeholder="Nombre o email…"
                    autoFocus
                    style={{ width: "100%", fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "13.5px", background: S.bg, border: `1.5px solid ${inv.invalidEmail ? "#D99" : S.line}`, borderRadius: "10px", padding: "11px 12px", outline: "none", boxSizing: "border-box" }}
                  />
                  {/* Autocomplete dropdown */}
                  {inv.showResults && (
                    <div style={{ position: "absolute", top: "48px", left: 0, right: 0, zIndex: 5, background: S.surface, border: "1.5px solid " + S.ink, borderRadius: "11px", boxShadow: "4px 4px 0 " + S.ink, padding: "5px", maxHeight: "186px", overflowY: "auto" }}>
                      {inv.nameResults.map((e) => (
                        <button
                          key={e.id}
                          onClick={() => { if (e.isMember) return; setPickedEmpId(e.id); setInviteText(""); }}
                          style={{ display: "flex", alignItems: "center", gap: "9px", width: "100%", textAlign: "left", background: "none", border: "none", borderRadius: "8px", padding: "7px 9px", cursor: e.isMember ? "not-allowed" : "pointer", opacity: e.isMember ? .5 : 1 }}
                        >
                          <span style={{ width: "26px", height: "26px", borderRadius: "50%", background: S.brandSoft, color: S.brand, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: "10px", flexShrink: 0 }}>
                            {getInitials(e.name)}
                          </span>
                          <span style={{ minWidth: 0, flex: 1 }}>
                            <span style={{ display: "block", fontWeight: 600, fontSize: "12.5px" }}>{e.name}</span>
                            <span style={{ display: "block", ...monoSm, fontSize: "9.5px", color: S.soft }}>{e.email}</span>
                          </span>
                          {e.isMember && (
                            <span style={{ ...monoSm, fontSize: "8.5px", textTransform: "uppercase", letterSpacing: ".5px", color: S.soft, background: S.bg, border: "1px solid " + S.line, borderRadius: "999px", padding: "2px 7px", flexShrink: 0 }}>Ya es miembro</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* External email note */}
              {inv.isExternal && (
                <div style={{ display: "flex", alignItems: "center", gap: "9px", background: S.bg, border: "1px solid " + S.line, borderRadius: "9px", padding: "8px 11px", marginBottom: "8px" }}>
                  <IconMail />
                  <span style={{ fontSize: "11.5px", color: S.soft, lineHeight: 1.4 }}>Invitación externa · sin ficha de empleado. Se enviará a <b style={{ color: S.ink }}>{inviteText}</b>.</span>
                </div>
              )}

              {/* Rol segmented control */}
              <label style={{ ...monoSm, fontSize: "10px", textTransform: "uppercase", letterSpacing: ".5px", color: S.soft, display: "block", margin: "16px 0 8px" }}>Rol</label>
              <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                {(["hr_admin", "recruiter", "manager"] as const).map((k) => {
                  const on = inviteRole === k;
                  return (
                    <button
                      key={k}
                      onClick={() => setInviteRole(k)}
                      style={{ fontFamily: "'Archivo', sans-serif", fontWeight: on ? 800 : 700, fontSize: "13px", cursor: "pointer", borderRadius: "9px", padding: "9px 14px", border: `1.5px solid ${on ? S.ink : S.line}`, background: on ? S.brandSoft : S.surface, color: on ? S.brand : S.soft }}
                    >
                      {{ hr_admin: "HR Admin", recruiter: "Recruiter", manager: "Manager" }[k]}
                    </button>
                  );
                })}
              </div>

              {/* Manager warnings */}
              {inv.showNeedLink && (
                <div style={{ display: "flex", gap: "9px", background: "#FBE9D9", border: "1px solid #EBC79A", borderRadius: "10px", padding: "11px 13px", marginBottom: "8px" }}>
                  <IconWarn />
                  <span style={{ fontSize: "12px", color: "#7A5410", lineHeight: 1.5 }}>El rol <b>Manager</b> necesita una ficha de empleado para calcular su equipo. Elige a una persona de la plantilla.</span>
                </div>
              )}

              {inv.showTeamPreview && (
                <div style={{ background: "#F8E7C4", border: "1px solid #EBC79A", borderRadius: "10px", padding: "10px 13px", marginBottom: "8px" }}>
                  <div style={{ ...monoSm, fontSize: "9px", textTransform: "uppercase", letterSpacing: ".5px", color: "#946312", marginBottom: "5px" }}>Verá a su equipo · {inv.reports.length} personas</div>
                  <div style={{ fontSize: "12px", color: "#7A5410", lineHeight: 1.5 }}>{inv.reports.map((r) => r.name).join(", ")}</div>
                </div>
              )}

              {inv.showNoTeamWarn && (
                <div style={{ display: "flex", gap: "9px", background: "#FBE9D9", border: "1px solid #EBC79A", borderRadius: "10px", padding: "11px 13px", marginBottom: "8px" }}>
                  <IconWarn />
                  <span style={{ fontSize: "12px", color: "#7A5410", lineHeight: 1.5 }}><b>{inv.linkedEmp?.name}</b> no tiene a nadie a cargo en el organigrama — como Manager no vería ningún equipo. Asígnale reportes o elige otro rol.</span>
                </div>
              )}

              <p style={{ fontSize: "11px", color: S.soft, margin: "2px 0 20px", lineHeight: 1.5 }}>
                {inv.isManagerRole
                  ? "Un manager solo ve a las personas que le reportan en el organigrama. Vincúlalo a su ficha para calcular su equipo."
                  : "Escribe un nombre para elegir a un empleado, o un email para invitar a alguien externo."}
              </p>

              {/* Invite action error */}
              {inviteErr && (
                <div style={{ display: "flex", gap: "9px", background: "#F6D9D2", border: "1px solid #E3A99C", borderRadius: "10px", padding: "10px 13px", marginBottom: "12px" }}>
                  <IconError />
                  <span style={{ fontSize: "12px", color: "#8A2D20" }}>{inviteErr}</span>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "9px" }}>
                <button onClick={closeModal} style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: "13px", color: S.soft, background: "none", border: "none", cursor: "pointer", padding: "10px 12px" }}>Cancelar</button>
                <button
                  onClick={handleInvite}
                  disabled={!inv.canSend || invitePending}
                  className={inv.canSend && !invitePending ? "di-hard" : ""}
                  style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: "13px", color: "#fff", background: inv.canSend ? S.brand : "#9DB5AC", border: "1.5px solid " + S.ink, borderRadius: "10px", padding: "10px 16px", boxShadow: inv.canSend ? "2px 2px 0 " + S.ink : "none", cursor: inv.canSend && !invitePending ? "pointer" : "not-allowed" }}
                >
                  {invitePending ? "Enviando…" : "Enviar invitación"}
                </button>
              </div>
            </div>
          )}

          {/* ── CHANGE ROLE ── */}
          {modal === "role" && target && (
            <div onClick={(e) => e.stopPropagation()} style={{ width: "420px", maxWidth: "100%", background: S.surface, border: "1.5px solid " + S.ink, borderRadius: "18px", boxShadow: "6px 6px 0 " + S.ink, padding: "24px 26px" }}>
              <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 900, fontSize: "19px", marginBottom: "4px" }}>Cambiar rol</div>
              <p style={{ fontSize: "12.5px", color: S.soft, margin: "0 0 18px" }}>{target.name} · {target.email}</p>

              <div style={{ display: "flex", flexDirection: "column", gap: "9px", marginBottom: "16px" }}>
                {(["hr_admin", "recruiter", "manager"] as const).map((k) => {
                  const on = changeRoleVal === k;
                  return (
                    <button
                      key={k}
                      onClick={() => setChangeRoleVal(k)}
                      style={{ display: "flex", alignItems: "center", gap: "11px", width: "100%", textAlign: "left", cursor: "pointer", borderRadius: "11px", padding: "12px 14px", border: `1.5px solid ${on ? S.brand : S.line}`, background: on ? "#EAF4EF" : S.surface }}
                    >
                      <span style={{ width: "16px", height: "16px", borderRadius: "50%", border: `2px solid ${on ? S.brand : "#C8C2B8"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {on && <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: S.brand }} />}
                      </span>
                      <span style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: "14px" }}>{{ hr_admin: "HR Admin", recruiter: "Recruiter", manager: "Manager" }[k]}</span>
                      <span style={{ fontSize: "11.5px", color: S.soft, marginLeft: "auto" }}>{ROLE_HINTS[k]}</span>
                    </button>
                  );
                })}
              </div>

              {changeRoleVal === "recruiter" && (
                <div style={{ display: "flex", gap: "9px", background: "#FBE9D9", border: "1px solid #EBC79A", borderRadius: "10px", padding: "11px 13px", marginBottom: "18px" }}>
                  <IconWarn />
                  <span style={{ fontSize: "12px", color: "#7A5410", lineHeight: 1.5 }}>Perderá acceso a Ausencias, Horas y módulos sensibles.</span>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "9px" }}>
                <button onClick={closeModal} style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: "13px", color: S.soft, background: "none", border: "none", cursor: "pointer", padding: "10px 12px" }}>Cancelar</button>
                <button
                  onClick={handleChangeRole}
                  disabled={rolePending}
                  className="di-hard"
                  style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: "13px", color: "#fff", background: S.brand, border: "1.5px solid " + S.ink, borderRadius: "10px", padding: "10px 16px", boxShadow: "2px 2px 0 " + S.ink, cursor: "pointer" }}
                >
                  {rolePending ? "Guardando…" : "Guardar cambio"}
                </button>
              </div>
            </div>
          )}

          {/* ── REVOKE ── */}
          {modal === "revoke" && target && (
            <div onClick={(e) => e.stopPropagation()} style={{ width: "400px", maxWidth: "100%", background: S.surface, border: "1.5px solid " + S.ink, borderRadius: "18px", boxShadow: "6px 6px 0 " + S.ink, padding: "24px 26px" }}>
              <div style={{ width: "42px", height: "42px", borderRadius: "11px", background: "#F6D9D2", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "14px" }}>
                <IconX />
              </div>
              <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 900, fontSize: "19px", marginBottom: "6px" }}>¿Revocar acceso a {target.name}?</div>
              <p style={{ fontSize: "13px", color: S.soft, lineHeight: 1.55, margin: "0 0 22px" }}>Esta persona perderá el acceso inmediatamente. Puedes volver a invitarla cuando quieras.</p>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "9px" }}>
                <button onClick={closeModal} style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: "13px", color: S.soft, background: "none", border: "none", cursor: "pointer", padding: "10px 12px" }}>Cancelar</button>
                <button
                  onClick={handleRevoke}
                  disabled={revokePending}
                  className="di-hard"
                  style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: "13px", color: "#fff", background: S.accent, border: "1.5px solid " + S.ink, borderRadius: "10px", padding: "10px 16px", boxShadow: "2px 2px 0 " + S.ink, cursor: "pointer" }}
                >
                  {revokePending ? "Revocando…" : "Revocar acceso"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

/* ── Shared kebab menu item style ── */
const menuItemStyle: React.CSSProperties = {
  width: "100%",
  textAlign: "left",
  fontFamily: "'Hanken Grotesk', sans-serif",
  fontSize: "12.5px",
  fontWeight: 600,
  color: "#1A1A17",
  background: "none",
  border: "none",
  borderRadius: "7px",
  padding: "8px 10px",
  cursor: "pointer",
};
