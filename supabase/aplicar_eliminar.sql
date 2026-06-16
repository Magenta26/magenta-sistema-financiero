-- ============================================================
-- aplicar_eliminar.sql — Migración 008 (RPC eliminar_carga).
-- Pegar completo en el SQL Editor de Supabase y ejecutar.
-- Idempotente: se puede re-ejecutar sin error.
-- ============================================================

-- ============================================================
-- 008_eliminar_carga.sql — RPC eliminar_carga (PLAN.md secciones 4 y 5)
-- Elimina la carga de un mes en UNA transacción (una función plpgsql es
-- atómica: si algo falla, se revierte todo).
-- SECURITY DEFINER con chequeo interno de rol admin/contadora.
-- Idempotente (create or replace).
-- ============================================================

create or replace function public.eliminar_carga(p_carga_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rol text;
  v_anio int;
  v_mes int;
  v_estado text;
  v_periodo jsonb;
begin
  -- Chequeo interno de rol (la función corre con privilegios del dueño)
  select rol into v_rol from perfiles where user_id = auth.uid();
  if v_rol is null or v_rol not in ('admin','contadora') then
    raise exception 'No autorizado: se requiere rol admin o contadora.';
  end if;

  -- Verificar que la carga existe
  select anio, mes, estado into v_anio, v_mes, v_estado
  from cargas where id = p_carga_id;
  if not found then
    raise exception 'La carga indicada no existe (id %).', p_carga_id;
  end if;

  -- 1) Borrar los movimientos de esa carga y la fila de la carga.
  --    El .xlsx en Storage NO se borra: queda archivado para auditoría
  --    (igual que cuando una carga es reemplazada).
  delete from movimientos where carga_id = p_carga_id;
  delete from cargas where id = p_carga_id;

  -- IMPORTANTE (caso especial): si la carga borrada era 'activa' y existía
  -- una 'reemplazada' del mismo período, NO se reactiva la vieja
  -- automáticamente: ese mes queda SIN carga activa y la contadora decide si
  -- re-sube. Por eso aquí no tocamos las cargas 'reemplazada'.

  -- 2) Recalcular config.periodo_actual: el período ACTIVO más reciente que
  --    aún exista. Si no queda ninguna carga activa, volver al año actual con
  --    mes 0 (sin mes de trabajo).
  select jsonb_build_object('anio', anio, 'mes', mes)
  into v_periodo
  from cargas
  where estado = 'activa'
  order by anio desc, mes desc
  limit 1;

  if v_periodo is null then
    v_periodo := jsonb_build_object(
      'anio', extract(year from now())::int,
      'mes', 0
    );
  end if;

  insert into config (clave, valor)
  values ('periodo_actual', v_periodo)
  on conflict (clave) do update set valor = excluded.valor;

  -- 3) Devolver el nuevo periodo_actual (y el período borrado) para refrescar la UI
  return jsonb_build_object(
    'carga_id', p_carga_id,
    'anio', v_anio,
    'mes', v_mes,
    'estado', v_estado,
    'periodo_actual', v_periodo
  );
end;
$$;

revoke execute on function public.eliminar_carga(uuid) from public, anon;
grant execute on function public.eliminar_carga(uuid) to authenticated;
