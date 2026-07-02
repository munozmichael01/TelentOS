"use client";

import Link from "next/link";
import type { InboxItem as InboxItemData, InboxAction, InboxType } from "@/lib/dashboard";

// ─── Type tokens (extraídos del pixel-target TalentOS Dashboard.dc.html) ──────

type TypeMeta = {
  label: string;
  accent: string;
  chipBg: string;
  chipColor: string;
  actionBg: string;
  actionColor: string;
};

const TYPE_META: Record<InboxType, TypeMeta> = {
  compliance:  { label: "Compliance",  accent: "#BD4332", chipBg: "#F6D9D2", chipColor: "#BD4332", actionBg: "#F1543F", actionColor: "#fff" },
  ausencia:    { label: "Ausencia",    accent: "#0E5C4A", chipBg: "#DCEFE4", chipColor: "#0E5C4A", actionBg: "#0E5C4A", actionColor: "#fff" },
  candidato:   { label: "Candidato",   accent: "#F1543F", chipBg: "#FAE3DE", chipColor: "#C7402E", actionBg: "#FCFAF6", actionColor: "#1A1A17" },
  onboarding:  { label: "Onboarding",  accent: "#946312", chipBg: "#F8E7C4", chipColor: "#946312", actionBg: "#FCFAF6", actionColor: "#1A1A17" },
  ausente:     { label: "Ausente hoy", accent: "#2B5E8A", chipBg: "#D6E4F2", chipColor: "#2B5E8A", actionBg: "#FCFAF6", actionColor: "#1A1A17" },
};

// ─── Action button ────────────────────────────────────────────────────────────

function ActionBtn({
  action,
  meta,
  onAction,
  loading,
}: {
  action: InboxAction;
  meta: TypeMeta;
  onAction: (action: InboxAction) => void;
  loading: boolean;
}) {
  const isPrimary = action.kind === "primary";

  const primaryStyle: React.CSSProperties = {
    fontFamily: "'Archivo', sans-serif",
    fontWeight: 800,
    fontSize: "12px",
    color: meta.actionColor,
    background: meta.actionBg,
    border: "1.5px solid #1A1A17",
    borderRadius: "9px",
    padding: "7px 13px",
    boxShadow: "2px 2px 0 #1A1A17",
    cursor: loading ? "not-allowed" : "pointer",
    whiteSpace: "nowrap",
    opacity: loading ? 0.6 : 1,
    display: "inline-flex",
    alignItems: "center",
  };

  const secondaryStyle: React.CSSProperties = {
    fontFamily: "'Archivo', sans-serif",
    fontWeight: 700,
    fontSize: "12px",
    color: "#79746B",
    background: "#FCFAF6",
    border: "1.5px solid #E7E1D4",
    borderRadius: "9px",
    padding: "7px 12px",
    cursor: loading ? "not-allowed" : "pointer",
    whiteSpace: "nowrap",
    opacity: loading ? 0.6 : 1,
    display: "inline-flex",
    alignItems: "center",
  };

  if (action.href && !action.apiPath) {
    return (
      <Link
        href={action.href}
        className="di-hard"
        style={isPrimary ? primaryStyle : secondaryStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {action.label}
      </Link>
    );
  }

  return (
    <button
      className="di-hard"
      disabled={loading}
      onClick={(e) => { e.stopPropagation(); onAction(action); }}
      style={isPrimary ? primaryStyle : secondaryStyle}
    >
      {action.label}
    </button>
  );
}

// ─── InboxItem row ────────────────────────────────────────────────────────────

export function InboxItem({
  item,
  onAction,
  loadingActionId,
}: {
  item: InboxItemData;
  onAction: (item: InboxItemData, action: InboxAction) => void;
  loadingActionId: string | null;
}) {
  const meta = TYPE_META[item.type];

  return (
    <div
      className="di-row"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "13px",
        background: "#FCFAF6",
        border: "1px solid #E7E1D4",
        borderLeft: `4px solid ${meta.accent}`,
        borderRadius: "14px",
        padding: "13px 15px",
        cursor: "pointer",
      }}
    >
      {/* Avatar */}
      <span
        style={{
          width: "38px",
          height: "38px",
          flexShrink: 0,
          borderRadius: "50%",
          background: item.avatar.bg,
          color: item.avatar.color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Archivo', sans-serif",
          fontWeight: 800,
          fontSize: "12.5px",
        }}
      >
        {item.avatar.initials}
      </span>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <span style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: "14.5px", letterSpacing: "-.2px", color: "#1A1A17" }}>
            {item.title}
          </span>
          <span style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: "9px",
            textTransform: "uppercase",
            letterSpacing: ".5px",
            color: meta.chipColor,
            background: meta.chipBg,
            borderRadius: "999px",
            padding: "2px 8px",
            flexShrink: 0,
          }}>
            {meta.label}
          </span>
        </div>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "11px", color: "#79746B", marginTop: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {item.subtitle}
        </div>
      </div>

      {/* Actions */}
      {item.actions.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: "7px", flexShrink: 0 }}>
          {item.actions.map((action) => (
            <ActionBtn
              key={action.label}
              action={action}
              meta={meta}
              onAction={(a) => onAction(item, a)}
              loading={loadingActionId === `${item.id}-${action.label}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
