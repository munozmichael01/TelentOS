-- Auditoría de agentes reparada (auditoría técnica + análisis funcional §6.1):
-- company_id para atribuir coste/uso por empresa. Los inserts van por
-- service_role desde core.ts (0015 dejó la tabla sin políticas de escritura
-- para authenticated, lo que rompía el log en silencio).
alter table agent_runs add column if not exists company_id uuid references companies(id) on delete set null;
create index if not exists agent_runs_company_idx on agent_runs (company_id, created_at desc);
