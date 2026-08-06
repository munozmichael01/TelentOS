"use client";

/**
 * Abre el diálogo de impresión. Es la "descarga" del recibo mientras no haya generador de PDF:
 * el navegador ofrece "Guardar como PDF" en el mismo diálogo.
 */
export function PrintButton({ label }: { label: string }) {
  return (
    <button
      onClick={() => window.print()}
      style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "13px", color: "#fff", background: "#0E5C4A", border: "2px solid #1A1A17", boxShadow: "3px 3px 0 #1A1A17", borderRadius: "11px", padding: "10px 20px", cursor: "pointer" }}
    >
      {label}
    </button>
  );
}
