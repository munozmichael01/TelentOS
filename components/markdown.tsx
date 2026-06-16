/**
 * Mini-renderer de Markdown para descripciones de oferta (##, -, párrafos).
 * Decisión: sin dependencia de markdown completo — las descripciones las
 * genera nuestro propio agente con un subset conocido.
 */
export function Markdown({ content }: { content: string }) {
  const blocks = content.split(/\n\n+/);
  return (
    <div className="job-description text-sm leading-relaxed">
      {blocks.map((block, i) => {
        const lines = block.split("\n").filter((l) => l.trim());
        if (!lines.length) return null;
        if (lines[0].startsWith("## ")) {
          const [heading, ...rest] = lines;
          return (
            <div key={i}>
              <h2>{heading.replace(/^## /, "")}</h2>
              {rest.length > 0 && renderLines(rest)}
            </div>
          );
        }
        return <div key={i}>{renderLines(lines)}</div>;
      })}
    </div>
  );
}

function renderLines(lines: string[]) {
  const items = lines.filter((l) => /^\s*[-*] /.test(l));
  const text = lines.filter((l) => !/^\s*[-*] /.test(l));
  return (
    <>
      {text.map((t, i) => (
        <p key={`p${i}`}>{stripInline(t)}</p>
      ))}
      {items.length > 0 && (
        <ul>
          {items.map((item, i) => (
            <li key={i}>{stripInline(item.replace(/^\s*[-*] /, ""))}</li>
          ))}
        </ul>
      )}
    </>
  );
}

function stripInline(s: string) {
  return s.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1");
}
