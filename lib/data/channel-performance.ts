// Performance histórica mock por canal/sector con estructura real (lo que
// devolvería un data warehouse de campañas). El agente channel-optimizer la
// consume vía tool para fundamentar sus recomendaciones.

export type ChannelStats = {
  channel: string;
  kind: "job_board" | "aggregator" | "social";
  avg_cpa: number; // € por aplicación
  avg_conversion: number; // aplicaciones / views
  quality_index: number; // 0–1: % de aplicaciones que superan screening
  volume_index: number; // 0–1: capacidad de volumen relativa
  best_sectors: string[];
  notes: string;
};

export const CHANNEL_STATS: ChannelStats[] = [
  {
    channel: "LinkedIn Jobs",
    kind: "job_board",
    avg_cpa: 35,
    avg_conversion: 0.009,
    quality_index: 0.85,
    volume_index: 0.5,
    best_sectors: ["Tecnología", "Comercial", "Marketing", "Recursos Humanos"],
    notes: "El mejor canal para perfiles cualificados y management. Caro para volumen.",
  },
  {
    channel: "Indeed",
    kind: "aggregator",
    avg_cpa: 12,
    avg_conversion: 0.025,
    quality_index: 0.45,
    volume_index: 0.95,
    best_sectors: ["Industrial", "Hostelería", "Sanidad", "General", "Comercial"],
    notes: "Máximo volumen a bajo coste. Calidad media: requiere buen screening.",
  },
  {
    channel: "InfoJobs",
    kind: "job_board",
    avg_cpa: 15,
    avg_conversion: 0.022,
    quality_index: 0.55,
    volume_index: 0.85,
    best_sectors: ["Industrial", "Hostelería", "Comercial", "General"],
    notes: "Líder en España para perfiles generalistas y no-desk.",
  },
  {
    channel: "Glassdoor",
    kind: "job_board",
    avg_cpa: 22,
    avg_conversion: 0.012,
    quality_index: 0.7,
    volume_index: 0.4,
    best_sectors: ["Tecnología", "Marketing"],
    notes: "Candidatos informados que comparan cultura y salario. Publica el rango salarial.",
  },
  {
    channel: "Google for Jobs",
    kind: "aggregator",
    avg_cpa: 8,
    avg_conversion: 0.018,
    quality_index: 0.5,
    volume_index: 0.7,
    best_sectors: ["General", "Industrial", "Sanidad", "Tecnología"],
    notes: "Orgánico: coste casi nulo si el job post está bien estructurado. Activar siempre.",
  },
  {
    channel: "Meta Ads",
    kind: "social",
    avg_cpa: 18,
    avg_conversion: 0.015,
    quality_index: 0.4,
    volume_index: 0.8,
    best_sectors: ["Hostelería", "Industrial", "Comercial"],
    notes: "Excelente segmentación geográfica para perfiles junior y no-desk.",
  },
  {
    channel: "X Ads",
    kind: "social",
    avg_cpa: 28,
    avg_conversion: 0.006,
    quality_index: 0.6,
    volume_index: 0.3,
    best_sectors: ["Tecnología"],
    notes: "Nicho tech/producto. Útil como refuerzo de marca, no como canal principal.",
  },
];

export function getChannelPerformance(sector?: string) {
  const s = sector ?? "General";
  return CHANNEL_STATS.map((c) => ({
    ...c,
    // bonus de afinidad sectorial sobre los índices base
    sector_affinity: c.best_sectors.includes(s) ? "alta" : "media-baja",
  }));
}
