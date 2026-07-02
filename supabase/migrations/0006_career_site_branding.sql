-- ── Career Site: Branding + Analytics ────────────────────────────────────

-- Branding per career site (colors, fonts, custom domain)
ALTER TABLE career_site_pages
  ADD COLUMN IF NOT EXISTS branding jsonb NOT NULL DEFAULT '{}';

-- Analytics events (page views, job views, applications)
CREATE TABLE IF NOT EXISTS career_site_events (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  event_type  text        NOT NULL, -- 'page_view' | 'job_view' | 'application'
  job_id      uuid        REFERENCES jobs(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS career_site_events_lookup
  ON career_site_events (company_id, event_type, created_at DESC);

ALTER TABLE career_site_events ENABLE ROW LEVEL SECURITY;

-- Dashboard users can read their company events
CREATE POLICY "auth_read_events" ON career_site_events
  FOR SELECT TO authenticated
  USING (
    company_id IN (SELECT id FROM companies)
  );
