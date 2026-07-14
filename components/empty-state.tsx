/**
 * EmptyState — patrón canónico de vacío (design-system §2.8 / Anexo A-6).
 * Contenedor centrado con borde dashed, tile de icono sobre brand-soft, título
 * card-title, cuerpo soft y un único CTA opcional (la acción que resuelve el vacío).
 * Sin sombra dura: el vacío no es accionable, el CTA sí.
 *
 * Desviación mínima del blueprint: `icon` es opcional (el set ui/icons aún es
 * reducido; los callers de página sin icono siguen válidos). Cuando se pasa, se
 * renderiza el tile. `action` sustituye al viejo `children`.
 */

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode; // icono de línea ~22px, hereda stroke
  title: string;
  description?: string;
  action?: React.ReactNode; // <Button> que resuelve el vacío
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        border: "1.5px dashed var(--line)",
        borderRadius: "14px",
        padding: "48px 32px",
        gap: "6px",
      }}
    >
      {icon && (
        <span
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "14px",
            background: "var(--brand-soft)",
            color: "var(--brand)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "8px",
          }}
        >
          {icon}
        </span>
      )}
      <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "15px", color: "var(--ink)" }}>{title}</div>
      {description && (
        <p style={{ fontSize: "14px", lineHeight: 1.5, color: "var(--soft)", maxWidth: "44ch", margin: 0, textWrap: "pretty" }}>
          {description}
        </p>
      )}
      {action && <div style={{ marginTop: "14px" }}>{action}</div>}
    </div>
  );
}
