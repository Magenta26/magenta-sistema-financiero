import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useTranslation } from '../hooks/useTranslation'
import { useAuth } from '../hooks/useAuth'
import { useUsuarios } from '../hooks/useUsuarios'
import type { Rol } from '../lib/acceso'
import { fecha } from '../lib/formato'
import Toast from '../components/Toast'
import type { DatosToast } from '../components/Toast'

const ROLES: Rol[] = ['admin', 'contadora', 'nomina']
const CORREO_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Gestión de usuarios y accesos (solo admin; la ruta está protegida por
 * GuardAcceso y la vista v_usuarios solo responde a admin).
 *   • Lista perfiles + email + flag de cambio de contraseña.
 *   • Cambia el rol de un usuario (update sobre `perfiles`).
 *   • Crea usuarios nuevos vía la Edge Function `crear-usuario` (service_role en
 *     el servidor; el navegador solo manda {email, rol} con su JWT de admin).
 */
export default function Usuarios() {
  const { t } = useTranslation()
  const { sesion } = useAuth()
  const queryClient = useQueryClient()
  const tx = t.usuarios

  const usuarios = useUsuarios()
  const [toast, setToast] = useState<DatosToast | null>(null)
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null)
  const avisar = (datos: DatosToast) => {
    if (temporizador.current) clearTimeout(temporizador.current)
    setToast(datos)
    temporizador.current = setTimeout(() => setToast(null), 5000)
  }

  const [correoNuevo, setCorreoNuevo] = useState('')
  const [rolNuevo, setRolNuevo] = useState<Rol>('nomina')

  // ── Cambiar rol (update sobre perfiles; admin sí puede por RLS) ──
  const cambiarRol = useMutation({
    mutationFn: async ({ userId, rol }: { userId: string; rol: Rol }) => {
      const { error } = await supabase.from('perfiles').update({ rol }).eq('user_id', userId)
      if (error) throw new Error(error.message)
    },
    onError: (e) => avisar({ tipo: 'error', mensaje: tx.errorRol(e.message) }),
    onSuccess: () => avisar({ tipo: 'exito', mensaje: tx.rolGuardado }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['v_usuarios'] }),
  })

  // ── Crear usuario (Edge Function con service_role en el servidor) ──
  const crearUsuario = useMutation({
    mutationFn: async ({ email, rol }: { email: string; rol: Rol }) => {
      const { data, error } = await supabase.functions.invoke('crear-usuario', {
        body: { email, rol },
      })
      if (error) throw new Error(error.message)
      if (data?.error) throw new Error(String(data.error))
      return email
    },
    onError: (e) => avisar({ tipo: 'error', mensaje: tx.errorCrear(e.message) }),
    onSuccess: (email) => {
      avisar({ tipo: 'exito', mensaje: tx.creado(email) })
      setCorreoNuevo('')
      setRolNuevo('nomina')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['v_usuarios'] }),
  })

  const enviarCrear = () => {
    const correo = correoNuevo.trim().toLowerCase()
    if (!CORREO_RE.test(correo)) {
      avisar({ tipo: 'error', mensaje: tx.errorCorreo })
      return
    }
    crearUsuario.mutate({ email: correo, rol: rolNuevo })
  }

  const lista = usuarios.data ?? []

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold text-brand-900">{tx.titulo}</h1>
        <p className="mt-1 max-w-2xl text-sm text-tinta-suave">{tx.descripcion}</p>
      </div>

      {/* Crear usuario */}
      <section className="mt-6 rounded-xl border border-borde bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-brand-900">{tx.crearTitulo}</h2>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="min-w-[16rem] flex-1">
            <label className="block text-xs font-semibold text-tinta-suave" htmlFor="nuevo-correo">
              {tx.correoNuevo}
            </label>
            <input
              id="nuevo-correo"
              type="email"
              value={correoNuevo}
              onChange={(e) => setCorreoNuevo(e.target.value)}
              placeholder={tx.correoPlaceholder}
              className="mt-1 block w-full rounded-lg border border-borde bg-white px-3 py-2 text-sm text-tinta placeholder-gray-400 transition-colors duration-150 focus:border-brand-700 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-tinta-suave" htmlFor="nuevo-rol">
              {tx.rolNuevo}
            </label>
            <select
              id="nuevo-rol"
              value={rolNuevo}
              onChange={(e) => setRolNuevo(e.target.value as Rol)}
              className="mt-1 block rounded-lg border border-borde bg-white px-3 py-2 text-sm text-tinta transition-colors duration-150 focus:border-brand-700 focus:outline-none"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {tx.roles[r]}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={enviarCrear}
            disabled={crearUsuario.isPending}
            className="rounded-lg bg-brand-700 px-5 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-brand-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {crearUsuario.isPending ? tx.creando : tx.crear}
          </button>
        </div>
        <p className="mt-3 text-xs text-tinta-suave">{tx.notaFuncion}</p>
      </section>

      {/* Lista de usuarios */}
      <section className="mt-6">
        {usuarios.isLoading && <p className="text-sm text-tinta-suave">{tx.cargando}</p>}
        {usuarios.error && (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {tx.error(usuarios.error.message)}
          </p>
        )}
        {!usuarios.isLoading && !usuarios.error && (
          <div className="overflow-x-auto rounded-xl border border-borde bg-white shadow-sm">
            <table className="w-full border-collapse">
              <thead className="bg-gray-50 text-brand-900">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold">{tx.columnaCorreo}</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold">{tx.columnaRol}</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold">{tx.columnaEstado}</th>
                </tr>
              </thead>
              <tbody>
                {lista.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-sm text-tinta-suave">
                      {tx.sinUsuarios}
                    </td>
                  </tr>
                ) : (
                  lista.map((u) => {
                    const esYo = u.user_id === sesion?.user.id
                    return (
                      <tr key={u.user_id} className="border-t border-borde hover:bg-brand-50">
                        <td className="px-4 py-2.5 text-sm text-tinta">
                          {u.email ?? '—'}
                          {esYo && (
                            <span className="ml-2 rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-700">
                              {tx.tuUsuario}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <select
                            value={u.rol}
                            disabled={esYo || cambiarRol.isPending}
                            onChange={(e) =>
                              cambiarRol.mutate({ userId: u.user_id, rol: e.target.value as Rol })
                            }
                            title={esYo ? tx.tuUsuario : undefined}
                            className="rounded-lg border border-borde bg-white px-2 py-1.5 text-sm text-tinta transition-colors duration-150 focus:border-brand-700 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-tinta-suave"
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>
                                {tx.roles[r]}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-2.5 text-xs">
                          {u.debe_cambiar_password ? (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-800">
                              {tx.debeCambiar}
                            </span>
                          ) : (
                            <span className="text-tinta-suave">
                              {tx.activo}
                              {u.created_at ? ` · ${fecha(u.created_at)}` : ''}
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-xs text-tinta-suave">{tx.descripcionRoles}</p>
      </section>

      <Toast toast={toast} />
    </div>
  )
}
