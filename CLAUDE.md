# Sistema Financiero Web — Magenta Farms S.A.S.

## Reglas para trabajar en este proyecto

1. **Leer `PLAN.md` antes de cualquier cambio.** Es la especificación completa del sistema; todo el trabajo se hace por fases según su sección 7.
2. **Respetar las "Decisiones ya tomadas" de la sección 9 de PLAN.md.** No reabrirlas ni proponer alternativas.
3. **Todo en español**: interfaz, mensajes de error, comentarios y documentación.
4. **Nunca poner llaves/secretos en el código fuente.** Las credenciales de Supabase viven en `.env.local` (ignorado por git) y se leen vía `import.meta.env`.
5. Al completar una fase, **registrarla al final de este archivo** en la sección "Fases completadas".

## Stack

React + Vite + TypeScript + Tailwind CSS v4 · Supabase (Postgres + Auth + Storage + RLS) · TanStack Query · React Router · SheetJS (xlsx) · Recharts.

## Fases completadas

- **Fase 0** (2026-06-11): scaffold del proyecto, configuración de Supabase, login con email/contraseña, rutas protegidas, layout con navegación lateral a las 5 secciones (placeholders) y tema oscuro ciruela/magenta.
- **Fase 1** (2026-06-11): migraciones SQL en `supabase/migrations/` (tablas e índices, RLS con función `rol_usuario_actual()`, vistas `v_er_detalle`/`v_er_rubros`/`v_bg`/`v_er_chequeos`, RPC `procesar_carga`, seeds de rubros + 98 cuentas + config + perfil admin), `supabase/aplicar_todo.sql` para aplicar de una vez, y `/consolidado` consulta `catalogo_cuentas` como verificación de lectura con RLS.
