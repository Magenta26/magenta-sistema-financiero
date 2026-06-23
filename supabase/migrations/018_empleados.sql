-- ============================================================
-- 018_empleados.sql — Tabla CENTRAL de empleados (la persona)
--
-- Ficha integral del empleado: base para reunir natillera, nómina, préstamos y
-- beneficios por persona. La natillera se vincula a esta tabla (empleado_id).
--
-- Datos SENSIBLES (salario, salud): RLS de escritura solo admin/contadora.
-- Lectura para cualquier autenticado. Bucket privado para las fotos (URLs
-- firmadas al mostrar).
--
-- NOTA: estas tablas de Nómina son independientes de la contabilidad
-- (movimientos / catalogo_cuentas / rubros_er / v_er_* / v_bg).
-- Idempotente.
-- ============================================================

create table if not exists empleados (
  id uuid primary key default gen_random_uuid(),
  codigo text unique not null,            -- EMP-### (auto-sugerido y editable)
  nombre_completo text not null,
  foto_url text,                          -- ruta en Storage; null => avatar de iniciales
  activo boolean not null default true,   -- vinculado a la empresa (≠ "activo en natillera")

  -- Información básica
  estado_civil text,
  es_padre boolean default false,
  num_hijos int default 0,
  esta_estudiando boolean default false,
  estudio text,                           -- carrera / tecnología
  tipo_sangre text,
  eps text,

  -- Contrato
  caja_compensacion text,
  fondo_pension text,
  tipo_contrato text,                     -- término fijo / indefinido / obra-labor, etc.
  salario numeric(18,2),
  aplica_auxilio_transporte boolean default false,  -- manual por ahora
  jornada_inicio time,
  jornada_fin time,
  equipo text,

  -- Beneficios
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

-- ── Storage: fotos de empleados (bucket privado, URLs firmadas) ──
insert into storage.buckets (id, name, public)
values ('empleados-fotos', 'empleados-fotos', false)
on conflict (id) do nothing;

-- Lectura para autenticados (para generar las URLs firmadas)
drop policy if exists empleados_fotos_lectura on storage.objects;
create policy empleados_fotos_lectura on storage.objects
  for select to authenticated
  using (bucket_id = 'empleados-fotos');

-- Subida solo admin/contadora
drop policy if exists empleados_fotos_subida on storage.objects;
create policy empleados_fotos_subida on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'empleados-fotos'
    and public.rol_usuario_actual() in ('admin','contadora')
  );

-- Reemplazo (update) solo admin/contadora
drop policy if exists empleados_fotos_update on storage.objects;
create policy empleados_fotos_update on storage.objects
  for update to authenticated
  using (bucket_id = 'empleados-fotos' and public.rol_usuario_actual() in ('admin','contadora'))
  with check (bucket_id = 'empleados-fotos' and public.rol_usuario_actual() in ('admin','contadora'));

-- Borrado solo admin/contadora
drop policy if exists empleados_fotos_borrado on storage.objects;
create policy empleados_fotos_borrado on storage.objects
  for delete to authenticated
  using (bucket_id = 'empleados-fotos' and public.rol_usuario_actual() in ('admin','contadora'));

-- ── Vínculo con la natillera (la persona vive en empleados) ──
-- El re-cableado completo de la natillera a empleados se hará en el siguiente
-- paso; por ahora solo el FK (nullable).
alter table natillera_empleados
  add column if not exists empleado_id uuid references empleados(id);
