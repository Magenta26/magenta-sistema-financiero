# Sistema Financiero Web — Magenta Farms S.A.S.

Aplicación web para consolidar los balances de prueba mensuales de SIIGO, generar el Estado de Resultados y el Balance General, y alimentar el módulo de análisis financiero.

La especificación completa está en `PLAN.md`. Las reglas de trabajo y el registro de fases completadas están en `CLAUDE.md`.

## Desarrollo

```bash
npm install
npm run dev
```

Requiere un archivo `.env.local` con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (no se versiona).
