# supabase/

Scripts SQL del proyecto.

- `migrations/001_tablas.sql` — tablas e índices (PLAN.md sección 4) + `perfiles`.
- `migrations/002_rls.sql` — RLS: lectura para autenticados; escritura admin/contadora; `perfiles` y `rubros_er` solo admin.
- `migrations/003_vistas.sql` — `v_er_detalle`, `v_er_rubros`, `v_bg`, `v_er_chequeos`.
- `migrations/004_rpc_carga.sql` — RPC `procesar_carga` (transacción completa de una carga).
- `migrations/005_seeds.sql` — rubros del ER, catálogo (98 cuentas), config inicial y perfil admin.
- `aplicar_todo.sql` — las 5 migraciones concatenadas, listas para pegar en el SQL Editor de Supabase.
- `seed_catalogo_cuentas.sql` / `catalogo_cuentas.csv` — fuente original del catálogo (el contenido del .sql ya está integrado en `005_seeds.sql`).

Todas las migraciones son idempotentes: se pueden re-ejecutar sin error.
