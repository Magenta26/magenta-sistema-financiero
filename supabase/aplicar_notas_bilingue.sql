-- ============================================================
-- aplicar_notas_bilingue.sql — Migración 011 (Notas financieras bilingües).
-- Pegar completo en el SQL Editor de Supabase y ejecutar.
-- Idempotente: se puede re-ejecutar sin error y NO borra datos.
-- (Si la columna contenido_en ya existía de un intento previo, no se duplica.)
-- ============================================================

-- ============================================================
-- 011_notas_bilingue.sql — Notas financieras bilingües (ES/EN manuales)
-- La columna 'contenido' existente es la versión en ESPAÑOL.
-- Se agrega 'contenido_en' para la versión en INGLÉS (independiente).
-- Ambas se escriben a mano; ninguna se traduce automáticamente.
--
-- A prueba de nulos: ambas columnas quedan NOT NULL DEFAULT '' y se hace
-- backfill de cualquier null heredado a '' — así el frontend nunca recibe
-- undefined/null (causa del crash anterior en .trim()).
--
-- Idempotente; NO borra datos existentes.
-- ============================================================

-- 1) Columna inglesa (no falla si ya existe por una aplicación previa).
alter table notas_financieras
  add column if not exists contenido_en text not null default '';

-- 2) Garantizar default '' también en la columna española (definida así desde
--    009, pero lo reafirmamos por idempotencia) y backfill de nulos.
alter table notas_financieras alter column contenido set default '';
alter table notas_financieras alter column contenido_en set default '';
update notas_financieras set contenido = '' where contenido is null;
update notas_financieras set contenido_en = '' where contenido_en is null;

-- 3) Vista con ambas versiones + el email de quien actualizó. La columna nueva
--    se agrega al final para que create or replace view sea válido.
create or replace view v_notas_financieras as
select
  n.anio, n.mes, n.contenido, n.actualizada_en, n.actualizada_por,
  u.email as actualizada_por_email,
  n.contenido_en
from notas_financieras n
left join auth.users u on u.id = n.actualizada_por;

revoke all on v_notas_financieras from public, anon;
grant select on v_notas_financieras to authenticated;
