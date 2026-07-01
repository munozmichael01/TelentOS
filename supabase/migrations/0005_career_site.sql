-- ── Career Site CMS ─────────────────────────────────────────────────────────
-- Una página por empresa. Contenido como JSONB.
-- draft_content = estado actual del editor
-- published_content = última snapshot publicada
-- translations = { "en": {...}, "pt": {...} }

CREATE TABLE career_site_pages (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        uuid        NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  slug              text        NOT NULL,
  is_published      boolean     NOT NULL DEFAULT false,
  published_at      timestamptz,
  draft_content     jsonb       NOT NULL DEFAULT '{}',
  published_content jsonb,
  translations      jsonb       NOT NULL DEFAULT '{}',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE career_site_pages ENABLE ROW LEVEL SECURITY;

-- Usuarios autenticados: acceso total a su empresa
CREATE POLICY "auth_all" ON career_site_pages
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Anon: solo puede leer páginas publicadas
CREATE POLICY "anon_read_published" ON career_site_pages
  FOR SELECT TO anon USING (is_published = true);
