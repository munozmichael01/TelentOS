-- ─────────────────────────────────────────────────────────────────────────────
-- 0018_payroll_seed_fix.sql
-- Corrige el seed de payroll: el seed anterior usó LIMIT 1 en companies y
-- pudo haber insertado datos en una empresa diferente a la del usuario real.
-- Esta migración:
--   1. Elimina TODO el contenido de las tablas de payroll (cascade).
--   2. Detecta la empresa correcta via company_members (la que tiene miembros).
--   3. Re-siembra exactamente igual que 0017 pero con la empresa correcta.
-- Idempotente: si Junio 2026 ya existe para la empresa correcta, no hace nada.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_company_id   uuid;
  v_company_name text;
  v_run_id       uuid;
  v_profile_id   uuid;
  v_line_id      uuid;
  v_employee     record;
  v_idx          int  := 0;

  v_salaries     numeric[] := ARRAY[8000, 7600, 6000, 5500, 5000, 4800, 4200, 3800, 3500, 3200];

  v_base         numeric;
  v_bono_alim    numeric := 400;
  v_hours_bonus  numeric;
  v_gross        numeric;
  v_net          numeric;

  v_sso_emp      numeric;
  v_rpe_emp      numeric;
  v_faov_emp     numeric;
  v_islr         numeric;

  v_sso_pat      numeric;
  v_rpe_pat      numeric;
  v_faov_pat     numeric;
  v_inces        numeric;
  v_prestaciones numeric;
  v_total_emp    numeric;

  v_run_gross    numeric := 0;
  v_run_net      numeric := 0;
  v_run_employer numeric := 0;
  v_emp_count    int     := 0;
BEGIN

  -- ── 1. Detectar empresa CORRECTA: la que tiene miembros reales ────────────
  SELECT c.id, c.name INTO v_company_id, v_company_name
  FROM companies c
  INNER JOIN company_members cm ON cm.company_id = c.id
  LIMIT 1;

  IF v_company_id IS NULL THEN
    -- Fallback: primera empresa disponible
    SELECT id, name INTO v_company_id, v_company_name FROM companies LIMIT 1;
  END IF;

  IF v_company_id IS NULL THEN
    RAISE NOTICE '[payroll_seed_fix] No hay empresa, abortando.';
    RETURN;
  END IF;

  RAISE NOTICE '[payroll_seed_fix] Empresa correcta: % (%)', v_company_name, v_company_id;

  -- ── 2. Limpiar datos de payroll de CUALQUIER empresa (corrección total) ───
  DELETE FROM pay_profiles;
  DELETE FROM pay_runs;
  -- pay_components, pay_run_lines, pay_run_line_items, pay_run_audit_log,
  -- payslips, payroll_exports se eliminan en cascada.

  RAISE NOTICE '[payroll_seed_fix] Tablas de payroll limpiadas.';

  -- ── 3. Idempotencia: verificar de nuevo (por si había datos válidos) ───────
  IF EXISTS (SELECT 1 FROM pay_runs WHERE company_id = v_company_id AND period_month = '2026-06') THEN
    RAISE NOTICE '[payroll_seed_fix] Ya existe la corrida Junio 2026, omitiendo.';
    RETURN;
  END IF;

  -- ── 4. Crear corrida activa ───────────────────────────────────────────────
  INSERT INTO pay_runs (company_id, period_label, period_month, entity_name, run_type, status, currency)
  VALUES (v_company_id, 'Junio 2026', '2026-06', v_company_name, 'monthly'::payment_frequency, 'in_review'::pay_run_status, 'USD')
  RETURNING id INTO v_run_id;

  -- ── 5. Procesar empleados ─────────────────────────────────────────────────
  FOR v_employee IN
    SELECT id, name, role_title, department
    FROM   employees
    WHERE  company_id = v_company_id
      AND  status     = 'active'
    ORDER  BY name
    LIMIT  10
  LOOP
    v_idx     := v_idx + 1;
    v_base    := v_salaries[LEAST(v_idx, array_length(v_salaries, 1))];

    v_hours_bonus := CASE WHEN v_idx = 2 THEN 200 ELSE 0 END;
    v_gross       := v_base + v_bono_alim + v_hours_bonus;

    v_sso_emp  := round(v_base * 0.04,   2);
    v_rpe_emp  := round(v_base * 0.005,  2);
    v_faov_emp := round(v_base * 0.01,   2);
    v_islr     := round((v_base - v_sso_emp - v_rpe_emp - v_faov_emp) * 0.17, 2);
    v_net      := v_gross - v_sso_emp - v_rpe_emp - v_faov_emp - v_islr
                  - CASE WHEN v_idx = 4 THEN 150 ELSE 0 END;

    v_sso_pat      := round(v_base * 0.09,   2);
    v_rpe_pat      := round(v_base * 0.017,  2);
    v_faov_pat     := round(v_base * 0.02,   2);
    v_inces        := round(v_base * 0.02,   2);
    v_prestaciones := round(v_base * 0.0127, 2);
    v_total_emp    := v_gross + v_sso_pat + v_rpe_pat + v_faov_pat + v_inces + v_prestaciones;

    v_run_gross    := v_run_gross    + v_gross;
    v_run_net      := v_run_net      + v_net;
    v_run_employer := v_run_employer + v_total_emp;
    v_emp_count    := v_emp_count    + 1;

    INSERT INTO pay_profiles (
      company_id, employee_id, base_salary, currency, frequency,
      effective_from, payment_method,
      bank_name, bank_account_last4,
      country_pack, tax_profile, legal_entity, employer_cost
    )
    VALUES (
      v_company_id, v_employee.id, v_base, 'USD', 'monthly'::payment_frequency,
      '2026-01-01', 'transfer',
      CASE v_idx
        WHEN 1 THEN 'Banesco'
        WHEN 2 THEN 'Banesco'
        WHEN 3 THEN 'Mercantil'
        WHEN 5 THEN 'BBVA Provincial'
        WHEN 6 THEN 'Banesco'
        WHEN 8 THEN 'BOD'
        ELSE NULL
      END,
      CASE v_idx
        WHEN 1 THEN '4821'
        WHEN 2 THEN '3592'
        WHEN 3 THEN '7741'
        WHEN 5 THEN '2283'
        WHEN 6 THEN '6614'
        WHEN 8 THEN '9901'
        ELSE NULL
      END,
      've'::country_pack_code, 'ISLR · retención mensual', v_company_name, v_total_emp
    )
    ON CONFLICT (company_id, employee_id) DO NOTHING
    RETURNING id INTO v_profile_id;

    IF v_profile_id IS NOT NULL THEN
      INSERT INTO pay_components (pay_profile_id, name, component_type, amount, active, order_index)
      VALUES
        (v_profile_id, 'Bono de alimentación (Cestaticket)', 'fixed'::pay_component_type,       400,                    true,  0),
        (v_profile_id, 'Horas extra',                         'variable'::pay_component_type,    null,                   true,  1),
        (v_profile_id, 'Bonificación anual',                  'conditional'::pay_component_type, round(v_base * 0.5, 2), true,  2),
        (v_profile_id, 'Bono por desempeño',                  'conditional'::pay_component_type, round(v_base * 0.15, 2), false, 3);
    END IF;

    INSERT INTO pay_run_lines (
      pay_run_id, employee_id,
      gross, net, employer_cost, status,
      has_bank_issue, has_adjustment_issue, has_salary_change, has_unconfirmed_input
    )
    VALUES (
      v_run_id, v_employee.id,
      v_gross, v_net, v_total_emp,
      (CASE v_idx
        WHEN 1 THEN 'approved'
        WHEN 2 THEN 'reviewed'
        WHEN 3 THEN 'reviewed'
        WHEN 4 THEN 'draft'
        WHEN 5 THEN 'approved'
        WHEN 6 THEN 'reviewed'
        WHEN 7 THEN 'draft'
        WHEN 8 THEN 'approved'
        ELSE       'draft'
      END)::pay_run_line_status,
      v_idx = 4,
      v_idx = 7,
      v_idx = 2,
      false
    )
    ON CONFLICT (pay_run_id, employee_id) DO NOTHING
    RETURNING id INTO v_line_id;

    IF v_line_id IS NOT NULL THEN
      INSERT INTO pay_run_line_items (line_id, category, label, amount, quantity_label, order_index)
      VALUES
        (v_line_id, 'earning'::line_item_category, 'Salario base',                      v_base,        '30 días', 0),
        (v_line_id, 'earning'::line_item_category, 'Bono de alimentación (Cestaticket)', v_bono_alim,   null,      1);
      IF v_hours_bonus > 0 THEN
        INSERT INTO pay_run_line_items (line_id, category, label, amount, quantity_label, order_index)
        VALUES (v_line_id, 'earning'::line_item_category, 'Horas extra nocturnas', v_hours_bonus, '6 h', 2);
      END IF;

      INSERT INTO pay_run_line_items (line_id, category, label, amount, order_index)
      VALUES
        (v_line_id, 'deduction'::line_item_category, 'S.S.O. (4%)',                  v_sso_emp,  0),
        (v_line_id, 'deduction'::line_item_category, 'R.P.E. paro forzoso (0,5%)',   v_rpe_emp,  1),
        (v_line_id, 'deduction'::line_item_category, 'FAOV / LPH (1%)',              v_faov_emp, 2),
        (v_line_id, 'deduction'::line_item_category, 'ISLR retención',               v_islr,     3);
      IF v_idx = 4 THEN
        INSERT INTO pay_run_line_items (line_id, category, label, amount, order_index)
        VALUES (v_line_id, 'deduction'::line_item_category, 'Anticipo de sueldo', 150, 4);
      END IF;

      INSERT INTO pay_run_line_items (line_id, category, label, amount, order_index)
      VALUES
        (v_line_id, 'employer'::line_item_category, 'S.S.O. patronal (9%)',            v_sso_pat,      0),
        (v_line_id, 'employer'::line_item_category, 'R.P.E. patronal (1,7%)',          v_rpe_pat,      1),
        (v_line_id, 'employer'::line_item_category, 'FAOV patronal (2%)',              v_faov_pat,     2),
        (v_line_id, 'employer'::line_item_category, 'INCES (2%)',                      v_inces,        3),
        (v_line_id, 'employer'::line_item_category, 'Provisión prestaciones sociales', v_prestaciones, 4);
    END IF;
  END LOOP;

  -- ── 6. Actualizar totales ─────────────────────────────────────────────────
  UPDATE pay_runs
  SET gross          = round(v_run_gross,    2),
      net            = round(v_run_net,      2),
      employer_cost  = round(v_run_employer, 2),
      employee_count = v_emp_count
  WHERE id = v_run_id;

  -- ── 7. Audit log ──────────────────────────────────────────────────────────
  INSERT INTO pay_run_audit_log (pay_run_id, text, who, created_at)
  VALUES
    (v_run_id, 'Corrida de Junio 2026 creada automaticamente', 'Sistema',    now() - interval '8 days'),
    (v_run_id, 'Revisados ' || (v_emp_count - 2) || ' de ' || v_emp_count || ' empleados', 'HR Admin', now() - interval '5 days'),
    (v_run_id, 'Recalculado tras cambio de salario en empleado #2', 'Sistema', now() - interval '3 days');

  -- ── 8. Corridas históricas ────────────────────────────────────────────────
  INSERT INTO pay_runs (company_id, period_label, period_month, entity_name, run_type, status, gross, net, employer_cost, employee_count, currency)
  VALUES
    (v_company_id, 'Mayo 2026',    '2026-05', v_company_name, 'monthly'::payment_frequency, 'paid'::pay_run_status,     round(v_run_gross * 0.970, 2), round(v_run_net * 0.970, 2), round(v_run_employer * 0.970, 2), v_emp_count,                 'USD'),
    (v_company_id, 'Abril 2026',   '2026-04', v_company_name, 'monthly'::payment_frequency, 'paid'::pay_run_status,     round(v_run_gross * 0.890, 2), round(v_run_net * 0.890, 2), round(v_run_employer * 0.890, 2), GREATEST(v_emp_count - 1, 1), 'USD'),
    (v_company_id, 'Marzo 2026',   '2026-03', v_company_name, 'monthly'::payment_frequency, 'exported'::pay_run_status, round(v_run_gross * 0.870, 2), round(v_run_net * 0.870, 2), round(v_run_employer * 0.870, 2), GREATEST(v_emp_count - 1, 1), 'USD'),
    (v_company_id, 'Febrero 2026', '2026-02', v_company_name, 'monthly'::payment_frequency, 'paid'::pay_run_status,     round(v_run_gross * 0.820, 2), round(v_run_net * 0.820, 2), round(v_run_employer * 0.820, 2), GREATEST(v_emp_count - 2, 1), 'USD'),
    (v_company_id, 'Enero 2026',   '2026-01', v_company_name, 'monthly'::payment_frequency, 'paid'::pay_run_status,     round(v_run_gross * 0.780, 2), round(v_run_net * 0.780, 2), round(v_run_employer * 0.780, 2), GREATEST(v_emp_count - 2, 1), 'USD');

  RAISE NOTICE '[payroll_seed_fix] Completado: % empleados en empresa "%" (%), corrida ID = %',
    v_emp_count, v_company_name, v_company_id, v_run_id;
END;
$$;
