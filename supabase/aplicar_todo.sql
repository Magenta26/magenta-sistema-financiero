-- ============================================================
-- aplicar_todo.sql — Migraciones 001-005 concatenadas en orden.
-- Pegar completo en el SQL Editor de Supabase y ejecutar.
-- Idempotente: se puede re-ejecutar sin error.
-- ============================================================

-- ============================================================
-- 001_tablas.sql — Tablas e índices (PLAN.md sección 4)
-- Idempotente: se puede re-ejecutar sin error.
-- ============================================================

-- Bitácora de cargas
create table if not exists cargas (
  id uuid primary key default gen_random_uuid(),
  anio int not null,
  mes int not null check (mes between 1 and 12),
  nombre_archivo text not null,
  storage_path text not null,            -- ruta del .xlsx en Storage
  usuario_id uuid references auth.users,
  estado text not null default 'activa' check (estado in ('activa','reemplazada')),
  filas_importadas int,
  validaciones jsonb,                    -- resultado de los chequeos al cargar
  creada_en timestamptz default now()
);
create unique index if not exists cargas_periodo_activa on cargas (anio, mes) where estado = 'activa';

-- Tabla completa del balance de prueba (TODOS los niveles)
create table if not exists movimientos (
  id bigint generated always as identity primary key,
  carga_id uuid not null references cargas(id) on delete cascade,
  anio int not null,
  mes int not null,
  nivel text not null,                   -- Clase | Grupo | Cuenta | Subcuenta | Auxiliar
  transaccional boolean not null,        -- "Sí" -> true
  cuenta text not null,                  -- código como TEXTO (preserva ceros y permite prefijos)
  nombre_cuenta text not null,
  saldo_inicial numeric(18,2) not null default 0,
  mov_debito numeric(18,2) not null default 0,
  mov_credito numeric(18,2) not null default 0,
  saldo_final numeric(18,2) not null default 0
);
create index if not exists movimientos_periodo on movimientos (anio, mes);
create index if not exists movimientos_cuenta on movimientos (cuenta);

-- Rubros del ER (líneas del estado de resultados)
create table if not exists rubros_er (
  codigo text primary key,
  nombre text not null,
  naturaleza text not null check (naturaleza in ('CR','DB')),
  orden int not null
);

-- Catálogo: la configuración que controla la contadora
create table if not exists catalogo_cuentas (
  cuenta text primary key,
  nombre text not null,
  naturaleza text not null check (naturaleza in ('CR','DB')),
  rubro_codigo text references rubros_er(codigo),
  incluir_er boolean not null default false,
  incluir_bg boolean not null default false,
  origen text not null default 'seed' check (origen in ('seed','auto','manual')),
  orden int,
  actualizada_en timestamptz default now()
);

-- Configuración general (ej.: ('periodo_actual', '{"anio": 2026, "mes": 5}'))
create table if not exists config (
  clave text primary key,
  valor jsonb not null
);

-- Roles de usuario
create table if not exists perfiles (
  user_id uuid primary key references auth.users,
  rol text not null check (rol in ('admin','contadora')),
  creado_en timestamptz default now()
);


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


-- ============================================================
-- 003_vistas.sql — Vistas del ER, BG y chequeos (PLAN.md sección 4)
-- security_invoker: las vistas respetan el RLS de las tablas base.
-- Idempotente (create or replace).
-- ============================================================

-- Línea por línea del ER, por mes.
-- Matching por prefijo sobre movimientos transaccionales;
-- valor con signo según la naturaleza de la línea del catálogo.
create or replace view v_er_detalle
with (security_invoker = true) as
select c.rubro_codigo, c.cuenta, c.nombre, c.naturaleza, m.anio, m.mes,
  sum(case when c.naturaleza = 'CR' then m.mov_credito - m.mov_debito
           else m.mov_debito - m.mov_credito end) as valor
from catalogo_cuentas c
join movimientos m on m.transaccional and m.cuenta like c.cuenta || '%'
where c.incluir_er
group by 1,2,3,4,5,6;

-- Totales por rubro (con signo según la naturaleza del rubro:
-- las líneas de naturaleza contraria restan, ej. devoluciones dentro de ING_OP).
create or replace view v_er_rubros
with (security_invoker = true) as
select d.anio, d.mes, r.codigo, r.nombre, r.orden, r.naturaleza,
  sum(case when d.naturaleza = r.naturaleza then d.valor else -d.valor end) as total
from v_er_detalle d
join rubros_er r on r.codigo = d.rubro_codigo
group by 1,2,3,4,5,6;

-- Balance General: saldos finales por mes de las clases 1, 2 y 3,
-- agrupados por Grupo (2 dígitos), sobre filas transaccionales cubiertas
-- por el catálogo con incluir_bg = true (matching por prefijo).
-- saldo_presentacion: pasivo y patrimonio en positivo (× -1).
create or replace view v_bg
with (security_invoker = true) as
select
  m.anio,
  m.mes,
  left(m.cuenta, 1) as clase,
  left(m.cuenta, 2) as grupo,
  coalesce(max(g.nombre_cuenta), left(m.cuenta, 2)) as nombre_grupo,
  sum(m.saldo_final) as saldo_final,
  sum(case when left(m.cuenta, 1) in ('2','3') then -m.saldo_final
           else m.saldo_final end) as saldo_presentacion
from movimientos m
left join movimientos g
  on g.anio = m.anio and g.mes = m.mes
 and g.cuenta = left(m.cuenta, 2) and g.nivel = 'Grupo'
where m.transaccional
  and left(m.cuenta, 1) in ('1','2','3')
  and exists (
    select 1 from catalogo_cuentas c
    where c.incluir_bg and m.cuenta like c.cuenta || '%'
  )
group by m.anio, m.mes, left(m.cuenta, 1), left(m.cuenta, 2);

-- Filas de chequeo del ER (heredadas del Excel): por mes y por grupo,
-- diferencia entre el agregado crudo de movimientos transaccionales del prefijo
-- y el total clasificado vía catálogo. Diferencia ≠ 0 => cuentas sin clasificar.
create or replace view v_er_chequeos
with (security_invoker = true) as
with grupos as (
  select * from (values
    ('41','CR'), ('42','CR'),
    ('51','DB'), ('52','DB'), ('53','DB'),
    ('71','DB'), ('72','DB'), ('73','DB')
  ) as g(grupo, naturaleza)
),
crudo as (
  select g.grupo, g.naturaleza, m.anio, m.mes,
    sum(case when g.naturaleza = 'CR' then m.mov_credito - m.mov_debito
             else m.mov_debito - m.mov_credito end) as total_crudo
  from grupos g
  join movimientos m on m.transaccional and m.cuenta like g.grupo || '%'
  group by 1,2,3,4
),
clasificado as (
  select g.grupo, d.anio, d.mes,
    sum(case when d.naturaleza = g.naturaleza then d.valor else -d.valor end) as total_clasificado
  from grupos g
  join v_er_detalle d on d.cuenta like g.grupo || '%'
  group by 1,2,3
)
select
  c.anio, c.mes, c.grupo, c.naturaleza,
  c.total_crudo,
  coalesce(k.total_clasificado, 0) as total_clasificado,
  c.total_crudo - coalesce(k.total_clasificado, 0) as diferencia
from crudo c
left join clasificado k
  on k.grupo = c.grupo and k.anio = c.anio and k.mes = c.mes;


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


-- ============================================================
-- 005_seeds.sql — Datos semilla
-- Rubros del ER, catálogo de cuentas (98), config inicial y perfil admin.
-- Idempotente (on conflict).
-- ============================================================

-- ---------- Rubros del ER (PLAN.md sección 4, en este orden) ----------
insert into rubros_er (codigo, nombre, naturaleza, orden) values
  ('ING_OP',     'Ingresos operacionales',              'CR', 10),
  ('COSTO_MP',   'Costo: materias primas e insumos',    'DB', 20),
  ('COSTO_PER',  'Costo: personal de producción',       'DB', 30),
  ('COSTO_SER',  'Costo: servicios y otros',            'DB', 40),
  ('GASTO_ADM',  'Gastos de administración',            'DB', 50),
  ('GASTO_VTA',  'Gastos de ventas',                    'DB', 60),
  ('ING_NOOP',   'Ingresos no operacionales',           'CR', 70),
  ('GASTO_NOOP', 'Gastos no operacionales',             'DB', 80)
on conflict (codigo) do update set
  nombre = excluded.nombre, naturaleza = excluded.naturaleza, orden = excluded.orden;

-- ---------- Catálogo de cuentas (contenido de seed_catalogo_cuentas.sql) ----------
-- Seed del catálogo de cuentas de Magenta Farms S.A.S
-- Generado desde la hoja MAGENTA de Balance_auomatico.xlsx
-- 98 cuentas del Estado de Resultados con su naturaleza y rubro

insert into catalogo_cuentas (cuenta, nombre, naturaleza, rubro_codigo, incluir_er, incluir_bg, orden) values
  ('41052501', 'VENTAS EXPORTACIONES', 'CR', 'ING_OP', true, false, 10),
  ('41052502', 'VENTAS A C.I.', 'CR', 'ING_OP', true, false, 20),
  ('41052503', 'VENTAS GRAVADAS', 'CR', 'ING_OP', true, false, 30),
  ('41750501', 'DEVOLUCIONES EN VENTAS', 'DB', 'ING_OP', true, false, 40),
  ('71010505', 'ABONOS, FERTILIZANTES, SUMINIS', 'DB', 'COSTO_MP', true, false, 50),
  ('71011005', 'PRODUCTOS QUIMICOS', 'DB', 'COSTO_MP', true, false, 60),
  ('71011501', 'FOMIDUCTO', 'DB', 'COSTO_MP', true, false, 70),
  ('71011505', 'MATERIALES REPUESTOS Y ACCESOR', 'DB', 'COSTO_MP', true, false, 80),
  ('71011506', 'MATERIALES REPUESTOS Y ACC M1', 'DB', 'COSTO_MP', true, false, 90),
  ('71012005', 'COMPRA DE FLOR', 'DB', 'COSTO_MP', true, false, 100),
  ('71020505', 'CARTON', 'DB', 'COSTO_MP', true, false, 110),
  ('71020510', 'OTROS ELEMENTOS DE EMPAQUE', 'DB', 'COSTO_MP', true, false, 120),
  ('71020511', 'OTROS ELEMENTOS DE EMPAQUE    M1', 'DB', 'COSTO_MP', true, false, 130),
  ('71020515', 'ETIQUETAS', 'DB', 'COSTO_MP', true, false, 140),
  ('71021005', 'CAPUCHONES', 'DB', 'COSTO_MP', true, false, 150),
  ('71021505', 'ZUNCHOS', 'DB', 'COSTO_MP', true, false, 160),
  ('71021510', 'CINTA', 'DB', 'COSTO_MP', true, false, 170),
  ('71022005', 'TINTURA PARA FLORES', 'DB', 'COSTO_MP', true, false, 180),
  ('71022010', 'ALIMENTO PARA FLORES', 'DB', 'COSTO_MP', true, false, 190),
  ('71150505', 'IVA MAYOR VALOR DEL COSTO', 'DB', 'COSTO_MP', true, false, 200),
  ('71200501', 'COSTO INVENTARIO FINAL', 'DB', 'COSTO_MP', true, false, 210),
  ('71350501', 'CERTIFICADOS DE ORIGEN', 'DB', 'COSTO_MP', true, false, 220),
  ('72050601', 'SUELDOS', 'DB', 'COSTO_PER', true, false, 230),
  ('72051501', 'HORAS EXTRAS Y RECARGOS', 'DB', 'COSTO_PER', true, false, 240),
  ('72052401', 'INCAPACIDADES', 'DB', 'COSTO_PER', true, false, 250),
  ('72052701', 'AUXILIO DE TRANSPORTE', 'DB', 'COSTO_PER', true, false, 260),
  ('72053001', 'CESANTIAS', 'DB', 'COSTO_PER', true, false, 270),
  ('72053301', 'INTERESES CESANTIAS', 'DB', 'COSTO_PER', true, false, 280),
  ('72053601', 'PRIMA DE SERVICIOS', 'DB', 'COSTO_PER', true, false, 290),
  ('72053901', 'VACACIONES', 'DB', 'COSTO_PER', true, false, 300),
  ('72054801', 'BONIFICACIONES', 'DB', 'COSTO_PER', true, false, 310),
  ('720551', 'DOTACION Y SUMINISTROS TRABAJA', 'DB', 'COSTO_PER', true, false, 320),
  ('72056001', 'INDEMNIZACION', 'DB', 'COSTO_PER', true, false, 330),
  ('72056801', 'ARP', 'DB', 'COSTO_PER', true, false, 340),
  ('72056806', 'APORET A SALUD', 'DB', 'COSTO_PER', true, false, 350),
  ('72057001', 'APORTES FONDOS DE PENSIONES', 'DB', 'COSTO_PER', true, false, 360),
  ('72057201', 'APORTES CAJA DE COMPENSACION', 'DB', 'COSTO_PER', true, false, 370),
  ('72058405', 'GASTOS MEDICOS', 'DB', 'COSTO_PER', true, false, 380),
  ('72058410', 'HOSPEDAJE EMPLEADOS', 'DB', 'COSTO_PER', true, false, 390),
  ('72059505', 'OTROS', 'DB', 'COSTO_PER', true, false, 400),
  ('73050501', 'COSTOS ICA', 'DB', 'COSTO_SER', true, false, 410),
  ('73351006', 'TEMPORALES EMPLEADOS', 'DB', 'COSTO_SER', true, false, 420),
  ('73351505', 'ASISTENCIA TECNICA', 'DB', 'COSTO_SER', true, false, 430),
  ('73351506', 'MONITOREO', 'DB', 'COSTO_SER', true, false, 440),
  ('73353005', 'ENERGIA ELECTRICA CULTIVOS', 'DB', 'COSTO_SER', true, false, 450),
  ('73355005', 'TRANSPORTE', 'DB', 'COSTO_SER', true, false, 460),
  ('7395', 'OTROS SERVICIOS', 'DB', 'COSTO_SER', true, false, 470),
  ('5105', 'GASTOS DE PERSONAL ADMINISTRATIVO', 'DB', 'GASTO_ADM', true, false, 480),
  ('51101505', 'GTO ASESORIA ADMINISTRATIVA', 'DB', 'GASTO_ADM', true, false, 490),
  ('51100505', 'HONORARIOS JUNTA DIRECTIVA', 'DB', 'GASTO_ADM', true, false, 500),
  ('51103005', 'GTO ASESORIA CONTABLE FINANCIE', 'DB', 'GASTO_ADM', true, false, 510),
  ('51103505', 'GASTO ASESORIA SST', 'DB', 'GASTO_ADM', true, false, 520),
  ('51150501', 'IM PREDIAL UNIFICADO', 'DB', 'GASTO_ADM', true, false, 530),
  ('51151505', 'DOCUMENTOS DE EXPORTACION', 'DB', 'GASTO_ADM', true, false, 540),
  ('51157005', 'IVA DESCONTABLE', 'DB', 'GASTO_ADM', true, false, 550),
  ('51201001', 'ARRENDAMIENTO', 'DB', 'GASTO_ADM', true, false, 560),
  ('51204005', 'FLOTA Y EQUIPO DE TRANSPORTE', 'DB', 'GASTO_ADM', true, false, 570),
  ('51201505', 'ARRENDAMIENTO MAQUINARIA Y EQU', 'DB', 'GASTO_ADM', true, false, 580),
  ('51251001', 'AFILIACIONES Y SOSTENIMIENTO', 'DB', 'GASTO_ADM', true, false, 590),
  ('51351005', 'TEMPORALES', 'DB', 'GASTO_ADM', true, false, 600),
  ('51350501', 'ASEO Y VIGILANCIA', 'DB', 'GASTO_ADM', true, false, 610),
  ('51351501', 'ASISTENCIA TECNICA', 'DB', 'GASTO_ADM', true, false, 620),
  ('51352001', 'PROCESAMIENTO ELECTRONICO DATO', 'DB', 'GASTO_ADM', true, false, 630),
  ('51353005', 'ENERGIA ELECTRICA', 'DB', 'GASTO_ADM', true, false, 640),
  ('51354005', 'CORREO Y TELEGRAMAS', 'DB', 'GASTO_ADM', true, false, 650),
  ('51355005', 'TRANSPORTES FLETES Y ACARREOS', 'DB', 'GASTO_ADM', true, false, 660),
  ('51355505', 'INTERNET', 'DB', 'GASTO_ADM', true, false, 670),
  ('51359501', 'MANEJO DE REDES SOCIALES', 'DB', 'GASTO_ADM', true, false, 680),
  ('51359505', 'OTROS SERVICIOS', 'DB', 'GASTO_ADM', true, false, 690),
  ('514010', 'GASTOS LEGALES- NOTARIALES', 'DB', 'GASTO_ADM', true, false, 700),
  ('5145', 'Mantenimiento y reparaciones', 'DB', 'GASTO_ADM', true, false, 710),
  ('51501005', 'ADECUACION COMERCIALIZADORA', 'DB', 'GASTO_ADM', true, false, 720),
  ('515515', 'GASTOS DE VIAJE', 'DB', 'GASTO_ADM', true, false, 730),
  ('51601005', 'GTO DE MAQUINARIA Y EQUIPO', 'DB', 'GASTO_ADM', true, false, 740),
  ('51952005', 'GTOS DE REPRESEN Y REL. PUBLIC', 'DB', 'GASTO_ADM', true, false, 750),
  ('519525', 'ELEMENTOS DE ASEO Y CAFETERIA', 'DB', 'GASTO_ADM', true, false, 760),
  ('519530', 'UTILES, PAPELERIA, FOTOCOPIAS', 'DB', 'GASTO_ADM', true, false, 770),
  ('519535', 'COMBUSTIBLES Y LUBRICANTES', 'DB', 'GASTO_ADM', true, false, 780),
  ('519560', 'CASINO Y RESTAURANTE', 'DB', 'GASTO_ADM', true, false, 790),
  ('519565', 'PEAJES Y PARQUEADEROS', 'DB', 'GASTO_ADM', true, false, 800),
  ('51959501', 'ACTIVOS MENORES', 'DB', 'GASTO_ADM', true, false, 810),
  ('51959502', 'GASTOS BRAHIAN', 'DB', 'GASTO_ADM', true, false, 820),
  ('51959504', 'OTROS', 'DB', 'GASTO_ADM', true, false, 830),
  ('52', 'GASTOS DE VENTAS', 'DB', 'GASTO_VTA', true, false, 840),
  ('42100505', 'INTERESES FINANCIEROS', 'CR', 'ING_NOOP', true, false, 850),
  ('42102005', 'DIFERENCIA EN CAMBIO', 'CR', 'ING_NOOP', true, false, 860),
  ('425030', 'DESCUENTOS CONCEDIDOS', 'CR', 'ING_NOOP', true, false, 870),
  ('42505005', 'REINTEGRO DE GASTO DE PERSONAL', 'CR', 'ING_NOOP', true, false, 880),
  ('42958105', 'AJUSTE AL PESO', 'CR', 'ING_NOOP', true, false, 890),
  ('53050505', 'GASTOS BANCARIOS', 'DB', 'GASTO_NOOP', true, false, 900),
  ('53051505', 'COMISIONES FINANCIERAS', 'DB', 'GASTO_NOOP', true, false, 910),
  ('53052005', 'INTERESES', 'DB', 'GASTO_NOOP', true, false, 920),
  ('53052505', 'PERDIDA DIFERENCIA CAMBIO', 'DB', 'GASTO_NOOP', true, false, 930),
  ('53054005', 'COSTO TRANSFERENCIA BANCARIA', 'DB', 'GASTO_NOOP', true, false, 940),
  ('53059505', 'GRAVAMEN MVTO BANCARIO', 'DB', 'GASTO_NOOP', true, false, 950),
  ('53152005', 'IMPUESTOS ASUMIDOS', 'DB', 'GASTO_NOOP', true, false, 960),
  ('53958105', 'DONACION', 'DB', 'GASTO_NOOP', true, false, 970),
  ('53959501', 'OTROS GASTOS DIVERDOS NO OPERA', 'DB', 'GASTO_NOOP', true, false, 980)
on conflict (cuenta) do update set
  naturaleza = excluded.naturaleza, rubro_codigo = excluded.rubro_codigo, orden = excluded.orden;

-- ---------- Config inicial ----------
-- mes 0 = "aún no se ha cargado ningún período"; no se sobreescribe si ya existe.
insert into config (clave, valor)
values ('periodo_actual', '{"anio": 2026, "mes": 0}'::jsonb)
on conflict (clave) do nothing;

-- ---------- Perfil admin ----------
insert into perfiles (user_id, rol)
select id, 'admin'
from auth.users
where email = 'finanzasmagentassystems@gmail.com'
on conflict (user_id) do update set rol = 'admin';


