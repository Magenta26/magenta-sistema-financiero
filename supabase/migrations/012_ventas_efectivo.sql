-- ============================================================
-- 012_ventas_efectivo.sql — Ventas en efectivo (dato manual informativo)
-- Un valor por (anio, mes), escrito a mano. Es INDEPENDIENTE: no afecta el ER,
-- la utilidad neta, el EBITDA ni ningún subtotal; solo se muestra como fila al
-- final del Estado de Resultados.
-- RLS: lectura para cualquier autenticado; escritura solo admin/contadora.
-- Idempotente.
-- ============================================================

create table if not exists ventas_efectivo (
  anio int not null,
  mes int not null check (mes between 1 and 12),
  valor numeric(18,2) not null default 0,
  actualizada_en timestamptz default now(),
  actualizada_por uuid references auth.users,
  primary key (anio, mes)
);

alter table ventas_efectivo enable row level security;

-- Lectura: todo usuario autenticado
drop policy if exists ventas_efectivo_select on ventas_efectivo;
create policy ventas_efectivo_select on ventas_efectivo
  for select to authenticated using (true);

-- Inserción: solo admin/contadora
drop policy if exists ventas_efectivo_insert on ventas_efectivo;
create policy ventas_efectivo_insert on ventas_efectivo
  for insert to authenticated
  with check (public.rol_usuario_actual() in ('admin','contadora'));

-- Actualización: solo admin/contadora
drop policy if exists ventas_efectivo_update on ventas_efectivo;
create policy ventas_efectivo_update on ventas_efectivo
  for update to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora'))
  with check (public.rol_usuario_actual() in ('admin','contadora'));
