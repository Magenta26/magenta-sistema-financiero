-- ============================================================
-- 022_rol_lider_campo.sql — Cuarto rol: 'lider_campo' (líder de campo)
--
-- Rol restringido a VER y EDITAR únicamente el módulo Externos (Catálogo,
-- Registro de producción, Liquidación quincenal). NADA más: ni Finanzas, ni el
-- resto de Nómina (empleados, natillera, vacaciones), ni gestión de usuarios.
--
-- Modelo final de roles:
--   • 'admin'        → TODO (finanzas + nómina + externos + usuarios).
--   • 'contadora'    → finanzas + nómina + externos.
--   • 'nomina'       → núcleo de nómina (empleados/natillera/vacaciones) + externos.
--   • 'lider_campo'  → SOLO externos.
--
-- Patrón: se reusa public.rol_usuario_actual() (002). Solo se tocan el check de
-- perfiles.rol y las 4 tablas de externos (se les AÑADE 'lider_campo'). Las
-- tablas FINANCIERAS siguen en ('admin','contadora') y las de NÓMINA en
-- ('admin','contadora','nomina') — NO se tocan, así que 'lider_campo' queda
-- excluido de ellas por no estar nombrado (RLS lo bloquea incluso por API).
--
-- Idempotente (drop constraint/policy if exists + recreate).
-- ============================================================

-- ── 1) Ampliar el check de perfiles.rol para incluir 'lider_campo' ─────────
alter table perfiles drop constraint if exists perfiles_rol_check;
alter table perfiles
  add constraint perfiles_rol_check
  check (rol in ('admin','contadora','nomina','lider_campo'));

-- ── 2) RLS de las 4 tablas de Externos: + 'lider_campo' en SELECT y escritura ──
-- (Antes: 'admin','contadora','nomina' — migración 021. Ahora suma 'lider_campo'.)

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

-- ── 3) NO se tocan las demás políticas ─────────────────────────────────────
-- Financieras (movimientos, catalogo_cuentas, cargas, rubros_er, config,
-- traducciones_cuentas, notas_financieras, ventas_efectivo) siguen en
-- ('admin','contadora'). Nómina (empleados, natillera_*, vacaciones_periodos)
-- siguen en ('admin','contadora','nomina'). 'lider_campo' NO está nombrado en
-- ninguna de ellas → RLS lo bloquea (lectura y escritura) aunque adivine el
-- endpoint. La vista v_usuarios sigue filtrando a solo 'admin'.
