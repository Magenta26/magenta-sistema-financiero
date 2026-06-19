-- ============================================================
-- 013_cambio_password.sql — Forzar cambio de contraseña en el primer ingreso
-- Agrega perfiles.debe_cambiar_password (default true: los perfiles NUEVOS
-- nacen obligados a cambiar la contraseña temporal "Magenta26").
-- Los perfiles YA existentes se backfillean a false una sola vez (al crear la
-- columna) para no bloquearlos.
-- RLS: el usuario baja su propio flag con la función SECURITY DEFINER
-- marcar_password_cambiada() (no puede tocar su rol). La escritura general de
-- perfiles sigue siendo solo de admin (002_rls.sql).
-- Idempotente.
-- ============================================================

-- Agregar la columna y backfillear SOLO la primera vez (cuando aún no existe),
-- para que re-ejecutar la migración no reinicie el flag de usuarios nuevos.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'perfiles'
      and column_name = 'debe_cambiar_password'
  ) then
    alter table perfiles add column debe_cambiar_password boolean not null default true;
    -- Los usuarios que ya existían no quedan bloqueados (solo esta vez).
    update perfiles set debe_cambiar_password = false;
  end if;
end $$;

-- El usuario marca SU PROPIA fila como "ya cambió la contraseña".
-- SECURITY DEFINER: corre con privilegios del dueño y solo cambia el flag del
-- usuario actual; jamás el rol ni filas ajenas.
create or replace function public.marcar_password_cambiada()
returns void
language sql
security definer
set search_path = public
as $$
  update perfiles set debe_cambiar_password = false where user_id = auth.uid();
$$;

revoke execute on function public.marcar_password_cambiada() from public, anon;
grant execute on function public.marcar_password_cambiada() to authenticated;
