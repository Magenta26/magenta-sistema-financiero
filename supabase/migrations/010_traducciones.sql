-- ============================================================
-- 010_traducciones.sql — Traducción de nombres de cuenta al inglés (US GAAP)
-- Tabla puente cuenta -> nombre_en. El helper nombreCuenta() del frontend la
-- consulta por código para mostrar el nombre en inglés en modo EN; en ES
-- siempre se muestra el nombre original de SIIGO.
--
-- NOTA IMPORTANTE: esta tabla ya fue creada y SEMBRADA manualmente en Supabase
-- (423 cuentas traducidas). Este archivo existe solo para que el repositorio
-- quede completo y reproducible; NO incluye el seed de las 423 filas (esos
-- datos viven en la base). El DDL es idempotente (create if not exists /
-- create or replace), así que re-ejecutarlo no borra ni duplica nada.
--
-- RLS: lectura para cualquier autenticado; insertar/actualizar solo
-- admin/contadora (función de rol existente). Sin delete.
-- ============================================================

create table if not exists traducciones_cuentas (
  cuenta text primary key,
  nombre_en text not null,
  origen text not null default 'seed' check (origen in ('seed','manual')),
  actualizada_en timestamptz default now()
);

alter table traducciones_cuentas enable row level security;

-- Lectura: todo usuario autenticado
drop policy if exists traducciones_cuentas_select on traducciones_cuentas;
create policy traducciones_cuentas_select on traducciones_cuentas
  for select to authenticated using (true);

-- Inserción: solo admin/contadora
drop policy if exists traducciones_cuentas_insert on traducciones_cuentas;
create policy traducciones_cuentas_insert on traducciones_cuentas
  for insert to authenticated
  with check (public.rol_usuario_actual() in ('admin','contadora'));

-- Actualización: solo admin/contadora
drop policy if exists traducciones_cuentas_update on traducciones_cuentas;
create policy traducciones_cuentas_update on traducciones_cuentas
  for update to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora'))
  with check (public.rol_usuario_actual() in ('admin','contadora'));
