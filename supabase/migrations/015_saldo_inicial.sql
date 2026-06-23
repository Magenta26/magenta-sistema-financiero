-- ============================================================
-- 015_saldo_inicial.sql — Saldo inicial por empleado/año (Natillera)
--
-- El saldo inicial es lo que el empleado traía ahorrado al cierre del año
-- anterior. El "total ahorrado" del año pasa a ser:
--   saldo_inicial(empleado, año) + suma de aportes del año.
-- Si no hay fila de saldo inicial para (empleado, año), cuenta como 0.
--
-- Sigue el PRINCIPIO DE INDEPENDENCIA de la Natillera: tabla standalone
-- (prefijo natillera_), no toca la contabilidad (movimientos / catalogo_cuentas
-- / rubros_er / v_er_* / v_bg).
--
-- RLS: lectura para cualquier autenticado; insertar/actualizar/borrar solo
-- admin/contadora (función existente public.rol_usuario_actual()).
-- Idempotente.
-- ============================================================

create table if not exists natillera_saldos_iniciales (
  id uuid primary key default gen_random_uuid(),
  empleado_id uuid not null references natillera_empleados(id) on delete cascade,
  anio int not null,
  saldo numeric(18,2) not null default 0,
  actualizado_en timestamptz default now(),
  actualizado_por uuid references auth.users,
  unique (empleado_id, anio)
);
create index if not exists natillera_saldos_iniciales_anio on natillera_saldos_iniciales (anio);

alter table natillera_saldos_iniciales enable row level security;

-- Lectura: todo usuario autenticado
drop policy if exists natillera_saldos_iniciales_select on natillera_saldos_iniciales;
create policy natillera_saldos_iniciales_select on natillera_saldos_iniciales
  for select to authenticated using (true);

-- Inserción: solo admin/contadora
drop policy if exists natillera_saldos_iniciales_insert on natillera_saldos_iniciales;
create policy natillera_saldos_iniciales_insert on natillera_saldos_iniciales
  for insert to authenticated
  with check (public.rol_usuario_actual() in ('admin','contadora'));

-- Actualización: solo admin/contadora
drop policy if exists natillera_saldos_iniciales_update on natillera_saldos_iniciales;
create policy natillera_saldos_iniciales_update on natillera_saldos_iniciales
  for update to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora'))
  with check (public.rol_usuario_actual() in ('admin','contadora'));

-- Borrado: solo admin/contadora
drop policy if exists natillera_saldos_iniciales_delete on natillera_saldos_iniciales;
create policy natillera_saldos_iniciales_delete on natillera_saldos_iniciales
  for delete to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora'));
