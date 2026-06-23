-- ============================================================
-- 017_natillera_novedades.sql — Natillera por NOVEDADES (reporte calculado)
--
-- La Natillera pasa de tabla editable a REPORTE calculado al vuelo
-- (compute-on-read): los aportes mensuales se derivan de la cuota del empleado
-- + sus novedades + sus fechas de ingreso/retiro. No hay cron ni jobs; el "mes
-- actual" es la fecha de hoy.
--
-- Esta migración:
--   1) Asegura natillera_empleados.codigo (texto, único) — idempotente, por si
--      la migración 016 nunca se aplicó. Incluye backfill EMP-### por creado_en.
--   2) Agrega natillera_empleados.fecha_retiro (date, nullable).
--   3) Crea natillera_novedades (cambio_cuota | no_aporto | abono | retiro).
--   4) Elimina natillera_aportes: ya NO es la fuente de verdad (estaba vacía;
--      los aportes ahora se calculan). natillera_saldos_iniciales se conserva.
--
-- Tablas standalone — siguen INDEPENDIENTES de la contabilidad (no tocan
-- movimientos / catalogo_cuentas / rubros_er / v_er_* / v_bg).
-- Idempotente.
-- ============================================================

-- 1) Código de empleado (idempotente; ver 016).
alter table natillera_empleados add column if not exists codigo text;

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

create unique index if not exists natillera_empleados_codigo_key
  on natillera_empleados (codigo);

-- 2) Fecha de retiro (mes/año en que el empleado se retira de la natillera).
alter table natillera_empleados add column if not exists fecha_retiro date;

-- 3) Novedades por empleado/mes.
--    Sin restricción única dura a propósito: se permite historial; la lógica de
--    resolución toma la novedad más reciente por creado_en cuando hay varias del
--    mismo (empleado, mes, tipo).
create table if not exists natillera_novedades (
  id uuid primary key default gen_random_uuid(),
  empleado_id uuid not null references natillera_empleados(id) on delete cascade,
  anio int not null,
  mes int not null check (mes between 1 and 12),   -- mes al que aplica
  tipo text not null check (tipo in ('cambio_cuota','no_aporto','abono','retiro')),
  valor numeric(18,2),    -- cambio_cuota: nueva cuota; abono: monto real; no_aporto/retiro: null
  nota text,
  creado_en timestamptz default now(),
  creado_por uuid references auth.users
);
create index if not exists natillera_novedades_empleado on natillera_novedades (empleado_id);
create index if not exists natillera_novedades_periodo on natillera_novedades (anio, mes);

alter table natillera_novedades enable row level security;

-- Lectura: todo usuario autenticado
drop policy if exists natillera_novedades_select on natillera_novedades;
create policy natillera_novedades_select on natillera_novedades
  for select to authenticated using (true);

-- Inserción: solo admin/contadora
drop policy if exists natillera_novedades_insert on natillera_novedades;
create policy natillera_novedades_insert on natillera_novedades
  for insert to authenticated
  with check (public.rol_usuario_actual() in ('admin','contadora'));

-- Actualización: solo admin/contadora
drop policy if exists natillera_novedades_update on natillera_novedades;
create policy natillera_novedades_update on natillera_novedades
  for update to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora'))
  with check (public.rol_usuario_actual() in ('admin','contadora'));

-- Borrado: solo admin/contadora (p. ej. al reactivar un empleado se borra su retiro)
drop policy if exists natillera_novedades_delete on natillera_novedades;
create policy natillera_novedades_delete on natillera_novedades
  for delete to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora'));

-- 4) natillera_aportes ya no se usa (los aportes se calculan). Estaba vacía.
drop table if exists natillera_aportes cascade;
