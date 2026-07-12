"use client";

import { useEffect, useState } from "react";
import { subscribeToasts, type Toast } from "@/lib/toast-bus";

// Iconos de línea del DS (sin emojis — ver CLAUDE.md § Iconografía).
function IconError() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M12 7.5v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="16.2" r="1.1" fill="currentColor" />
    </svg>
  );
}
function IconSuccess() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M8 12.2l2.6 2.6L16 9.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconInfo() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M12 11v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="7.8" r="1.1" fill="currentColor" />
    </svg>
  );
}

const VARIANT: Record<Toast["variant"], { accent: string; Icon: () => JSX.Element }> = {
  error: { accent: "#F0857D", Icon: IconError },
  success: { accent: "#7FD1A8", Icon: IconSuccess },
  info: { accent: "#CFC7B5", Icon: IconInfo },
};

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    return subscribeToasts((t) => {
      setToasts((cur) => [...cur, t]);
      window.setTimeout(() => {
        setToasts((cur) => cur.filter((x) => x.id !== t.id));
      }, t.duration);
    });
  }, []);

  function dismiss(id: number) {
    setToasts((cur) => cur.filter((x) => x.id !== id));
  }

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      style={{
        position: "fixed",
        bottom: "28px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 80,
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        alignItems: "center",
        pointerEvents: "none",
        width: "min(440px, calc(100vw - 32px))",
      }}
    >
      {toasts.map((t) => {
        const v = VARIANT[t.variant];
        return (
          <div
            key={t.id}
            role={t.variant === "error" ? "alert" : "status"}
            onClick={() => dismiss(t.id)}
            style={{
              pointerEvents: "auto",
              cursor: "pointer",
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              width: "100%",
              background: "#1A1A17",
              color: "#F4F0E8",
              borderRadius: "12px",
              borderLeft: `3px solid ${v.accent}`,
              padding: "12px 15px",
              boxShadow: "0 6px 22px rgba(0,0,0,.28)",
            }}
          >
            <span style={{ color: v.accent, marginTop: "1px" }}>
              <v.Icon />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              {t.title && (
                <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "13px", marginBottom: "2px" }}>
                  {t.title}
                </div>
              )}
              <div style={{ fontSize: "12.5px", lineHeight: 1.45, color: t.title ? "#D8D3C8" : "#F4F0E8" }}>
                {t.message}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
