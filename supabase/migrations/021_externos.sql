-- ============================================================
-- 021_externos.sql — Módulo PAGO A EXTERNOS (Entrega 1: modelo de datos)
--
-- Personas EXTERNAS a las que se les paga quincenalmente por tallos (maquillada
-- + hydratada) y horas. Universo MÁS GRANDE que "externo que ahorra en la
-- natillera": por eso es un catálogo propio (`externos`), NO `natillera_empleados`.
-- Vínculo OPCIONAL a la natillera (`natillera_empleado_id`) para leer la cuota y
-- aplicar la deducción del 50% en la Entrega 2.
--
-- INDEPENDIENTE de la contabilidad (no toca movimientos / catalogo_cuentas /
-- rubros_er / v_er_* / v_bg). Es dominio NÓMINA: lo gestionan admin/contadora/nomina.
--
-- Esta Entrega 1 crea las 4 tablas + la fila de tarifas; la captura de
-- tallos/horas (externos_registros) y la liquidación quincenal (que usará
-- externos_deducciones) llegan en la Entrega 2 — las tablas quedan listas.
--
-- Idempotente (create table if not exists / drop policy if exists / insert ... on
-- conflict do nothing). Se puede re-ejecutar sin error y NO borra datos.
-- ============================================================

-- ── 1) Catálogo de externos (la persona que recibe el pago) ────────────────
create table if not exists externos (
  id uuid primary key default gen_random_uuid(),
  codigo text unique not null,                          -- EXT-### (auto-sugerido, editable)
  nombre_completo text not null,
  cedula text,                                          -- opcional
  activo boolean not null default true,
  -- Vínculo OPCIONAL con la natillera: si el externo ahorra, apunta a su fila en
  -- natillera_empleados (para leer cuota_mensual y deducir el 50%). null = no ahorra.
  natillera_empleado_id uuid references natillera_empleados(id),
  creado_en timestamptz default now()
);

-- ── 2) Tarifas globales editables (una sola fila de config) ────────────────
-- id fijo = 1 (check) para garantizar una única fila; insert idempotente.
create table if not exists externos_tarifas (
  id integer primary key default 1 check (id = 1),
  maquillada_valor numeric not null default 85,         -- $ por tallo maquillado
  hydratada_valor numeric not null default 65,          -- $ por tallo hydratado
  hora_valor numeric not null default 10000,            -- $ por hora
  actualizado_en timestamptz default now()
);
insert into externos_tarifas (id) values (1) on conflict (id) do nothing;

-- ── 3) Registros diarios de producción (se USA en Entrega 2) ───────────────
create table if not exists externos_registros (
  id uuid primary key default gen_random_uuid(),
  externo_id uuid not null references externos(id),
  fecha date not null,
  maquillada_tallos integer not null default 0,
  hydratada_tallos integer not null default 0,
  horas numeric not null default 0,
  registrado_por uuid references auth.users(id),
  creado_en timestamptz default now()
);
create index if not exists externos_registros_externo_idx
  on externos_registros (externo_id, fecha);

-- ── 4) Deducciones manuales por quincena (se USA en Entrega 2) ─────────────
-- quincena: 1 = días 1–15 · 2 = días 16–fin de mes.
create table if not exists externos_deducciones (
  id uuid primary key default gen_random_uuid(),
  externo_id uuid not null references externos(id),
  anio integer not null,
  quincena integer not null check (quincena in (1, 2)),
  tipo text not null,                                   -- 'prestamo' | 'otro' | …
  valor numeric not null,
  nota text,
  creado_en timestamptz default now()
);
create index if not exists externos_deducciones_externo_idx
  on externos_deducciones (externo_id, anio, quincena);

-- ── 5) RLS — dominio NÓMINA: SELECT y escritura admin/contadora/nomina ──────
-- Mismo patrón del resto de nómina (020): se reusa public.rol_usuario_actual().
-- WITH CHECK explícito en los INSERT con el mismo criterio (cierra el hueco de
-- qual null al insertar).

-- externos
alter table externos enable row level security;
drop policy if exists externos_select on externos;
create policy externos_select on externos
  for select to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora','nomina'));
drop policy if exists externos_insert on externos;
create policy externos_insert on externos
  for insert to authenticated
  with check (public.rol_usuario_actual() in ('admin','contadora','nomina'));
drop policy if exists externos_update on externos;
create policy externos_update on externos
  for update to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora','nomina'))
  with check (public.rol_usuario_actual() in ('admin','contadora','nomina'));
drop policy if exists externos_delete on externos;
create policy externos_delete on externos
  for delete to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora','nomina'));

-- externos_tarifas
alter table externos_tarifas enable row level security;
drop policy if exists externos_tarifas_select on externos_tarifas;
create policy externos_tarifas_select on externos_tarifas
  for select to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora','nomina'));
drop policy if exists externos_tarifas_insert on externos_tarifas;
create policy externos_tarifas_insert on externos_tarifas
  for insert to authenticated
  with check (public.rol_usuario_actual() in ('admin','contadora','nomina'));
drop policy if exists externos_tarifas_update on externos_tarifas;
create policy externos_tarifas_update on externos_tarifas
  for update to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora','nomina'))
  with check (public.rol_usuario_actual() in ('admin','contadora','nomina'));
drop policy if exists externos_tarifas_delete on externos_tarifas;
create policy externos_tarifas_delete on externos_tarifas
  for delete to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora','nomina'));

-- externos_registros
alter table externos_registros enable row level security;
drop policy if exists externos_registros_select on externos_registros;
create policy externos_registros_select on externos_registros
  for select to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora','nomina'));
drop policy if exists externos_registros_insert on externos_registros;
create policy externos_registros_insert on externos_registros
  for insert to authenticated
  with check (public.rol_usuario_actual() in ('admin','contadora','nomina'));
drop policy if exists externos_registros_update on externos_registros;
create policy externos_registros_update on externos_registros
  for update to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora','nomina'))
  with check (public.rol_usuario_actual() in ('admin','contadora','nomina'));
drop policy if exists externos_registros_delete on externos_registros;
create policy externos_registros_delete on externos_registros
  for delete to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora','nomina'));

-- externos_deducciones
alter table externos_deducciones enable row level security;
drop policy if exists externos_deducciones_select on externos_deducciones;
create policy externos_deducciones_select on externos_deducciones
  for select to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora','nomina'));
drop policy if exists externos_deducciones_insert on externos_deducciones;
create policy externos_deducciones_insert on externos_deducciones
  for insert to authenticated
  with check (public.rol_usuario_actual() in ('admin','contadora','nomina'));
drop policy if exists externos_deducciones_update on externos_deducciones;
create policy externos_deducciones_update on externos_deducciones
  for update to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora','nomina'))
  with check (public.rol_usuario_actual() in ('admin','contadora','nomina'));
drop policy if exists externos_deducciones_delete on externos_deducciones;
create policy externos_deducciones_delete on externos_deducciones
  for delete to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora','nomina'));
