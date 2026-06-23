-- ============================================================
-- aplicar_codigo_empleado.sql — Migración 016 (Código de empleado, Natillera).
-- Pegar completo en el SQL Editor de Supabase y ejecutar.
-- Idempotente: se puede re-ejecutar sin error y NO borra datos.
--
-- Agrega natillera_empleados.codigo (único), backfillea EMP-### por orden de
-- creado_en a las filas sin código y crea el índice único.
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
