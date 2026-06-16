-- ============================================================
-- 009_notas.sql — Notas financieras por mes (PLAN.md sección 4)
-- Una nota de texto libre por período (anio, mes), editable a mano.
-- RLS: lectura para cualquier autenticado; insertar/actualizar solo
-- admin/contadora (función de rol existente). Sin delete: vaciar una nota
-- es guardar contenido vacío.
-- Idempotente.
-- ============================================================

create table if not exists notas_financieras (
  anio int not null,
  mes int not null check (mes between 1 and 12),
  contenido text not null default '',
  actualizada_en timestamptz default now(),
  actualizada_por uuid references auth.users,
  primary key (anio, mes)
);

alter table notas_financieras enable row level security;

-- Lectura: todo usuario autenticado
drop policy if exists notas_financieras_select on notas_financieras;
create policy notas_financieras_select on notas_financieras
  for select to authenticated using (true);

-- Inserción: solo admin/contadora
drop policy if exists notas_financieras_insert on notas_financieras;
create policy notas_financieras_insert on notas_financieras
  for insert to authenticated
  with check (public.rol_usuario_actual() in ('admin','contadora'));

-- Actualización: solo admin/contadora
drop policy if exists notas_financieras_update on notas_financieras;
create policy notas_financieras_update on notas_financieras
  for update to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora'))
  with check (public.rol_usuario_actual() in ('admin','contadora'));

-- (Sin política de delete a propósito: vaciar = guardar contenido vacío.)

-- Vista con el email de quien actualizó (para mostrar "Última actualización …
-- por {email}"). Sin security_invoker: corre como el dueño para leer
-- auth.users (solo expone el email). Acceso limitado a authenticated.
create or replace view v_notas_financieras as
select
  n.anio, n.mes, n.contenido, n.actualizada_en, n.actualizada_por,
  u.email as actualizada_por_email
from notas_financieras n
left join auth.users u on u.id = n.actualizada_por;

revoke all on v_notas_financieras from public, anon;
grant select on v_notas_financieras to authenticated;
