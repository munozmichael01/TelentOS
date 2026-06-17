/** Score de fit 0–100 con semáforo de color. Matches TalentOS App.dc.html fit badge style. */
export function FitBadge({ score }: { score: number | null }) {
  if (score == null) return <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "10.5px", color: "#79746B" }}>—</span>;

  const bg = score >= 75 ? "#DCEFE3" : score >= 50 ? "#F8E7C4" : "#F6D9D2";
  const color = score >= 75 ? "#1B6B4F" : score >= 50 ? "#946312" : "#BD4332";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: "23px",
        padding: "0 8px",
        borderRadius: "999px",
        fontSize: "11.5px",
        fontWeight: 800,
        background: bg,
        color,
        whiteSpace: "nowrap",
      }}
      title={`Fit score: ${score}/100`}
    >
      {score}
    </span>
  );
}
