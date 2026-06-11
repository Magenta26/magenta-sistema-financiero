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
