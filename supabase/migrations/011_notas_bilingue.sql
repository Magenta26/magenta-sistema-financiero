-- ============================================================
-- 011_notas_bilingue.sql — Notas financieras bilingües (ES/EN manuales)
-- La columna 'contenido' existente pasa a ser la versión en ESPAÑOL.
-- Se agrega 'contenido_en' para la versión en INGLÉS (independiente).
-- Ambas se escriben a mano; ninguna se traduce automáticamente.
-- Idempotente; NO borra datos existentes.
-- ============================================================

alter table notas_financieras
  add column if not exists contenido_en text not null default '';

-- Vista con ambas versiones + el email de quien actualizó (la columna nueva
-- se agrega al final para que create or replace view sea válido).
create or replace view v_notas_financieras as
select
  n.anio, n.mes, n.contenido, n.actualizada_en, n.actualizada_por,
  u.email as actualizada_por_email,
  n.contenido_en
from notas_financieras n
left join auth.users u on u.id = n.actualizada_por;

revoke all on v_notas_financieras from public, anon;
grant select on v_notas_financieras to authenticated;
