-- ============================================================
-- 007_v_bg_variacion.sql — v_bg con saldo inicial y variación del mes
-- Agrega DOS columnas al final de v_bg (create or replace view permite
-- añadir columnas al final sin tocar las existentes):
--   saldo_inicial: suma de saldos iniciales del grupo en el mes.
--   variacion_presentacion: saldo_final − saldo_inicial del mes, con el
--     signo del efecto en la posición (aumento de activo positivo;
--     aumento de pasivo/patrimonio mostrado como aumento: × −1).
-- Idempotente.
-- ============================================================

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
           else m.saldo_final end) as saldo_presentacion,
  sum(m.saldo_inicial) as saldo_inicial,
  sum(case when left(m.cuenta, 1) in ('2','3') then -(m.saldo_final - m.saldo_inicial)
           else (m.saldo_final - m.saldo_inicial) end) as variacion_presentacion
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
