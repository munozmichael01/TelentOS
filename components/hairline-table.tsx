import { type CSSProperties, type ReactNode } from "react";

interface HairlineTableProps {
  cols: string;
  headers: ReactNode[];
  children: ReactNode;
}

export function HairlineTable({ cols, headers, children }: HairlineTableProps) {
  return (
    <div
      style={
        {
          "--ht-cols": cols,
          border: "1px solid #E7E1D4",
          borderRadius: "14px",
          overflow: "hidden",
          background: "#FCFAF6",
        } as CSSProperties
      }
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: cols,
          gap: "12px",
          padding: "11px 18px",
          borderBottom: "1px solid #E7E1D4",
          fontFamily: "'Space Mono', monospace",
          fontSize: "9.5px",
          textTransform: "uppercase",
          letterSpacing: "1px",
          color: "#79746B",
        }}
      >
        {headers.map((h, i) => (
          <span key={i}>{h}</span>
        ))}
      </div>
      {children}
    </div>
  );
}

interface HairlineRowProps {
  children: ReactNode;
  style?: CSSProperties;
}

export function HairlineRow({ children, style }: HairlineRowProps) {
  return (
    <div
      className="row-hover"
      style={{
        display: "grid",
        gridTemplateColumns: "var(--ht-cols)",
        gap: "12px",
        alignItems: "center",
        padding: "12px 18px",
        borderBottom: "1px solid #E7E1D4",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
