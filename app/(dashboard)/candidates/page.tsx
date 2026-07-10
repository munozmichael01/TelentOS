import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { FitBadge } from "@/components/fit-badge";
import { Badge } from "@/components/ui/badge";
import { HairlineTable, HairlineRow } from "@/components/hairline-table";
import { createClient } from "@/lib/supabase/server";
import { formatDate, initials } from "@/lib/utils";

const AVATAR_PALETTES = [
  { bg: "#DCEFE4", color: "#0E5C4A" },
  { bg: "#F6D9D2", color: "#BD4332" },
  { bg: "#E7E0F2", color: "#5A4C86" },
  { bg: "#F8E7C4", color: "#946312" },
  { bg: "#D6E4F2", color: "#2B5E8A" },
];
function avatarPal(name: string) {
  const code = name.charCodeAt(0) + (name.charCodeAt(1) || 0);
  return AVATAR_PALETTES[code % AVATAR_PALETTES.length];
}

export default async function CandidatesPage() {
  const supabase = createClient();

  const { data: candidates } = await supabase
    .from("candidates")
    .select(`
      id, name, email, location, cv_url, created_at,
      applications(id, fit_score, status, created_at, jobs(title), job_stages(name))
    `)
    .order("created_at", { ascending: false });

  type RawApp = {
    id: string;
    fit_score: number | null;
    status: string;
    created_at: string;
    jobs: { title: string } | null;
    job_stages: { name: string } | null;
  };

  type Candidate = {
    id: string;
    name: string;
    email: string;
    location: string | null;
    cv_url: string | null;
    created_at: string;
    applications: RawApp[];
  };

  const rows = (candidates ?? []) as unknown as Candidate[];

  return (
    <div>
      <PageHeader
        title="Candidatos"
        eyebrow={`${rows.length} persona${rows.length !== 1 ? "s" : ""} en la base de datos`}
      />
      {rows.length === 0 ? (
        <EmptyState
          title="Sin candidatos"
          description="Las candidaturas llegan desde el career site o desde los canales de distribución."
        />
      ) : (
        <HairlineTable
          cols="2.4fr 1.5fr 1.2fr 0.6fr 1fr 0.7fr"
          headers={["Candidato", "Última oferta", "Etapa", "Aplic.", "Registrado", "Fit"]}
          align={["left", "left", "left", "right", "right", "right"]}
        >
          {rows.map((c) => {
            const apps = [...(c.applications ?? [])].sort(
              (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
            const latest = apps[0] ?? null;
            const pal = avatarPal(c.name);
            return (
              <HairlineRow key={c.id} align={["left", "left", "left", "right", "right", "right"]}>
                {/* Candidato */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                  <span style={{ width: "32px", height: "32px", flexShrink: 0, borderRadius: "50%", background: pal.bg, color: pal.color, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: "12px" }}>
                    {initials(c.name)}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <Link href={`/candidates/${c.id}`} style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 700, fontSize: "14px", color: "#1A1A17", textDecoration: "none" }}>
                      {c.name}
                    </Link>
                    <div style={{ fontSize: "11.5px", color: "#79746B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.email}</div>
                    {c.location && <div style={{ fontSize: "11px", color: "#79746B" }}>{c.location}</div>}
                  </div>
                </div>
                {/* Última oferta */}
                <span style={{ fontSize: "13px", color: "#1A1A17" }}>
                  {latest?.jobs?.title ?? <span style={{ color: "#79746B" }}>—</span>}
                </span>
                {/* Etapa */}
                <span>
                  {latest ? (
                    <Badge variant={latest.status === "hired" ? "success" : latest.status === "rejected" ? "destructive" : "secondary"}>
                      {latest.job_stages?.name ?? latest.status}
                    </Badge>
                  ) : <span style={{ color: "#79746B" }}>—</span>}
                </span>
                {/* Aplic. */}
                <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "12px" }}>{apps.length}</span>
                {/* Registrado */}
                <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "12px", color: "#79746B" }}>
                  {formatDate(c.created_at)}
                </span>
                {/* Fit */}
                <span>
                  <FitBadge score={latest?.fit_score ?? null} />
                </span>
              </HairlineRow>
            );
          })}
        </HairlineTable>
      )}
    </div>
  );
}
