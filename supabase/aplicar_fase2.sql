-- ============================================================
-- aplicar_fase2.sql — Migración 006 (Storage + vista historial).
-- Pegar completo en el SQL Editor de Supabase y ejecutar.
-- Idempotente: se puede re-ejecutar sin error.
-- ============================================================

-- ============================================================
-- 006_storage.sql — Bucket privado "balances" y vista de historial
-- Lectura: autenticados. Escritura: admin/contadora.
-- Los archivos reemplazados NUNCA se borran (auditoría) -> sin política de delete.
-- Idempotente.
-- ============================================================

-- Bucket privado
insert into storage.buckets (id, name, public)
values ('balances', 'balances', false)
on conflict (id) do nothing;

-- Lectura para autenticados (necesaria para descargar los originales)
drop policy if exists balances_lectura on storage.objects;
create policy balances_lectura on storage.objects
  for select to authenticated
  using (bucket_id = 'balances');

-- Subida solo admin/contadora
drop policy if exists balances_escritura on storage.objects;
create policy balances_escritura on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'balances'
    and public.rol_usuario_actual() in ('admin','contadora')
  );

-- Vista del historial de cargas con el email del usuario.
-- Sin security_invoker a propósito: corre como el dueño para poder leer
-- auth.users (solo expone el email). El acceso queda limitado a authenticated.
create or replace view v_cargas as
select
  c.id, c.anio, c.mes, c.nombre_archivo, c.storage_path,
  c.estado, c.filas_importadas, c.validaciones, c.creada_en,
  u.email as usuario_email
from cargas c
left join auth.users u on u.id = c.usuario_id;

revoke all on v_cargas from public, anon;
grant select on v_cargas to authenticated;
