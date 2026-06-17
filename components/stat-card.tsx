export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  icon?: unknown;
  hint?: string;
}) {
  return (
    <div
      className="card-hover"
      style={{
        background: "#FCFAF6",
        border: "1px solid #E7E1D4",
        borderRadius: "14px",
        padding: "16px 18px",
      }}
    >
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "10.5px", color: "#79746B" }}>
        {label.toUpperCase()}
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", marginTop: "6px" }}>
        <span style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 900, fontSize: "32px", letterSpacing: "-1px", lineHeight: 1 }}>
          {value}
        </span>
        {hint && (
          <span style={{ fontSize: "12px", fontWeight: 700, paddingBottom: "4px", color: "#1B6B4F" }}>
            {hint}
          </span>
        )}
      </div>
    </div>
  );
}
