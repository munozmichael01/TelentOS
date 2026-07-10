export function StatCard({
  label,
  value,
  hint,
  hintColor,
  valueColor,
}: {
  label: string;
  value: string | number;
  hint?: string;
  hintColor?: string;
  valueColor?: string;
}) {
  return (
    <div
      style={{
        background: "#FCFAF6",
        border: "1px solid #E7E1D4",
        borderRadius: "14px",
        padding: "16px 18px",
      }}
    >
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: ".5px", color: "#79746B", lineHeight: 1.4 }}>
        {label}
      </div>
      <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 900, fontSize: "25px", letterSpacing: "-.8px", lineHeight: 1, marginTop: "10px", color: valueColor ?? "#1A1A17", fontVariantNumeric: "tabular-nums" }}>
        {value}
      </div>
      {hint && (
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "10.5px", marginTop: "8px", color: hintColor ?? "#79746B" }}>
          {hint}
        </div>
      )}
    </div>
  );
}
