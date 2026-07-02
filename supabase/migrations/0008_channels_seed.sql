-- Añade utm_source a channels y popula el catálogo de canales estándar
ALTER TABLE channels ADD COLUMN IF NOT EXISTS utm_source text;

INSERT INTO channels (name, kind, base_cpa, audience, utm_source) VALUES
  ('Career Site',     'job_board',  0,  'Candidatos directos desde tu career site',       'career_site'),
  ('LinkedIn Jobs',   'social',     35, 'Red profesional, perfiles cualificados',          'linkedin'),
  ('Indeed',          'aggregator', 12, 'Mayor agregador global de empleo',                'indeed'),
  ('InfoJobs',        'job_board',  15, 'Portal líder en España para perfiles generales',  'infojobs'),
  ('Glassdoor',       'job_board',  22, 'Candidatos que investigan cultura y salarios',    'glassdoor'),
  ('Google for Jobs', 'aggregator', 8,  'Resultados orgánicos de Google — coste casi €0', 'google'),
  ('Meta Ads',        'social',     18, 'Segmentación geo/demográfica en Facebook/IG',     'meta'),
  ('Turijobs',        'job_board',  10, 'Especializado en hostelería y turismo',           'turijobs')
ON CONFLICT (name) DO UPDATE SET
  utm_source = EXCLUDED.utm_source,
  kind       = EXCLUDED.kind,
  base_cpa   = EXCLUDED.base_cpa,
  audience   = EXCLUDED.audience;
