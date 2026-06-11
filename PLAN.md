# Sistema Financiero Web — Magenta Farms S.A.S.

> Especificación técnica para construir con Claude Code.
> Empresa: Magenta Farms S.A.S. (NIT 901.479.899-9), exportadora de flores, Colombia.
> Fuente de datos: balances de prueba mensuales exportados de SIIGO en formato `.xlsx`.

---

## 1. Objetivo

Aplicación web donde la contadora sube el balance de prueba mensual de SIIGO y el sistema:
1. Lo consolida en una base de datos única (una fila por cuenta × mes).
2. Le permite controlar con checkboxes qué cuentas entran al Estado de Resultados (ER) y al Balance General (BG), partiendo de una configuración por defecto ya sembrada.
3. Genera el ER y el BG del año automáticamente.
4. Alimenta un módulo de análisis financiero dinámico (gráficos, KPIs, tendencias) que se refresca solo con cada carga.

Proceso continuo: cargar un mes nuevo o re-cargar un mes anterior actualiza todo en cadena sin intervención manual.

## 2. Stack

| Capa | Tecnología |
|---|---|
| Frontend | React + Vite + TypeScript + Tailwind CSS |
| Gráficos | Recharts (o ECharts si se necesita más potencia) |
| Lectura de .xlsx | SheetJS (`xlsx`) en el navegador, con previsualización antes de confirmar |
| Backend | Supabase: Postgres + Auth + Storage + RLS |
| Hosting | Netlify, deploy automático desde GitHub (repo privado) |
| Estado/datos | `@supabase/supabase-js` + TanStack Query |

Sin servidores propios. Todo cabe en planes gratuitos.

## 3. Formato del archivo fuente (SIIGO)

Excel con metadatos en las primeras filas y una tabla cuyo encabezado está típicamente en la fila 8:

```
Fila 2: "Balance de prueba general"
Fila 3: "MAGENTA FARMS S.A.S"
Fila 4: "901479899-9"
Fila 5: "De {Mes} {Año} a {Mes} {Año}"     ← período del balance
Fila 8: encabezados de la tabla
Fila 9+: datos
```

Columnas de la tabla (los NOMBRES son estables; las POSICIONES no):
`Nivel` · `Transaccional` · `Código cuenta contable` · `Nombre cuenta contable` · `Saldo inicial` · `Movimiento débito` · `Movimiento crédito` · `Saldo final`

A veces aparece una columna extra `Control` al inicio (verificado: los archivos de Ene–Abr 2026 la traen; el de Mayo 2026 no). **Regla de oro del parser: detectar columnas por nombre de encabezado, jamás por posición/letra.** Buscar la fila de encabezados escaneando las primeras ~15 filas hasta encontrar una que contenga "Código cuenta contable".

Niveles jerárquicos: `Clase` (1 dígito) → `Grupo` (2) → `Cuenta` (4) → `Subcuenta` (6) → `Auxiliar` (8, `Transaccional = "Sí"`). Los niveles superiores son subtotales de los auxiliares: **sumar solo filas transaccionales; usar las demás para validación y navegación.**

Clases presentes: 1 Activo, 2 Pasivo, 3 Patrimonio, 4 Ingresos, 5 Gasto, 7 Costos de producción. (La 6 podría aparecer; manejarla como costo.)

Convención de signos de SIIGO: las clases 2, 3 y 4 traen saldos finales negativos (naturaleza crédito). Los movimientos débito/crédito siempre vienen positivos.

## 4. Modelo de datos (Postgres / Supabase)

```sql
-- Bitácora de cargas
create table cargas (
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
create unique index cargas_periodo_activa on cargas (anio, mes) where estado = 'activa';

-- Tabla completa del balance de prueba (TODOS los niveles)
create table movimientos (
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
create index movimientos_periodo on movimientos (anio, mes);
create index movimientos_cuenta on movimientos (cuenta);

-- Rubros del ER (líneas del estado de resultados)
create table rubros_er (
  codigo text primary key,
  nombre text not null,
  naturaleza text not null check (naturaleza in ('CR','DB')),
  orden int not null
);

-- Catálogo: la configuración que controla la contadora
create table catalogo_cuentas (
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

-- Configuración general
create table config (
  clave text primary key,
  valor jsonb not null
);
-- ej: ('periodo_actual', '{"anio": 2026, "mes": 5}')
```

Sembrar `rubros_er` con (en este orden): `ING_OP` Ingresos operacionales (CR), `COSTO_MP` Costo: materias primas e insumos (DB), `COSTO_PER` Costo: personal de producción (DB), `COSTO_SER` Costo: servicios y otros (DB), `GASTO_ADM` Gastos de administración (DB), `GASTO_VTA` Gastos de ventas (DB), `ING_NOOP` Ingresos no operacionales (CR), `GASTO_NOOP` Gastos no operacionales (DB).

Sembrar `catalogo_cuentas` con `seed_catalogo_cuentas.sql` (98 cuentas extraídas del Excel histórico, con naturaleza y rubro ya asignados).

### Matching por prefijo

El catálogo puede contener códigos de cualquier nivel (ej. `52` cubre todos los gastos de ventas; `41052501` es un auxiliar puntual). El valor de una línea del catálogo se calcula sumando los **movimientos transaccionales** cuyo código **empieza por** el código del catálogo:

```sql
movimientos.transaccional = true
and movimientos.cuenta like catalogo.cuenta || '%'
```

**Invariante crítica (validar con un constraint o test): ningún código del catálogo con `incluir_er = true` puede ser prefijo de otro código del catálogo con `incluir_er = true`.** De lo contrario habría doble conteo. (Ya resuelto en el seed: `720584` → `72058405`.)

### Valor con signo por naturaleza

```
valor = mov_credito - mov_debito   si naturaleza = 'CR'
valor = mov_debito - mov_credito   si naturaleza = 'DB'
```

Total de un rubro = suma de líneas con la misma naturaleza del rubro **menos** las de naturaleza contraria. Ejemplo: en `ING_OP` (CR), "Devoluciones en ventas" (DB) resta. Esto replica exactamente el P&L histórico de la empresa.

### Vistas

```sql
-- Línea por línea del ER, por mes
create view v_er_detalle as
select c.rubro_codigo, c.cuenta, c.nombre, c.naturaleza, m.anio, m.mes,
  sum(case when c.naturaleza = 'CR' then m.mov_credito - m.mov_debito
           else m.mov_debito - m.mov_credito end) as valor
from catalogo_cuentas c
join movimientos m on m.transaccional and m.cuenta like c.cuenta || '%'
where c.incluir_er
group by 1,2,3,4,5,6;

-- Totales por rubro (con signo según naturaleza del rubro)
create view v_er_rubros as
select d.anio, d.mes, r.codigo, r.nombre, r.orden, r.naturaleza,
  sum(case when d.naturaleza = r.naturaleza then d.valor else -d.valor end) as total
from v_er_detalle d join rubros_er r on r.codigo = d.rubro_codigo
group by 1,2,3,4,5,6;
```

Derivados en la vista o el frontend:
- `TOTAL INGRESOS = ING_OP`
- `TOTAL COSTO = COSTO_MP + COSTO_PER + COSTO_SER`
- `UTILIDAD BRUTA = ING_OP - TOTAL COSTO`
- `UTILIDAD OPERACIONAL = UTILIDAD BRUTA - GASTO_ADM - GASTO_VTA`
- `UTILIDAD NETA = UTILIDAD OPERACIONAL + ING_NOOP - GASTO_NOOP`

Balance General (`v_bg`): saldos finales por mes de las clases 1, 2 y 3, agrupados por Grupo (2 dígitos) sobre filas transaccionales con `incluir_bg = true`. Defaults: toda cuenta de clases 1–3 entra con `incluir_bg = true` al autocrearse. Mostrar pasivo y patrimonio en positivo (multiplicar por −1). Incluir línea "Resultado del ejercicio" = utilidad neta acumulada del ER, y el chequeo `Activo = Pasivo + Patrimonio + Resultado` con la diferencia visible si no cuadra.

### Filas de chequeo (heredadas del Excel)

Para cada clase con datos (41, 42, 51, 52, 53, 71, 72, 73 a nivel grupo): comparar el total del rubro calculado contra el agregado de movimientos de ese prefijo. Diferencia ≠ 0 → advertencia visible en el ER (badge ámbar con el monto). Esto detecta cuentas nuevas sin clasificar.

## 5. Lógica de carga (módulo 1)

1. La contadora arrastra el `.xlsx`.
2. **En el navegador** (SheetJS): localizar la fila de encabezados, mapear columnas por nombre, parsear el período de la fila "De {Mes} {Año} a {Mes} {Año}" (insensible a mayúsculas/tildes), convertir filas a objetos. `Transaccional`: "Sí"/"Si" → true.
3. **Previsualización obligatoria** antes de escribir nada:
   - Período detectado en grande: "Detecté: **Mayo 2026**" — con opción de corregir manualmente si el encabezado viniera mal.
   - Si ese período ya existe: aviso claro "Mayo 2026 ya fue cargado el {fecha}. Esta carga lo REEMPLAZARÁ."
   - Validaciones (todas deben mostrarse, bloquean solo las marcadas ⛔):
     - ⛔ Encabezados requeridos encontrados.
     - ⛔ Período detectado o seleccionado manualmente.
     - ⚠️ Suma de auxiliares = total de cada Clase (tolerancia $1 por redondeo).
     - ⚠️ Saldo final = saldo inicial + débitos − créditos por fila (muestreo, según naturaleza).
     - ⚠️ Activo = Pasivo + Patrimonio + (Ingresos − Gastos − Costos) con saldos finales.
     - ℹ️ Cuentas nuevas que no están en el catálogo (lista).
4. Al confirmar, en **una transacción** (función RPC de Postgres):
   - Marcar la carga anterior del período como `reemplazada` (si existe) y borrar sus `movimientos` (cascade).
   - Insertar la nueva carga y todos sus movimientos (todos los niveles).
   - Auto-insertar en `catalogo_cuentas` las cuentas transaccionales nuevas: `origen='auto'`; clases 1–3 → `incluir_bg=true`; clases 4,5,6,7 → `incluir_er=false` y quedan en la lista de "pendientes de clasificar".
   - Actualizar `config.periodo_actual` solo si el período cargado es ≥ al actual (re-cargar un mes viejo corrige cifras pero no retrocede el mes de trabajo).
5. Subir el `.xlsx` original a Storage (`balances/{anio}/{mes}/{timestamp}_{nombre}`). Los reemplazados no se borran: auditoría.
6. Historial de cargas en la misma pantalla: período, archivo, fecha, usuario, estado, validaciones.

## 6. Pantallas

### `/cargas` — Carga de balances
Dropzone + previsualización + confirmación + historial (descrito arriba).

### `/consolidado` — Consolidado y clasificación
- Tabla de `catalogo_cuentas` unida con valores acumulados del año: cuenta, nombre, naturaleza, rubro (select editable), **check ER**, **check BG**, valor YTD.
- Filtros: por clase, texto, "solo pendientes de clasificar" (origen='auto' sin rubro).
- Banner si hay pendientes: "Hay N cuentas nuevas sin clasificar".
- Cambios guardan al instante (optimistic update). Solo el rol contadora/admin edita.
- Vista secundaria expandible: los movimientos crudos del mes (todos los niveles) para consulta.

### `/estado-resultados` — ER
- Matriz: filas = líneas del catálogo agrupadas por rubro con subtotales y utilidades derivadas; columnas = Enero…Diciembre + Total año.
- Modos: Absolutos | Vertical (% sobre ingresos) | Horizontal (variación vs mes anterior).
- Filas de chequeo por clase con badge si ≠ 0.
- Export a Excel (SheetJS write).

### `/balance-general` — BG
- Activo / Pasivo / Patrimonio por Grupo, columnas por mes (saldo final), línea de resultado del ejercicio, chequeo de cuadre visible.
- Export a Excel.

### `/analisis` — Análisis financiero
- KPIs del mes de trabajo: ingresos, margen bruto, margen operacional, utilidad neta, con variación vs mes anterior y vs promedio del año.
- Gráficos: tendencia mensual ingresos/costos/utilidad; composición de costos (donut); composición de gastos; evolución de márgenes; top cuentas por variación mensual.
- Drill-down jerárquico: rubro → cuenta → auxiliar (aprovechando que se importan todos los niveles).
- Tema visual: oscuro plum/magenta (continuidad con el dashboard previo de la empresa).
- (Fase posterior, opcional) Comentario ejecutivo del mes generado con el API de Anthropic vía Edge Function.

### Login
Supabase Auth con email/contraseña. Dos roles via tabla `perfiles` (user_id, rol: 'admin' | 'contadora'). RLS: solo usuarios autenticados leen; solo contadora/admin escriben en cargas/movimientos/catálogo; solo admin gestiona usuarios.

## 7. Fases de construcción

| Fase | Entregable | Validación |
|---|---|---|
| 0 | Repo + Supabase + Netlify + scaffold React con login | Deploy accesible con login |
| 1 | Migraciones SQL + seeds (rubros + catálogo) + RLS + vistas | `select` de vistas devuelve estructura correcta |
| 2 | Módulo de carga completo | Cargar los 5 meses reales 2026; Mayo (formato sin "Control") debe entrar perfecto |
| 3 | Consolidado con checks | Toggle de un check cambia el ER al instante |
| 4 | ER + BG + export | **Cuadre línea por línea contra la hoja MAGENTA del Excel histórico (Ene–Abr)**; utilidad neta Ene = 15.479.983,05 |
| 5 | Análisis financiero | KPIs y gráficos coherentes con el ER |
| 6 | Pulido, manual de 1 página, capacitación | La contadora completa una carga sin ayuda |

## 8. Datos de referencia para pruebas (del Excel histórico 2026)

| Concepto | Enero | Febrero | Marzo | Abril | Mayo |
|---|---|---|---|---|---|
| Total ingresos | 180.390.855,54 | 158.112.603,90 | 193.546.647,16 | 188.101.289,42 | 258.299.361,58 |
| Total costo | 112.902.388,65 | — | — | — | 153.617.545,28 |
| Utilidad neta | 15.479.983,05 | — | — | — | 53.507.262,68 |

(Los valores de Mayo provienen del balance crudo; el Excel histórico tenía rotas las fórmulas de Mayo por el cambio de formato — el sistema nuevo debe reproducirlos correctamente desde la fuente.)

## 9. Decisiones ya tomadas (no reabrir)

1. Importar la tabla completa de SIIGO (todos los niveles); agregar solo sobre transaccionales.
2. Columnas por nombre de encabezado, nunca por posición.
3. Período auto-detectado del encabezado del archivo + confirmación visual de la contadora.
4. Reemplazo por mes (no global), en transacción, con archivo original archivado en Storage.
5. Catálogo con matching por prefijo + invariante anti-doble-conteo.
6. `periodo_actual` avanza con cargas nuevas, no retrocede con correcciones.
7. Códigos de cuenta siempre como texto.
