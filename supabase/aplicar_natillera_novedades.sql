-- ============================================================
-- aplicar_natillera_novedades.sql — Migración 017 (Natillera por novedades).
-- Pegar completo en el SQL Editor de Supabase y ejecutar.
-- Idempotente: se puede re-ejecutar sin error.
--
-- OJO: elimina natillera_aportes (estaba vacía; los aportes ahora se calculan
-- al vuelo a partir de cuota + novedades + fechas de ingreso/retiro).
-- Conserva natillera_saldos_iniciales y natillera_retiros (comprobantes).
-- ============================================================

-- 1) Código de empleado (idempotente; por si la migración 016 nunca se aplicó).
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

-- 2) Fecha de retiro.
alter table natillera_empleados add column if not exists fecha_retiro date;

-- 3) Novedades por empleado/mes.
create table if not exists natillera_novedades (
  id uuid primary key default gen_random_uuid(),
  empleado_id uuid not null references natillera_empleados(id) on delete cascade,
  anio int not null,
  mes int not null check (mes between 1 and 12),
  tipo text not null check (tipo in ('cambio_cuota','no_aporto','abono','retiro')),
  valor numeric(18,2),
  nota text,
  creado_en timestamptz default now(),
  creado_por uuid references auth.users
);
create index if not exists natillera_novedades_empleado on natillera_novedades (empleado_id);
create index if not exists natillera_novedades_periodo on natillera_novedades (anio, mes);

alter table natillera_novedades enable row level security;

drop policy if exists natillera_novedades_select on natillera_novedades;
create policy natillera_novedades_select on natillera_novedades
  for select to authenticated using (true);

drop policy if exists natillera_novedades_insert on natillera_novedades;
create policy natillera_novedades_insert on natillera_novedades
  for insert to authenticated
  with check (public.rol_usuario_actual() in ('admin','contadora'));

drop policy if exists natillera_novedades_update on natillera_novedades;
create policy natillera_novedades_update on natillera_novedades
  for update to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora'))
  with check (public.rol_usuario_actual() in ('admin','contadora'));

drop policy if exists natillera_novedades_delete on natillera_novedades;
create policy natillera_novedades_delete on natillera_novedades
  for delete to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora'));

-- 4) Eliminar natillera_aportes (ya no es la fuente de verdad).
drop table if exists natillera_aportes cascade;
