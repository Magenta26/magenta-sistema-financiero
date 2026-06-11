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
