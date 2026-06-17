-- persist AI analysis per application
ALTER TABLE applications ADD COLUMN IF NOT EXISTS ai_analysis jsonb;
