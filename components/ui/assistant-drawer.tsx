"use client";

/**
 * AssistantDrawer — superficie S4 · Asistente (design-system.md Anexo B-4).
 * Panel lateral derecho (~400px) — no burbuja, no página: convive con la
 * pantalla para preguntar sobre lo que estás mirando. Chip de contexto
 * descartable. Este componente es la PIEL; el hilo/motor lo pone el host.
 */

import { IconSparkle, IconClose } from "@/components/ui/icons";

export function AssistantDrawer({
  open,
  context,
  onClose,
  onDismissContext,
  children,
  footer,
}: {
  open: boolean;
  context?: string | null;
  onClose: () => void;
  onDismissContext?: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <>
      {open && (
        <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(26,26,23,.35)", zIndex: 60 }} />
      )}
      <aside
        role="dialog"
        aria-label="Asistente"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "400px",
          maxWidth: "92vw",
          zIndex: 61,
          background: "#FCFAF6",
          borderLeft: "1px solid #E7E1D4",
          boxShadow: "-8px 0 32px rgba(26,26,23,.22)",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform .28s cubic-bezier(.4,0,.2,1)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <header
          style={{ padding: "16px 18px", borderBottom: "1px solid #E7E1D4", display: "flex", flexDirection: "column", gap: "10px" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ color: "#0E5C4A", display: "inline-flex" }}>
              <IconSparkle />
            </span>
            <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "15px" }}>Asistente</span>
            <button
              onClick={onClose}
              aria-label="Cerrar asistente"
              style={{ marginLeft: "auto", background: "none", border: "none", color: "#79746B", cursor: "pointer", display: "inline-flex", padding: "2px" }}
            >
              <IconClose />
            </button>
          </div>
          {context && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                alignSelf: "flex-start",
                fontFamily: "'Space Mono',monospace",
                fontSize: "10.5px",
                color: "#0E5C4A",
                background: "#DCEFE4",
                borderRadius: "999px",
                padding: "3px 10px",
              }}
            >
              Contexto: {context}
              {onDismissContext && (
                <button
                  onClick={onDismissContext}
                  aria-label="Quitar contexto"
                  style={{ background: "none", border: "none", color: "#0E5C4A", cursor: "pointer", display: "inline-flex", padding: 0 }}
                >
                  <IconClose className="size-3" />
                </button>
              )}
            </span>
          )}
        </header>
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: "12px" }}>
          {children}
        </div>
        {footer}
      </aside>
    </>
  );
}
