export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-[18px] flex flex-wrap items-start justify-between gap-4">
      <div>
        {description && (
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "11px", letterSpacing: "1.5px", textTransform: "uppercase", color: "#79746B", marginBottom: "6px" }}>
            {description}
          </div>
        )}
        <h1 style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 900, fontSize: "34px", letterSpacing: "-1px", lineHeight: 1, margin: 0 }}>
          {title}
        </h1>
      </div>
      {children && (
        <div className="flex items-center gap-[10px]">{children}</div>
      )}
    </div>
  );
}
