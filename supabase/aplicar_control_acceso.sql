-- ============================================================
-- 020_control_acceso.sql — Control de acceso por rol (rol 'nomina' restringido)
--
-- Hasta ahora el SELECT de TODAS las tablas era USING (true): cualquier
-- autenticado leía todo (incluidos movimientos contables y salarios). Esta
-- migración separa el SELECT por MÓDULO y añade un tercer rol:
--
--   • 'admin'     → ve y edita TODO (finanzas + nómina + gestión de usuarios).
--   • 'contadora' → finanzas + nómina (igual que hoy).
--   • 'nomina'    → SOLO el módulo Nómina. NO puede leer ni escribir finanzas,
--                   NI por API (RLS lo bloquea aunque adivine la URL/endpoint).
--
-- Patrón: se reusa la función SECURITY DEFINER public.rol_usuario_actual()
-- (002_rls.sql), que evita la recursión de RLS sobre `perfiles`. La política de
-- `perfiles` NO se toca (sigue: lectura authenticated, escritura solo admin) —
-- justo para no introducir recursión.
--
-- Las vistas v_er_* / v_bg / v_er_chequeos son security_invoker: respetan el RLS
-- de sus tablas base (movimientos, catalogo_cuentas, rubros_er), así que al
-- restringir esas tablas quedan automáticamente vedadas para 'nomina'. Las
-- vistas v_cargas y v_notas_financieras corren como DEFINER (leen auth.users):
-- no respetan el RLS base, por eso se les añade el filtro de rol en su propio
-- cuerpo.
--
-- Idempotente (drop ... if exists / create or replace).
-- ============================================================

-- ── 1) Ampliar el check de perfiles.rol para incluir 'nomina' ──────────────
alter table perfiles drop constraint if exists perfiles_rol_check;
alter table perfiles
  add constraint perfiles_rol_check check (rol in ('admin','contadora','nomina'));

-- ── 2) SELECT por módulo ───────────────────────────────────────────────────
-- 2a) Tablas FINANCIERAS: SELECT solo admin/contadora (antes: using(true)).
drop policy if exists cargas_select on cargas;
create policy cargas_select on cargas
  for select to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora'));

drop policy if exists movimientos_select on movimientos;
create policy movimientos_select on movimientos
  for select to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora'));

drop policy if exists rubros_er_select on rubros_er;
create policy rubros_er_select on rubros_er
  for select to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora'));

drop policy if exists catalogo_cuentas_select on catalogo_cuentas;
create policy catalogo_cuentas_select on catalogo_cuentas
  for select to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora'));

drop policy if exists config_select on config;
create policy config_select on config
  for select to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora'));

drop policy if exists traducciones_cuentas_select on traducciones_cuentas;
create policy traducciones_cuentas_select on traducciones_cuentas
  for select to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora'));

drop policy if exists notas_financieras_select on notas_financieras;
create policy notas_financieras_select on notas_financieras
  for select to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora'));

drop policy if exists ventas_efectivo_select on ventas_efectivo;
create policy ventas_efectivo_select on ventas_efectivo
  for select to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora'));

-- 2b) Tablas de NÓMINA: SELECT admin/contadora/nomina (antes: using(true)).
drop policy if exists empleados_select on empleados;
create policy empleados_select on empleados
  for select to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora','nomina'));

drop policy if exists natillera_empleados_select on natillera_empleados;
create policy natillera_empleados_select on natillera_empleados
  for select to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora','nomina'));

drop policy if exists natillera_novedades_select on natillera_novedades;
create policy natillera_novedades_select on natillera_novedades
  for select to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora','nomina'));

drop policy if exists natillera_saldos_iniciales_select on natillera_saldos_iniciales;
create policy natillera_saldos_iniciales_select on natillera_saldos_iniciales
  for select to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora','nomina'));

drop policy if exists natillera_retiros_select on natillera_retiros;
create policy natillera_retiros_select on natillera_retiros
  for select to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora','nomina'));

drop policy if exists vacaciones_periodos_select on vacaciones_periodos;
create policy vacaciones_periodos_select on vacaciones_periodos
  for select to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora','nomina'));

-- ── 3) ESCRITURA en NÓMINA: admin/contadora/nomina ─────────────────────────
-- Se redefinen los insert/update/delete (antes solo admin/contadora). Los
-- INSERT que tenían el WITH CHECK con admin/contadora quedan ahora explícitos
-- incluyendo 'nomina' (cierra el hueco descrito: el WITH CHECK exige el rol).

-- empleados
drop policy if exists empleados_insert on empleados;
create policy empleados_insert on empleados
  for insert to authenticated
  with check (public.rol_usuario_actual() in ('admin','contadora','nomina'));

drop policy if exists empleados_update on empleados;
create policy empleados_update on empleados
  for update to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora','nomina'))
  with check (public.rol_usuario_actual() in ('admin','contadora','nomina'));

drop policy if exists empleados_delete on empleados;
create policy empleados_delete on empleados
  for delete to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora','nomina'));

-- natillera_empleados
drop policy if exists natillera_empleados_insert on natillera_empleados;
create policy natillera_empleados_insert on natillera_empleados
  for insert to authenticated
  with check (public.rol_usuario_actual() in ('admin','contadora','nomina'));

drop policy if exists natillera_empleados_update on natillera_empleados;
create policy natillera_empleados_update on natillera_empleados
  for update to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora','nomina'))
  with check (public.rol_usuario_actual() in ('admin','contadora','nomina'));

drop policy if exists natillera_empleados_delete on natillera_empleados;
create policy natillera_empleados_delete on natillera_empleados
  for delete to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora','nomina'));

-- natillera_novedades
drop policy if exists natillera_novedades_insert on natillera_novedades;
create policy natillera_novedades_insert on natillera_novedades
  for insert to authenticated
  with check (public.rol_usuario_actual() in ('admin','contadora','nomina'));

drop policy if exists natillera_novedades_update on natillera_novedades;
create policy natillera_novedades_update on natillera_novedades
  for update to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora','nomina'))
  with check (public.rol_usuario_actual() in ('admin','contadora','nomina'));

drop policy if exists natillera_novedades_delete on natillera_novedades;
create policy natillera_novedades_delete on natillera_novedades
  for delete to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora','nomina'));

-- natillera_saldos_iniciales
drop policy if exists natillera_saldos_iniciales_insert on natillera_saldos_iniciales;
create policy natillera_saldos_iniciales_insert on natillera_saldos_iniciales
  for insert to authenticated
  with check (public.rol_usuario_actual() in ('admin','contadora','nomina'));

drop policy if exists natillera_saldos_iniciales_update on natillera_saldos_iniciales;
create policy natillera_saldos_iniciales_update on natillera_saldos_iniciales
  for update to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora','nomina'))
  with check (public.rol_usuario_actual() in ('admin','contadora','nomina'));

drop policy if exists natillera_saldos_iniciales_delete on natillera_saldos_iniciales;
create policy natillera_saldos_iniciales_delete on natillera_saldos_iniciales
  for delete to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora','nomina'));

-- natillera_retiros
drop policy if exists natillera_retiros_insert on natillera_retiros;
create policy natillera_retiros_insert on natillera_retiros
  for insert to authenticated
  with check (public.rol_usuario_actual() in ('admin','contadora','nomina'));

drop policy if exists natillera_retiros_update on natillera_retiros;
create policy natillera_retiros_update on natillera_retiros
  for update to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora','nomina'))
  with check (public.rol_usuario_actual() in ('admin','contadora','nomina'));

drop policy if exists natillera_retiros_delete on natillera_retiros;
create policy natillera_retiros_delete on natillera_retiros
  for delete to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora','nomina'));

-- vacaciones_periodos
drop policy if exists vacaciones_periodos_insert on vacaciones_periodos;
create policy vacaciones_periodos_insert on vacaciones_periodos
  for insert to authenticated
  with check (public.rol_usuario_actual() in ('admin','contadora','nomina'));

drop policy if exists vacaciones_periodos_update on vacaciones_periodos;
create policy vacaciones_periodos_update on vacaciones_periodos
  for update to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora','nomina'))
  with check (public.rol_usuario_actual() in ('admin','contadora','nomina'));

drop policy if exists vacaciones_periodos_delete on vacaciones_periodos;
create policy vacaciones_periodos_delete on vacaciones_periodos
  for delete to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora','nomina'));

-- (La escritura FINANCIERA — cargas, movimientos, catalogo_cuentas, config,
--  rubros_er, traducciones_cuentas, notas_financieras, ventas_efectivo — NO se
--  toca: sigue restringida a admin/contadora como en 002/009/010/012. Los RPC
--  procesar_carga / eliminar_carga ya validan rol admin/contadora internamente.)

-- ── 4) Vistas DEFINER que leen auth.users: filtrar por rol en el cuerpo ─────
-- v_cargas y v_notas_financieras corren como su dueño (para leer el email de
-- auth.users), así que NO heredan el RLS de las tablas base. Sin el filtro de
-- abajo, un 'nomina' podría leerlas. auth.uid() funciona igual en una vista
-- DEFINER (viene del JWT de la request), por eso el WHERE las protege.

create or replace view v_cargas as
select
  c.id, c.anio, c.mes, c.nombre_archivo, c.storage_path,
  c.estado, c.filas_importadas, c.validaciones, c.creada_en,
  u.email as usuario_email
from cargas c
left join auth.users u on u.id = c.usuario_id
where public.rol_usuario_actual() in ('admin','contadora');

revoke all on v_cargas from public, anon;
grant select on v_cargas to authenticated;

create or replace view v_notas_financieras as
select
  n.anio, n.mes, n.contenido, n.actualizada_en, n.actualizada_por,
  u.email as actualizada_por_email,
  n.contenido_en
from notas_financieras n
left join auth.users u on u.id = n.actualizada_por
where public.rol_usuario_actual() in ('admin','contadora');

revoke all on v_notas_financieras from public, anon;
grant select on v_notas_financieras to authenticated;

-- ── 5) Storage por módulo ──────────────────────────────────────────────────
-- 5a) Bucket 'balances' (xlsx contables): lectura solo admin/contadora
--     (antes: cualquier autenticado podía descargarlos).
drop policy if exists balances_lectura on storage.objects;
create policy balances_lectura on storage.objects
  for select to authenticated
  using (
    bucket_id = 'balances'
    and public.rol_usuario_actual() in ('admin','contadora')
  );

-- 5b) Bucket 'empleados-fotos' (nómina): la escritura suma 'nomina'. La lectura
--     se deja en authenticated (las fotos no son dato sensible y el bucket es
--     privado con URLs firmadas; solo se llega desde la app de nómina).
drop policy if exists empleados_fotos_subida on storage.objects;
create policy empleados_fotos_subida on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'empleados-fotos'
    and public.rol_usuario_actual() in ('admin','contadora','nomina')
  );

drop policy if exists empleados_fotos_update on storage.objects;
create policy empleados_fotos_update on storage.objects
  for update to authenticated
  using (bucket_id = 'empleados-fotos' and public.rol_usuario_actual() in ('admin','contadora','nomina'))
  with check (bucket_id = 'empleados-fotos' and public.rol_usuario_actual() in ('admin','contadora','nomina'));

drop policy if exists empleados_fotos_borrado on storage.objects;
create policy empleados_fotos_borrado on storage.objects
  for delete to authenticated
  using (bucket_id = 'empleados-fotos' and public.rol_usuario_actual() in ('admin','contadora','nomina'));

-- ── 6) Vista de usuarios para la gestión de accesos (solo admin) ───────────
-- Lista perfiles + email (de auth.users) + flag de cambio de contraseña.
-- DEFINER (lee auth.users) + filtro de rol = solo admin la puede leer.
create or replace view v_usuarios as
select
  p.user_id,
  u.email,
  p.rol,
  p.debe_cambiar_password,
  u.created_at
from perfiles p
left join auth.users u on u.id = p.user_id
where public.rol_usuario_actual() = 'admin';

revoke all on v_usuarios from public, anon;
grant select on v_usuarios to authenticated;

-- ── NOTA sobre CREACIÓN de usuarios (gestión de accesos) ───────────────────
-- Cambiar el ROL de un usuario existente es un UPDATE sobre `perfiles`, que el
-- admin ya puede hacer (política perfiles_escritura de 002_rls.sql).
--
-- CREAR un usuario nuevo (auth.users + su perfil + contraseña temporal) requiere
-- la Admin API de Supabase, que SOLO funciona con la service_role key. Esa key
-- NUNCA debe vivir en el frontend. La arquitectura es:
--   Frontend (JWT del admin) ──invoke──▶ Edge Function 'crear-usuario'
--        └─ la función valida que quien llama es admin (vía su JWT)
--        └─ usa SUPABASE_SERVICE_ROLE_KEY (secret de la función) para
--           auth.admin.createUser({ email, password:'Magenta26', email_confirm })
--           e inserta el perfil con rol + debe_cambiar_password = true.
-- Código en supabase/functions/crear-usuario/. La service_role se carga como
-- secret de la función (`supabase secrets set`), jamás en el bundle del cliente.
