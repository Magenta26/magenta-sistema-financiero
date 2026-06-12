# Sistema Financiero Web — Magenta Farms S.A.S.

## Reglas para trabajar en este proyecto

1. **Leer `PLAN.md` antes de cualquier cambio.** Es la especificación completa del sistema; todo el trabajo se hace por fases según su sección 7.
2. **Respetar las "Decisiones ya tomadas" de la sección 9 de PLAN.md.** No reabrirlas ni proponer alternativas.
3. **Todo en español**: interfaz, mensajes de error, comentarios y documentación.
4. **Nunca poner llaves/secretos en el código fuente.** Las credenciales de Supabase viven en `.env.local` (ignorado por git) y se leen vía `import.meta.env`.
5. Al completar una fase, **registrarla al final de este archivo** en la sección "Fases completadas".

## Decisión de diseño: tema claro con identidad Magenta (2026-06-11)

Paleta clara tipo SaaS financiero con los colores reales de la marca (tokens en `@theme` de `src/index.css` — usarlos siempre, nada de colores sueltos):

- `brand-900` #501040 (ciruela profundo: títulos, alta jerarquía) · `brand-700` #7A1B5C (magenta principal: botones primarios, links, activos, focos) · `brand-500` #A03080 (hovers, acentos, gráficos) · `brand-200` #D090B0 (badges, fills suaves, seleccionados) · `brand-50` #FAF2F7 (hover de filas, paneles destacados)
- Neutros: `fondo` #F6F7F9 (fondo de la app), blanco para tarjetas, `borde` #E5E7EB, `tinta` #1F2430 (texto), `tinta-suave` #6B7280 (texto secundario)
- Semánticos (solo validaciones/badges): `exito` #2E8B57 (verde hoja del logo), ámbar y rojo de Tailwind
- Logo en `src/assets/Logo.png` (login, sidebar) y `public/favicon.png`. Negativos en rojo entre paréntesis, números con `tabular-nums`, transiciones de 150 ms.

## Stack

React + Vite + TypeScript + Tailwind CSS v4 · Supabase (Postgres + Auth + Storage + RLS) · TanStack Query · React Router · SheetJS (xlsx) · Recharts.

## Fases completadas

- **Fase 0** (2026-06-11): scaffold del proyecto, configuración de Supabase, login con email/contraseña, rutas protegidas, layout con navegación lateral a las 5 secciones (placeholders) y tema oscuro ciruela/magenta.
- **Fase 1** (2026-06-11): migraciones SQL en `supabase/migrations/` (tablas e índices, RLS con función `rol_usuario_actual()`, vistas `v_er_detalle`/`v_er_rubros`/`v_bg`/`v_er_chequeos`, RPC `procesar_carga`, seeds de rubros + 98 cuentas + config + perfil admin), `supabase/aplicar_todo.sql` para aplicar de una vez, y `/consolidado` consulta `catalogo_cuentas` como verificación de lectura con RLS.
- **Fase 2** (2026-06-11): módulo de carga completo. Parser SIIGO (`src/lib/parserSiigo.ts`) con columnas por nombre normalizado, detección de período y corrección del rango XML defectuoso de los exports de SIIGO (declaran `<dimension>` de una sola columna); validado contra balances reales de Ene–Abr 2026 con ingresos exactos a la sección 8 del PLAN. Validaciones ⛔/⚠️/ℹ️ (`src/lib/validaciones.ts`), pantalla `/cargas` (dropzone, previsualización con período corregible, aviso de reemplazo, confirmación vía RPC + Storage, historial con descarga), migración `006_storage.sql` (bucket privado `balances` + vista `v_cargas`) y tests unitarios con vitest (`npm test`).
- **Fase 3** (2026-06-11): consolidado interactivo. Tabla del catálogo con valor YTD por prefijo (clases 1-3: saldo final del último mes), rubro editable y checks ER/BG con optimistic update + toast (toda edición pasa `origen` a `manual`), invariante anti-doble-conteo validada en cliente (`conflictoEr`), filtros (texto/clase/pendientes), banner y contadores, detalle expandible mes a mes, orden por cuenta o valor. Lógica en `src/lib/consolidado.ts` con tests.
- **Fase 4** (2026-06-11): Estado de Resultados y Balance General. `/estado-resultados`: matriz Ene–Dic + total año, rubros colapsables, derivadas (TOTAL INGRESOS/COSTO, UTILIDADES BRUTA/OPERACIONAL/NETA), modos Absolutos/Vertical/Horizontal, chequeos por grupo desde `v_er_chequeos`, export Excel. `/balance-general`: secciones por grupo, resultado del ejercicio acumulado, fila de cuadre con tolerancia $1, export Excel. Lógica pura en `src/lib/estadoResultados.ts` y `balanceGeneral.ts` con tests. Verificación contra PLAN.md sección 8: local exacta al centavo (Ene–Abr con catálogo semilla, `scripts/verificar_seccion8_local.ts`) y script contra la base (`scripts/verificar_fase4.ts`, requiere VERIF_EMAIL/VERIF_PASSWORD).
- **Fase 5** (2026-06-11): análisis financiero en `/analisis`. KPIs del período de trabajo con selector de mes (ingresos, utilidades bruta/operacional/neta con margen, variación vs mes anterior y vs promedio, acumulado del año), panel determinístico "Lectura del mes", gráficos Recharts (tendencia mensual con barras+línea, evolución de márgenes, donuts de costo y gastos con top cuentas en tooltip, top 10 variaciones en barras divergentes magenta/teal), drill-down rubro → cuenta → auxiliar con barras de participación, responsive. Lógica pura en `src/lib/analisis.ts` con tests.
- **Rediseño visual** (2026-06-11): tema claro con identidad Magenta y logo (ver "Decisión de diseño" arriba). Solo estilos; cero cambios funcionales.
- **Análisis: vistas de período + EBITDA** (2026-06-12): `/analisis` con segmented control Mensual | Trimestral (últimos 2 años con datos, Q parciales marcados con *) | Anual (últimos 5 años) que recontextualiza KPIs, gráficos, lectura y drill-down (`src/lib/analisis.ts` reescrito sobre `PeriodoAgregado`). 5 tarjetas KPI: Ingresos, Utilidad bruta, Total gastos (ADM+VTA, variación al alza en rojo), Utilidad neta y EBITDA. **EBITDA** = utilidad operacional + D&A; las cuentas D&A se identifican por prefijo PUC (5160, 5165, 5260, 5265, 7360) o por nombre con "depreciaci"/"amortizaci" (sin tildes) en clases 5 y 7 — con el catálogo semilla solo califica `51601005 GTO DE MAQUINARIA Y EQUIPO` (prefijo 5160 = Depreciaciones); las cuentas nuevas se suman solas y la lista vigente se muestra en el tooltip ⓘ de la tarjeta. Nueva dona "Composición de las ventas" (cuentas de ING_OP; las contra-cuentas como devoluciones no se grafican), tres donas alineadas en una fila.
- **BG: modo Variación del mes** (2026-06-12): migración `007_v_bg_variacion.sql` agrega `saldo_inicial` y `variacion_presentacion` a `v_bg` (al final, compatible con `create or replace view`). Toggle Saldos | Variación del mes en `/balance-general`: variación = saldo final − saldo inicial del mes con signo de presentación, columna Total año (= saldo final último mes − saldo inicial de enero, verificado por test), cuadre de variación contra la utilidad neta mensual del ER, export respeta el modo. El ER no se tocó.
