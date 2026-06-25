import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { validarNuevaPassword } from '../lib/password'
import { useAuth } from '../hooks/useAuth'
import { useTranslation } from '../hooks/useTranslation'
import Toast from '../components/Toast'
import type { DatosToast } from '../components/Toast'
import logo from '../assets/Logo.png'

export default function CambiarPassword() {
  const { sesion } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [nueva, setNueva] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [toast, setToast] = useState<DatosToast | null>(null)
  const [listo, setListo] = useState(false)

  const manejarEnvio = async (evento: FormEvent) => {
    evento.preventDefault()
    setError(null)

    const errorRegla = validarNuevaPassword(nueva, confirmar)
    if (errorRegla) {
      setError(t.cambiarPassword.errores[errorRegla])
      return
    }

    setEnviando(true)
    // 1) Cambiar la contraseña del usuario autenticado.
    const { error: errorAuth } = await supabase.auth.updateUser({ password: nueva })
    if (errorAuth) {
      setEnviando(false)
      setError(t.cambiarPassword.errores.generico(errorAuth.message))
      return
    }
    // 2) Bajar el flag debe_cambiar_password de su propia fila (función SECURITY DEFINER).
    const { error: errorFlag } = await supabase.rpc('marcar_password_cambiada')
    if (errorFlag) {
      setEnviando(false)
      setError(t.cambiarPassword.errores.generico(errorFlag.message))
      return
    }
    // 3) Refrescar el perfil para que el guard ya no fuerce el cambio.
    await queryClient.invalidateQueries({ queryKey: ['perfil', 'rol', sesion?.user.id] })

    setToast({ tipo: 'exito', mensaje: t.cambiarPassword.exito })
    setListo(true)
    // A "/" → Inicio aterriza en el módulo según el rol (nómina ≠ finanzas).
    setTimeout(() => navigate('/', { replace: true }), 900)
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
          <h2 className="text-lg font-semibold text-brand-900">{t.cambiarPassword.titulo}</h2>
          <p className="mb-6 mt-1 text-sm text-tinta-suave">{t.cambiarPassword.subtitulo}</p>

          <label className="mb-1 block text-sm text-tinta-suave" htmlFor="nueva">
            {t.cambiarPassword.nueva}
          </label>
          <input
            id="nueva"
            type="password"
            autoComplete="new-password"
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
            placeholder="••••••••"
            className="mb-4 w-full rounded-lg border border-borde bg-white px-3 py-2 text-tinta placeholder-gray-400 outline-none transition-colors duration-150 focus:border-brand-700 focus:ring-1 focus:ring-brand-700"
          />

          <label className="mb-1 block text-sm text-tinta-suave" htmlFor="confirmar">
            {t.cambiarPassword.confirmar}
          </label>
          <input
            id="confirmar"
            type="password"
            autoComplete="new-password"
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
            placeholder="••••••••"
            className="mb-2 w-full rounded-lg border border-borde bg-white px-3 py-2 text-tinta placeholder-gray-400 outline-none transition-colors duration-150 focus:border-brand-700 focus:ring-1 focus:ring-brand-700"
          />

          <p className="mb-4 text-xs text-tinta-suave">{t.cambiarPassword.regla}</p>

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
            disabled={enviando || listo}
            className="w-full rounded-lg bg-brand-700 px-4 py-2.5 font-semibold text-white transition-colors duration-150 hover:bg-brand-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {enviando ? t.cambiarPassword.guardando : t.cambiarPassword.guardar}
          </button>
        </form>
      </div>

      <Toast toast={toast} />
    </div>
  )
}
