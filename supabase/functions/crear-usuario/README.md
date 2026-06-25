# Edge Function `crear-usuario`

Crea usuarios nuevos (auth.users + perfil) con contraseña temporal `Magenta26` y
`debe_cambiar_password = true`. Usa la **service_role** (Admin API), que **nunca**
vive en el frontend: solo aquí, como secret de la función.

## Seguridad
- Valida que **quien llama sea admin** (lee su perfil con la service_role tras
  verificar su JWT). Un no-admin recibe `403`.
- El navegador solo envía `{ email, rol }` con el JWT del admin; la clave
  privilegiada jamás sale del servidor.

## Despliegue (lo hace el admin desde su máquina, una sola vez)

```bash
# 1) Enlazar el proyecto (si no se ha hecho)
supabase link --project-ref <PROJECT_REF>

# 2) Cargar la service_role como secret de la función (NUNCA en el front)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service_role_key>

# 3) Desplegar
supabase functions deploy crear-usuario
```

`SUPABASE_URL` y `SUPABASE_ANON_KEY` los inyecta la plataforma automáticamente.

## Prueba rápida
Desde la pantalla **Administración → Usuarios** (solo admin), formulario
"Crear usuario". Internamente:

```ts
supabase.functions.invoke('crear-usuario', { body: { email, rol } })
```

Si la función aún no está desplegada, el botón mostrará un error claro y el
resto de la gestión (listar y **cambiar rol** de usuarios existentes) sigue
funcionando, porque eso es solo SQL sobre `perfiles`.
