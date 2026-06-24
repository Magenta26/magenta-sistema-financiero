-- ============================================================
-- aplicar_vacaciones.sql — Migración 019 (seguimiento de vacaciones).
-- Pegar completo en el SQL Editor de Supabase y ejecutar.
-- Idempotente: se puede re-ejecutar sin error y NO borra datos.
--
-- Agrega empleados.fecha_ingreso (causación) y crea vacaciones_periodos
-- (períodos TOMADOS; la causación se calcula al vuelo, no se guarda).
-- Independiente de la contabilidad. RLS: lectura authenticated; escritura
-- solo admin/contadora.
-- ============================================================

alter table empleados
  add column if not exists fecha_ingreso date;

create table if not exists vacaciones_periodos (
  id uuid primary key default gen_random_uuid(),
  empleado_id uuid not null references empleados(id) on delete cascade,
  fecha_inicio date not null,
  fecha_fin date,
  dias_habiles numeric(6,2) not null,
  nota text,
  creado_en timestamptz default now(),
  creado_por uuid references auth.users
);

create index if not exists vacaciones_periodos_empleado_idx
  on vacaciones_periodos (empleado_id, fecha_inicio);

alter table vacaciones_periodos enable row level security;

drop policy if exists vacaciones_periodos_select on vacaciones_periodos;
create policy vacaciones_periodos_select on vacaciones_periodos
  for select to authenticated using (true);

drop policy if exists vacaciones_periodos_insert on vacaciones_periodos;
create policy vacaciones_periodos_insert on vacaciones_periodos
  for insert to authenticated
  with check (public.rol_usuario_actual() in ('admin','contadora'));

drop policy if exists vacaciones_periodos_update on vacaciones_periodos;
create policy vacaciones_periodos_update on vacaciones_periodos
  for update to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora'))
  with check (public.rol_usuario_actual() in ('admin','contadora'));

drop policy if exists vacaciones_periodos_delete on vacaciones_periodos;
create policy vacaciones_periodos_delete on vacaciones_periodos
  for delete to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora'));
