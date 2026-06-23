-- ============================================================
-- aplicar_empleados.sql — Migración 018 (tabla central de empleados).
-- Pegar completo en el SQL Editor de Supabase y ejecutar.
-- Idempotente: se puede re-ejecutar sin error y NO borra datos.
--
-- Crea la tabla `empleados` (ficha integral, datos sensibles), el bucket privado
-- 'empleados-fotos' (lectura authenticated; subir/reemplazar/borrar solo
-- admin/contadora) y el FK natillera_empleados.empleado_id (nullable).
-- ============================================================

create table if not exists empleados (
  id uuid primary key default gen_random_uuid(),
  codigo text unique not null,
  nombre_completo text not null,
  foto_url text,
  activo boolean not null default true,

  estado_civil text,
  es_padre boolean default false,
  num_hijos int default 0,
  esta_estudiando boolean default false,
  estudio text,
  tipo_sangre text,
  eps text,

  caja_compensacion text,
  fondo_pension text,
  tipo_contrato text,
  salario numeric(18,2),
  aplica_auxilio_transporte boolean default false,
  jornada_inicio time,
  jornada_fin time,
  equipo text,

  beneficio_lentes boolean default false,

  creado_en timestamptz default now(),
  actualizado_en timestamptz default now(),
  actualizado_por uuid references auth.users
);

alter table empleados enable row level security;

drop policy if exists empleados_select on empleados;
create policy empleados_select on empleados
  for select to authenticated using (true);

drop policy if exists empleados_insert on empleados;
create policy empleados_insert on empleados
  for insert to authenticated
  with check (public.rol_usuario_actual() in ('admin','contadora'));

drop policy if exists empleados_update on empleados;
create policy empleados_update on empleados
  for update to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora'))
  with check (public.rol_usuario_actual() in ('admin','contadora'));

drop policy if exists empleados_delete on empleados;
create policy empleados_delete on empleados
  for delete to authenticated
  using (public.rol_usuario_actual() in ('admin','contadora'));

-- Storage: fotos de empleados (bucket privado, URLs firmadas).
insert into storage.buckets (id, name, public)
values ('empleados-fotos', 'empleados-fotos', false)
on conflict (id) do nothing;

drop policy if exists empleados_fotos_lectura on storage.objects;
create policy empleados_fotos_lectura on storage.objects
  for select to authenticated
  using (bucket_id = 'empleados-fotos');

drop policy if exists empleados_fotos_subida on storage.objects;
create policy empleados_fotos_subida on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'empleados-fotos'
    and public.rol_usuario_actual() in ('admin','contadora')
  );

drop policy if exists empleados_fotos_update on storage.objects;
create policy empleados_fotos_update on storage.objects
  for update to authenticated
  using (bucket_id = 'empleados-fotos' and public.rol_usuario_actual() in ('admin','contadora'))
  with check (bucket_id = 'empleados-fotos' and public.rol_usuario_actual() in ('admin','contadora'));

drop policy if exists empleados_fotos_borrado on storage.objects;
create policy empleados_fotos_borrado on storage.objects
  for delete to authenticated
  using (bucket_id = 'empleados-fotos' and public.rol_usuario_actual() in ('admin','contadora'));

-- Vínculo con la natillera (solo el FK por ahora).
alter table natillera_empleados
  add column if not exists empleado_id uuid references empleados(id);
