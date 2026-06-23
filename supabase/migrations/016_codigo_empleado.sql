-- ============================================================
-- 016_codigo_empleado.sql — Código de empleado (Natillera)
--
-- Agrega natillera_empleados.codigo (texto, único). El frontend autosugiere el
-- siguiente EMP-### al crear, pero el código es editable.
-- Backfill: a las filas existentes sin código se les asigna EMP-### por orden
-- de creado_en (continuando después del mayor EMP-### que ya exista).
--
-- Tabla standalone (Natillera independiente de la contabilidad).
-- Idempotente: add column if not exists, backfill solo de nulos, índice único
-- if not exists.
-- ============================================================

alter table natillera_empleados add column if not exists codigo text;

-- Backfill de los códigos faltantes: EMP-### por orden de creado_en, numerando
-- a partir del mayor EMP-### existente (idempotente: solo toca filas con NULL).
do $$
declare
  v_offset int;
begin
  select coalesce(max((substring(codigo from '^EMP-(\d+)$'))::int), 0)
    into v_offset
  from natillera_empleados
  where codigo ~ '^EMP-\d+$';

  with faltantes as (
    select id, row_number() over (order by creado_en nulls last, id) as rn
    from natillera_empleados
    where codigo is null
  )
  update natillera_empleados e
  set codigo = 'EMP-' || lpad((v_offset + f.rn)::text, 3, '0')
  from faltantes f
  where e.id = f.id;
end $$;

-- Unicidad del código (índice único idempotente; permite múltiples NULL, que no
-- deberían quedar tras el backfill).
create unique index if not exists natillera_empleados_codigo_key
  on natillera_empleados (codigo);
