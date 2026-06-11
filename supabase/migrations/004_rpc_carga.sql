-- ============================================================
-- 004_rpc_carga.sql — RPC procesar_carga (PLAN.md sección 5, punto 4)
-- Ejecuta TODO el flujo de confirmación de una carga en UNA transacción
-- (una función plpgsql es atómica: si algo falla, se revierte todo).
-- SECURITY DEFINER con chequeo interno de rol admin/contadora.
-- Idempotente (create or replace).
-- ============================================================

create or replace function public.procesar_carga(
  p_anio int,
  p_mes int,
  p_nombre_archivo text,
  p_storage_path text,
  p_filas jsonb,
  p_validaciones jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rol text;
  v_carga_id uuid;
  v_filas_importadas int;
  v_cuentas_nuevas int;
begin
  -- Chequeo interno de rol (la función corre con privilegios del dueño)
  select rol into v_rol from perfiles where user_id = auth.uid();
  if v_rol is null or v_rol not in ('admin','contadora') then
    raise exception 'No autorizado: se requiere rol admin o contadora.';
  end if;

  if p_mes is null or p_mes < 1 or p_mes > 12 then
    raise exception 'Mes inválido: %', p_mes;
  end if;
  if p_filas is null or jsonb_typeof(p_filas) <> 'array' or jsonb_array_length(p_filas) = 0 then
    raise exception 'El parámetro filas debe ser un arreglo JSON no vacío.';
  end if;

  -- 1) Marcar la carga anterior del período como reemplazada
  --    y borrar sus movimientos (la fila de la carga se conserva: auditoría).
  delete from movimientos m
  using cargas c
  where m.carga_id = c.id and c.anio = p_anio and c.mes = p_mes;

  update cargas
  set estado = 'reemplazada'
  where anio = p_anio and mes = p_mes and estado = 'activa';

  -- 2) Insertar la nueva carga y todos sus movimientos (todos los niveles)
  insert into cargas (anio, mes, nombre_archivo, storage_path, usuario_id, validaciones)
  values (p_anio, p_mes, p_nombre_archivo, p_storage_path, auth.uid(), p_validaciones)
  returning id into v_carga_id;

  insert into movimientos
    (carga_id, anio, mes, nivel, transaccional, cuenta, nombre_cuenta,
     saldo_inicial, mov_debito, mov_credito, saldo_final)
  select
    v_carga_id, p_anio, p_mes,
    f->>'nivel',
    coalesce((f->>'transaccional')::boolean, false),
    f->>'cuenta',
    coalesce(f->>'nombre_cuenta', ''),
    coalesce((f->>'saldo_inicial')::numeric, 0),
    coalesce((f->>'mov_debito')::numeric, 0),
    coalesce((f->>'mov_credito')::numeric, 0),
    coalesce((f->>'saldo_final')::numeric, 0)
  from jsonb_array_elements(p_filas) f;

  get diagnostics v_filas_importadas = row_count;

  update cargas set filas_importadas = v_filas_importadas where id = v_carga_id;

  -- 3) Sincronizar catálogo (nunca borrar):
  --    a) actualizar nombres de los códigos ya existentes (cualquier nivel)
  update catalogo_cuentas c
  set nombre = m.nombre_cuenta, actualizada_en = now()
  from movimientos m
  where m.carga_id = v_carga_id
    and m.cuenta = c.cuenta
    and m.nombre_cuenta <> ''
    and m.nombre_cuenta is distinct from c.nombre;

  --    b) auto-insertar cuentas transaccionales nuevas que NO estén ya
  --       cubiertas por un código del catálogo (matching por prefijo,
  --       respeta la invariante anti-doble-conteo).
  --       Clases 1-3: incluir_bg = true. Clases 4-7: pendientes de clasificar.
  insert into catalogo_cuentas
    (cuenta, nombre, naturaleza, rubro_codigo, incluir_er, incluir_bg, origen)
  select distinct on (m.cuenta)
    m.cuenta,
    m.nombre_cuenta,
    case when left(m.cuenta, 1) in ('2','3','4') then 'CR' else 'DB' end,
    null,
    false,
    left(m.cuenta, 1) in ('1','2','3'),
    'auto'
  from movimientos m
  where m.carga_id = v_carga_id
    and m.transaccional
    and not exists (
      select 1 from catalogo_cuentas c
      where m.cuenta like c.cuenta || '%'
    )
  order by m.cuenta;

  get diagnostics v_cuentas_nuevas = row_count;

  -- 4) Actualizar config.periodo_actual solo si el período cargado es >= al actual
  insert into config (clave, valor)
  values ('periodo_actual', jsonb_build_object('anio', p_anio, 'mes', p_mes))
  on conflict (clave) do update
  set valor = excluded.valor
  where (config.valor->>'anio')::int * 100 + (config.valor->>'mes')::int
        <= p_anio * 100 + p_mes;

  return jsonb_build_object(
    'carga_id', v_carga_id,
    'filas_importadas', v_filas_importadas,
    'cuentas_nuevas', v_cuentas_nuevas
  );
end;
$$;

revoke execute on function public.procesar_carga(int, int, text, text, jsonb, jsonb) from public, anon;
grant execute on function public.procesar_carga(int, int, text, text, jsonb, jsonb) to authenticated;
