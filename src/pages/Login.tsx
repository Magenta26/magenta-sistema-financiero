import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

/** Traduce los errores de Supabase Auth a mensajes claros en español. */
function traducirError(mensaje: string): string {
  const m = mensaje.toLowerCase()
  if (m.includes('invalid login credentials')) {
    return 'Correo o contraseña incorrectos.'
  }
  if (m.includes('email not confirmed')) {
    return 'El correo aún no ha sido confirmado. Contacta al administrador.'
  }
  if (m.includes('missing email') || m.includes('missing password')) {
    return 'Ingresa tu correo y contraseña.'
  }
  if (m.includes('too many requests') || m.includes('rate limit')) {
    return 'Demasiados intentos. Espera un momento e inténtalo de nuevo.'
  }
  if (m.includes('failed to fetch') || m.includes('network')) {
    return 'No se pudo conectar con el servidor. Verifica tu conexión a internet.'
  }
  return 'Ocurrió un error al iniciar sesión. Inténtalo de nuevo.'
}

export default function Login() {
  const { sesion, cargando } = useAuth()
  const navigate = useNavigate()
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (!cargando && sesion) {
    return <Navigate to="/" replace />
  }

  const manejarEnvio = async (evento: FormEvent) => {
    evento.preventDefault()
    setError(null)

    if (!correo.trim() || !contrasena) {
      setError('Ingresa tu correo y contraseña.')
      return
    }

    setEnviando(true)
    const { error: errorAuth } = await supabase.auth.signInWithPassword({
      email: correo.trim(),
      password: contrasena,
    })
    setEnviando(false)

    if (errorAuth) {
      setError(traducirError(errorAuth.message))
      return
    }

    navigate('/', { replace: true })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ciruela-950 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white">
            Magenta <span className="text-magenta-500">Farms</span>
          </h1>
          <p className="mt-2 text-sm text-ciruela-400">
            Sistema Financiero · Magenta Farms S.A.S.
          </p>
        </div>

        <form
          onSubmit={manejarEnvio}
          className="rounded-2xl border border-ciruela-700 bg-ciruela-900 p-8 shadow-xl shadow-black/40"
        >
          <h2 className="mb-6 text-lg font-semibold text-white">Iniciar sesión</h2>

          <label className="mb-1 block text-sm text-ciruela-300" htmlFor="correo">
            Correo electrónico
          </label>
          <input
            id="correo"
            type="email"
            autoComplete="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            placeholder="nombre@empresa.com"
            className="mb-4 w-full rounded-lg border border-ciruela-700 bg-ciruela-950 px-3 py-2 text-white placeholder-ciruela-600 outline-none focus:border-magenta-500 focus:ring-1 focus:ring-magenta-500"
          />

          <label className="mb-1 block text-sm text-ciruela-300" htmlFor="contrasena">
            Contraseña
          </label>
          <input
            id="contrasena"
            type="password"
            autoComplete="current-password"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            placeholder="••••••••"
            className="mb-6 w-full rounded-lg border border-ciruela-700 bg-ciruela-950 px-3 py-2 text-white placeholder-ciruela-600 outline-none focus:border-magenta-500 focus:ring-1 focus:ring-magenta-500"
          />

          {error && (
            <p
              role="alert"
              className="mb-4 rounded-lg border border-red-800 bg-red-950/60 px-3 py-2 text-sm text-red-300"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={enviando}
            className="w-full rounded-lg bg-magenta-600 px-4 py-2.5 font-semibold text-white transition-colors hover:bg-magenta-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {enviando ? 'Ingresando…' : 'Ingresar'}
          </button>

          <p className="mt-5 text-center text-xs text-ciruela-400">
            ¿No tienes cuenta? El administrador crea los usuarios en Supabase.
          </p>
        </form>
      </div>
    </div>
  )
}
