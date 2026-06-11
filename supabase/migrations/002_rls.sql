-- ============================================================
-- 002_rls.sql — Row Level Security
-- Lectura: cualquier usuario autenticado.
-- Escritura en cargas/movimientos/catalogo_cuentas/config: admin o contadora.
-- Escritura en perfiles y rubros_er: solo admin.
-- Idempotente.
-- ============================================================

-- Función SECURITY DEFINER para consultar el rol del usuario actual.
-- Al ejecutarse con privilegios del dueño evita la recursión de RLS sobre perfiles.
create or replace function public.rol_usuario_actual()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select rol from public.perfiles where user_id = auth.uid()
$$;

revoke execute on function public.rol_usuario_actual() from public, anon;
grant execute on function public.rol_usuario_actual() to authenticated;

-- Activar RLS en todas las tablas
alter table cargas enable row level security;
alter table movimientos enable row level security;
alter table rubros_er enable row level security;
alter table catalogo_cuentas enable row level security;
alter table config enable row level security;
alter table perfiles enable row level security;

-- ---------- Lectura: todo usuario autenticado ----------
drop policy if exists cargas_select on cargas;
create policy cargas_select on cargas
  for select to authenticated using (true);

drop policy if exists movimientos_select on movimientos;
create policy movimientos_select on movimientos
  for select to authenticated using (true);

drop policy if exists rubros_er_select on rubros_er;
create policy rubros_er_select on rubros_er
  for select to authenticated using (true);

drop policy if exists catalogo_cuentas_select on catalogo_cuentas;
create policy catalogo_cuentas_select on catalogo_cuentas
  for select to authenticated using (true);

drop policy if exists config_select on config;
create policy config_select on config
  for select to authenticated using (true);

drop policy if exists perfiles_select on perfiles;
create policy perfiles_select on perfiles
  for select to authenticated using (true);

-- ---------- Escritura: admin o contadora ----------
drop policy if exists cargas_escritura on cargas;
create policy cargas_escritura on cargas
  for all to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora'))
  with check (public.rol_usuario_actual() in ('admin','contadora'));

drop policy if exists movimientos_escritura on movimientos;
create policy movimientos_escritura on movimientos
  for all to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora'))
  with check (public.rol_usuario_actual() in ('admin','contadora'));

drop policy if exists catalogo_cuentas_escritura on catalogo_cuentas;
create policy catalogo_cuentas_escritura on catalogo_cuentas
  for all to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora'))
  with check (public.rol_usuario_actual() in ('admin','contadora'));

drop policy if exists config_escritura on config;
create policy config_escritura on config
  for all to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora'))
  with check (public.rol_usuario_actual() in ('admin','contadora'));

-- ---------- Escritura solo admin ----------
drop policy if exists perfiles_escritura on perfiles;
create policy perfiles_escritura on perfiles
  for all to authenticated
  using (public.rol_usuario_actual() = 'admin')
  with check (public.rol_usuario_actual() = 'admin');

drop policy if exists rubros_er_escritura on rubros_er;
create policy rubros_er_escritura on rubros_er
  for all to authenticated
  using (public.rol_usuario_actual() = 'admin')
  with check (public.rol_usuario_actual() = 'admin');
