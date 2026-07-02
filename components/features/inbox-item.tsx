"use client";

import Link from "next/link";
import type { InboxItem as InboxItemData, InboxAction, InboxType } from "@/lib/dashboard";

// ─── Type tokens ──────────────────────────────────────────────────────────────

const TYPE_ACCENT: Record<InboxType, string> = {
  compliance:  "#BD4332",
  ausencia:    "#0E5C4A",
  candidato:   "#F1543F",
  onboarding:  "#946312",
  ausente:     "#2B5E8A",
};

const TYPE_CHIP_BG: Record<InboxType, string> = {
  compliance:  "#F6D9D2",
  ausencia:    "#DCEFE4",
  candidato:   "#FAE3DE",
  onboarding:  "#F8E7C4",
  ausente:     "#D6E4F2",
};

const TYPE_LABEL: Record<InboxType, string> = {
  compliance:  "Compliance",
  ausencia:    "Ausencia",
  candidato:   "Candidato",
  onboarding:  "Onboarding",
  ausente:     "Ausente hoy",
};

// ─── Action button ────────────────────────────────────────────────────────────

function ActionBtn({
  action,
  accent,
  onAction,
  loading,
}: {
  action: InboxAction;
  accent: string;
  onAction: (action: InboxAction) => void;
  loading: boolean;
}) {
  const isPrimary = action.kind === "primary";

  const baseStyle: React.CSSProperties = {
    fontFamily: "'Archivo', sans-serif",
    fontWeight: 700,
    fontSize: "12px",
    borderRadius: "8px",
    padding: "5px 11px",
    cursor: loading ? "not-allowed" : "pointer",
    border: "1.5px solid",
    display: "inline-flex",
    alignItems: "center",
    whiteSpace: "nowrap",
    opacity: loading ? 0.6 : 1,
    transition: "opacity .12s",
  };

  const primaryStyle: React.CSSProperties = {
    ...baseStyle,
    background: accent,
    color: "#fff",
    borderColor: accent,
  };

  const secondaryStyle: React.CSSProperties = {
    ...baseStyle,
    background: "transparent",
    color: "#79746B",
    borderColor: "#E7E1D4",
  };

  if (action.href && !action.apiPath) {
    return (
      <Link
        href={action.href}
        style={isPrimary ? primaryStyle : secondaryStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {action.label}
      </Link>
    );
  }

  return (
    <button
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
  const accent = TYPE_ACCENT[item.type];
  const chipBg = TYPE_CHIP_BG[item.type];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "13px",
        background: "#FCFAF6",
        border: "1px solid #E7E1D4",
        borderLeft: `4px solid ${accent}`,
        borderRadius: "14px",
        padding: "13px 15px",
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: "36px",
          height: "36px",
          borderRadius: "50%",
          background: item.avatar.bg,
          color: item.avatar.color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Archivo', sans-serif",
          fontWeight: 800,
          fontSize: "11px",
          flexShrink: 0,
        }}
      >
        {item.avatar.initials}
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "7px", flexWrap: "wrap" }}>
          <span style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: "13.5px", color: "#1A1A17" }}>
            {item.title}
          </span>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", background: chipBg, color: accent, borderRadius: "999px", padding: "2px 7px", fontWeight: 700, flexShrink: 0 }}>
            {TYPE_LABEL[item.type]}
          </span>
        </div>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "11px", color: "#79746B", marginTop: "3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
              accent={accent}
              onAction={(a) => onAction(item, a)}
              loading={loadingActionId === `${item.id}-${action.label}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
