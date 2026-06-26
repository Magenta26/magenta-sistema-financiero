-- ============================================================
-- aplicar_022_lider_campo.sql — Migración 022 (rol 'lider_campo').
-- Pegar completo en el SQL Editor de Supabase y ejecutar.
-- Idempotente: se puede re-ejecutar sin error y NO borra datos.
--
-- Crea el cuarto rol 'lider_campo' (líder de campo), restringido a VER/EDITAR
-- SOLO el módulo Externos. Modelo final:
--   • admin       → todo + usuarios
--   • contadora   → finanzas + nómina + externos
--   • nomina      → núcleo de nómina + externos
--   • lider_campo → SOLO externos
--
-- Solo toca: el check de perfiles.rol y el RLS de las 4 tablas de externos
-- (les AÑADE 'lider_campo'). Las tablas financieras y de nómina NO se tocan, así
-- que 'lider_campo' queda excluido de ellas (RLS lo bloquea, también por API).
-- ============================================================

-- ── 1) Ampliar el check de perfiles.rol ───────────────────────────────────
alter table perfiles drop constraint if exists perfiles_rol_check;
alter table perfiles
  add constraint perfiles_rol_check
  check (rol in ('admin','contadora','nomina','lider_campo'));

-- ── 2) RLS de las 4 tablas de Externos: + 'lider_campo' ────────────────────
-- externos
drop policy if exists externos_select on externos;
create policy externos_select on externos
  for select to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora','nomina','lider_campo'));
drop policy if exists externos_insert on externos;
create policy externos_insert on externos
  for insert to authenticated
  with check (public.rol_usuario_actual() in ('admin','contadora','nomina','lider_campo'));
drop policy if exists externos_update on externos;
create policy externos_update on externos
  for update to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora','nomina','lider_campo'))
  with check (public.rol_usuario_actual() in ('admin','contadora','nomina','lider_campo'));
drop policy if exists externos_delete on externos;
create policy externos_delete on externos
  for delete to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora','nomina','lider_campo'));

-- externos_tarifas
drop policy if exists externos_tarifas_select on externos_tarifas;
create policy externos_tarifas_select on externos_tarifas
  for select to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora','nomina','lider_campo'));
drop policy if exists externos_tarifas_insert on externos_tarifas;
create policy externos_tarifas_insert on externos_tarifas
  for insert to authenticated
  with check (public.rol_usuario_actual() in ('admin','contadora','nomina','lider_campo'));
drop policy if exists externos_tarifas_update on externos_tarifas;
create policy externos_tarifas_update on externos_tarifas
  for update to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora','nomina','lider_campo'))
  with check (public.rol_usuario_actual() in ('admin','contadora','nomina','lider_campo'));
drop policy if exists externos_tarifas_delete on externos_tarifas;
create policy externos_tarifas_delete on externos_tarifas
  for delete to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora','nomina','lider_campo'));

-- externos_registros
drop policy if exists externos_registros_select on externos_registros;
create policy externos_registros_select on externos_registros
  for select to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora','nomina','lider_campo'));
drop policy if exists externos_registros_insert on externos_registros;
create policy externos_registros_insert on externos_registros
  for insert to authenticated
  with check (public.rol_usuario_actual() in ('admin','contadora','nomina','lider_campo'));
drop policy if exists externos_registros_update on externos_registros;
create policy externos_registros_update on externos_registros
  for update to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora','nomina','lider_campo'))
  with check (public.rol_usuario_actual() in ('admin','contadora','nomina','lider_campo'));
drop policy if exists externos_registros_delete on externos_registros;
create policy externos_registros_delete on externos_registros
  for delete to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora','nomina','lider_campo'));

-- externos_deducciones
drop policy if exists externos_deducciones_select on externos_deducciones;
create policy externos_deducciones_select on externos_deducciones
  for select to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora','nomina','lider_campo'));
drop policy if exists externos_deducciones_insert on externos_deducciones;
create policy externos_deducciones_insert on externos_deducciones
  for insert to authenticated
  with check (public.rol_usuario_actual() in ('admin','contadora','nomina','lider_campo'));
drop policy if exists externos_deducciones_update on externos_deducciones;
create policy externos_deducciones_update on externos_deducciones
  for update to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora','nomina','lider_campo'))
  with check (public.rol_usuario_actual() in ('admin','contadora','nomina','lider_campo'));
drop policy if exists externos_deducciones_delete on externos_deducciones;
create policy externos_deducciones_delete on externos_deducciones
  for delete to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora','nomina','lider_campo'));
