export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-[18px] flex flex-wrap items-start justify-between gap-4">
      <div>
        {eyebrow && (
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "11px", letterSpacing: "1.5px", textTransform: "uppercase", color: "#79746B", marginBottom: "6px" }}>
            {eyebrow}
          </div>
        )}
        <h1 style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 900, fontSize: "28px", letterSpacing: "-0.6px", lineHeight: 1.05, color: "#1A1A17", margin: 0 }}>
          {title}
        </h1>
        {description && (
          <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 400, fontSize: "14px", lineHeight: 1.5, color: "#79746B", marginTop: "6px" }}>
            {description}
          </div>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-[10px]">{children}</div>
      )}
    </div>
  );
}
