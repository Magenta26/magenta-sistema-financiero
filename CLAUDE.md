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
- **Fase 2** (2026-06-11): módulo de carga completo. Parser SIIGO (`src/lib/parserSiigo.ts`) con columnas por nombre normalizado, detección de período y corrección del rango XML defectuoso de los exports de SIIGO (declaran `<dimension>` de una sola columna); validado contra balances reales de Ene–Abr 2026 con ingresos exactos a la sección 8 del PLAN. Validaciones ⛔/⚠️/ℹ️ (`src/lib/validaciones.ts`), pantalla `/cargas` (dropzone, previsualización con período corregible, aviso de reemplazo, confirmación vía RPC + Storage, historial con descarga), migración `006_storage.sql` (bucket privado `balances` + vista `v_cargas`) y tests unitarios con vitest (`npm test`).
- **Fase 3** (2026-06-11): consolidado interactivo. Tabla del catálogo con valor YTD por prefijo (clases 1-3: saldo final del último mes), rubro editable y checks ER/BG con optimistic update + toast (toda edición pasa `origen` a `manual`), invariante anti-doble-conteo validada en cliente (`conflictoEr`), filtros (texto/clase/pendientes), banner y contadores, detalle expandible mes a mes, orden por cuenta o valor. Lógica en `src/lib/consolidado.ts` con tests.
