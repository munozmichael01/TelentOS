import { Children, type CSSProperties, type ReactNode } from "react";

type Align = "left" | "center" | "right";

interface HairlineTableProps {
  cols: string;
  headers: ReactNode[];
  /** Per-column alignment — "right" for numbers, dates, amounts. Defaults to "left". */
  align?: Align[];
  children: ReactNode;
}

export function HairlineTable({ cols, headers, align, children }: HairlineTableProps) {
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
          <span
            key={i}
            style={align?.[i] && align[i] !== "left" ? { textAlign: align[i], display: "block" } : undefined}
          >
            {h}
          </span>
        ))}
      </div>
      {children}
    </div>
  );
}

interface HairlineRowProps {
  /** Per-column alignment — when provided, wraps each cell in a column div. */
  align?: Align[];
  style?: CSSProperties;
  children: ReactNode;
}

export function HairlineRow({ children, align, style }: HairlineRowProps) {
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
      {align
        ? Children.toArray(children).map((cell, i) => (
            <div key={i} style={align[i] && align[i] !== "left" ? { textAlign: align[i] } : undefined}>
              {cell}
            </div>
          ))
        : children}
    </div>
  );
}
