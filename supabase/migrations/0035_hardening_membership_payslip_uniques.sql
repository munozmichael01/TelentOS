-- 0035_hardening_membership_payslip_uniques.sql

-- S2 (AUD-M5b) · un user pertenece a UNA sola empresa (modelo desacoplado, decisión
-- de producto: para otra empresa se registra con otras credenciales). Blinda el
-- `.maybeSingle()` de resolución de empresa (lib/api.ts): nunca podrá haber 2 membresías.
create unique index if not exists company_members_user_uq on company_members(user_id);

-- E4 (P6-a) · un recibo por línea de nómina. El check de app (SELECT existing antes del
-- insert) era race-prone; esta restricción lo hace a prueba de doble generación en DB.
-- (La numeración legal per-empresa del slip_number sigue diferida a los packs de país.)
create unique index if not exists payslips_line_uq on payslips(pay_run_line_id);
