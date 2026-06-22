-- ============================================================
-- 014_natillera.sql — Natillera (caja de ahorro de empleados)
--
-- PRINCIPIO DE INDEPENDENCIA: la Natillera es un registro de ahorro
-- TOTALMENTE INDEPENDIENTE de la contabilidad. Estas tablas NO referencian
-- ni tocan `movimientos`, `catalogo_cuentas`, `rubros_er` ni las vistas
-- v_er_* / v_bg. No es cuenta por pagar ni gasto: no aparece en el Estado de
-- Resultados ni en el Balance General. Son tablas standalone (prefijo
-- natillera_) que solo conviven en la misma base.
--
-- RLS en las TRES tablas: lectura para cualquier autenticado; insertar /
-- actualizar / borrar solo admin/contadora (función existente
-- public.rol_usuario_actual()).
-- Idempotente (create table if not exists, drop policy if exists).
-- ============================================================

-- ── Empleados de la natillera ────────────────────────────────
-- Persisten entre años; al retirarse NO se borran, se marcan activo=false.
create table if not exists natillera_empleados (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  cuota_mensual numeric(18,2) not null default 0,  -- monto mensual que define el empleado
  activo boolean not null default true,
  fecha_ingreso date,
  creado_en timestamptz default now()
);

-- ── Aportes mensuales ────────────────────────────────────────
-- Un monto por (empleado, año, mes). El "total ahorrado" se CALCULA sumando
-- estos aportes; nunca se guarda como campo.
create table if not exists natillera_aportes (
  id uuid primary key default gen_random_uuid(),
  empleado_id uuid not null references natillera_empleados(id) on delete cascade,
  anio int not null,
  mes int not null check (mes between 1 and 12),
  monto numeric(18,2) not null default 0,
  actualizado_en timestamptz default now(),
  actualizado_por uuid references auth.users,
  unique (empleado_id, anio, mes)
);
create index if not exists natillera_aportes_anio on natillera_aportes (anio);

-- ── Retiros (comprobantes de retiro voluntario) ──────────────
-- Al registrar un retiro se guarda el SNAPSHOT del total ahorrado al momento
-- (monto_total) — no se recalcula después aunque cambien los aportes.
create table if not exists natillera_retiros (
  id uuid primary key default gen_random_uuid(),
  empleado_id uuid not null references natillera_empleados(id),
  consecutivo bigint generated always as identity,  -- número del comprobante
  fecha_retiro date not null default current_date,
  anio int not null,
  monto_total numeric(18,2) not null default 0,     -- snapshot del total ahorrado
  motivo text,
  estado text not null default 'pendiente' check (estado in ('pendiente','pagado')),
  fecha_pago date,
  generado_por uuid references auth.users,
  creado_en timestamptz default now()
);
create index if not exists natillera_retiros_anio on natillera_retiros (anio);
create index if not exists natillera_retiros_empleado on natillera_retiros (empleado_id);

-- ── RLS ──────────────────────────────────────────────────────
alter table natillera_empleados enable row level security;
alter table natillera_aportes  enable row level security;
alter table natillera_retiros  enable row level security;

-- natillera_empleados
drop policy if exists natillera_empleados_select on natillera_empleados;
create policy natillera_empleados_select on natillera_empleados
  for select to authenticated using (true);

drop policy if exists natillera_empleados_insert on natillera_empleados;
create policy natillera_empleados_insert on natillera_empleados
  for insert to authenticated
  with check (public.rol_usuario_actual() in ('admin','contadora'));

drop policy if exists natillera_empleados_update on natillera_empleados;
create policy natillera_empleados_update on natillera_empleados
  for update to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora'))
  with check (public.rol_usuario_actual() in ('admin','contadora'));

drop policy if exists natillera_empleados_delete on natillera_empleados;
create policy natillera_empleados_delete on natillera_empleados
  for delete to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora'));

-- natillera_aportes
drop policy if exists natillera_aportes_select on natillera_aportes;
create policy natillera_aportes_select on natillera_aportes
  for select to authenticated using (true);

drop policy if exists natillera_aportes_insert on natillera_aportes;
create policy natillera_aportes_insert on natillera_aportes
  for insert to authenticated
  with check (public.rol_usuario_actual() in ('admin','contadora'));

drop policy if exists natillera_aportes_update on natillera_aportes;
create policy natillera_aportes_update on natillera_aportes
  for update to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora'))
  with check (public.rol_usuario_actual() in ('admin','contadora'));

drop policy if exists natillera_aportes_delete on natillera_aportes;
create policy natillera_aportes_delete on natillera_aportes
  for delete to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora'));

-- natillera_retiros
drop policy if exists natillera_retiros_select on natillera_retiros;
create policy natillera_retiros_select on natillera_retiros
  for select to authenticated using (true);

drop policy if exists natillera_retiros_insert on natillera_retiros;
create policy natillera_retiros_insert on natillera_retiros
  for insert to authenticated
  with check (public.rol_usuario_actual() in ('admin','contadora'));

drop policy if exists natillera_retiros_update on natillera_retiros;
create policy natillera_retiros_update on natillera_retiros
  for update to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora'))
  with check (public.rol_usuario_actual() in ('admin','contadora'));

drop policy if exists natillera_retiros_delete on natillera_retiros;
create policy natillera_retiros_delete on natillera_retiros
  for delete to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora'));
