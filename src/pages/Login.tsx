import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useTranslation } from '../hooks/useTranslation'
import type { Diccionario } from '../i18n/es'
import logo from '../assets/Logo.png'

/** Traduce los errores de Supabase Auth a mensajes claros del idioma activo. */
function traducirError(mensaje: string, errores: Diccionario['login']['errores']): string {
  const m = mensaje.toLowerCase()
  if (m.includes('invalid login credentials')) return errores.credenciales
  if (m.includes('email not confirmed')) return errores.noConfirmado
  if (m.includes('missing email') || m.includes('missing password')) return errores.faltanDatos
  if (m.includes('too many requests') || m.includes('rate limit')) return errores.demasiadosIntentos
  if (m.includes('failed to fetch') || m.includes('network')) return errores.sinConexion
  return errores.generico
}

export default function Login() {
  const { sesion, cargando } = useAuth()
  const { t } = useTranslation()
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
      setError(t.login.errores.faltanDatos)
      return
    }

    setEnviando(true)
    const { error: errorAuth } = await supabase.auth.signInWithPassword({
      email: correo.trim(),
      password: contrasena,
    })
    setEnviando(false)

    if (errorAuth) {
      setError(traducirError(errorAuth.message, t.login.errores))
      return
    }

    // A "/" → Inicio redirige al módulo que corresponde al rol.
    navigate('/', { replace: true })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-fondo px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <img src={logo} alt="Magenta Farms" className="mx-auto h-36 w-auto object-contain" />
          <p className="mt-3 text-sm text-tinta-suave">{t.login.subtitulo}</p>
        </div>

        <form
          onSubmit={manejarEnvio}
          className="rounded-2xl border border-borde bg-white p-8 shadow-md shadow-brand-900/5"
        >
          <h2 className="mb-6 text-lg font-semibold text-brand-900">{t.login.iniciarSesion}</h2>

          <label className="mb-1 block text-sm text-tinta-suave" htmlFor="correo">
            {t.login.correo}
          </label>
          <input
            id="correo"
            type="email"
            autoComplete="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            placeholder={t.login.correoPlaceholder}
            className="mb-4 w-full rounded-lg border border-borde bg-white px-3 py-2 text-tinta placeholder-gray-400 outline-none transition-colors duration-150 focus:border-brand-700 focus:ring-1 focus:ring-brand-700"
          />

          <label className="mb-1 block text-sm text-tinta-suave" htmlFor="contrasena">
            {t.login.contrasena}
          </label>
          <input
            id="contrasena"
            type="password"
            autoComplete="current-password"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            placeholder="••••••••"
            className="mb-6 w-full rounded-lg border border-borde bg-white px-3 py-2 text-tinta placeholder-gray-400 outline-none transition-colors duration-150 focus:border-brand-700 focus:ring-1 focus:ring-brand-700"
          />

          {error && (
            <p
              role="alert"
              className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={enviando}
            className="w-full rounded-lg bg-brand-700 px-4 py-2.5 font-semibold text-white transition-colors duration-150 hover:bg-brand-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {enviando ? t.login.ingresando : t.login.ingresar}
          </button>

          <p className="mt-5 text-center text-xs text-tinta-suave">{t.login.sinCuenta}</p>
        </form>
      </div>
    </div>
  )
}
