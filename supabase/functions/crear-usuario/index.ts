// ============================================================
// Edge Function: crear-usuario
//
// Crea un usuario nuevo (auth.users + su perfil) con contraseña temporal y
// debe_cambiar_password = true. La Admin API de Supabase EXIGE la service_role
// key, que NUNCA debe vivir en el frontend — por eso esto corre en el servidor.
//
// Flujo:
//   1) Lee el JWT del que llama (header Authorization) y verifica que su perfil
//      tenga rol 'admin'. Si no, 403.
//   2) Con la service_role (secret de la función) crea el usuario con la
//      contraseña temporal "Magenta26" (email ya confirmado) e inserta/actualiza
//      su perfil con el rol pedido y debe_cambiar_password = true.
//
// Secrets requeridos (NO se ponen en el front):
//   SUPABASE_URL, SUPABASE_ANON_KEY  → inyectados por la plataforma.
//   SUPABASE_SERVICE_ROLE_KEY        → `supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...`
//
// Despliegue:  supabase functions deploy crear-usuario
// ============================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PASSWORD_TEMPORAL = 'Magenta26'
const ROLES_VALIDOS = ['admin', 'contadora', 'nomina']

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Método no permitido.' }, 405)

  const url = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader) return json({ error: 'Falta el token de autorización.' }, 401)

  // 1) Identificar y autorizar a quien llama (debe ser admin).
  const clienteLlamante = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userData, error: userErr } = await clienteLlamante.auth.getUser()
  if (userErr || !userData?.user) return json({ error: 'Sesión inválida.' }, 401)

  // service_role: salta RLS para leer el perfil del llamante y crear al usuario.
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: perfilLlamante, error: perfilErr } = await admin
    .from('perfiles')
    .select('rol')
    .eq('user_id', userData.user.id)
    .maybeSingle()
  if (perfilErr) return json({ error: perfilErr.message }, 500)
  if (perfilLlamante?.rol !== 'admin') {
    return json({ error: 'No autorizado: se requiere rol admin.' }, 403)
  }

  // 2) Validar el cuerpo.
  let body: { email?: string; rol?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Cuerpo JSON inválido.' }, 400)
  }
  const email = (body.email ?? '').trim().toLowerCase()
  const rol = body.rol ?? ''
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'Correo inválido.' }, 400)
  }
  if (!ROLES_VALIDOS.includes(rol)) {
    return json({ error: 'Rol inválido.' }, 400)
  }

  // 3) Crear el usuario con la contraseña temporal (email ya confirmado).
  const { data: creado, error: crearErr } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD_TEMPORAL,
    email_confirm: true,
  })
  if (crearErr || !creado?.user) {
    return json({ error: crearErr?.message ?? 'No se pudo crear el usuario.' }, 400)
  }

  // 4) Crear/asegurar su perfil (debe_cambiar_password = true → cambia al entrar).
  const { error: perfilInsErr } = await admin
    .from('perfiles')
    .upsert({ user_id: creado.user.id, rol, debe_cambiar_password: true }, { onConflict: 'user_id' })
  if (perfilInsErr) {
    // Revertir el usuario huérfano si el perfil falla, para no dejar basura.
    await admin.auth.admin.deleteUser(creado.user.id)
    return json({ error: perfilInsErr.message }, 500)
  }

  return json({ ok: true, user_id: creado.user.id, email })
})
