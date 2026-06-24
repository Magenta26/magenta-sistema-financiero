-- ============================================================
-- 019_vacaciones.sql — Seguimiento de vacaciones (normativa colombiana)
--
-- 15 días hábiles/año por empleado, causados automáticamente desde
-- empleados.fecha_ingreso (compute-on-read; NO se guarda la causación, solo los
-- períodos TOMADOS). El valor en dinero usa salario/30 por día.
--
-- INDEPENDIENTE de la contabilidad (no toca movimientos/catalogo_cuentas/
-- rubros_er/v_er_*/v_bg). Tabla standalone vinculada a la tabla central
-- `empleados`. Idempotente.
-- ============================================================

-- La causación arranca desde la fecha de ingreso (faltaba en la ficha central).
alter table empleados
  add column if not exists fecha_ingreso date;

-- Períodos de vacaciones TOMADAS por empleado (lo único que se persiste).
create table if not exists vacaciones_periodos (
  id uuid primary key default gen_random_uuid(),
  empleado_id uuid not null references empleados(id) on delete cascade,
  fecha_inicio date not null,
  fecha_fin date,                          -- informativa
  dias_habiles numeric(6,2) not null,      -- días hábiles tomados en ese período
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
