'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'

/**
 * Si el driver ya pasó por /postulacion/[token], su accessToken queda guardado
 * en localStorage. Al entrar a /capacitaciones lo intercambiamos en silencio
 * por un shareToken vigente y agregamos `?session=` a la URL — así no le
 * pedimos cédula+teléfono al hacer click en Reservar.
 *
 * Se monta solo cuando no hay ?session= en la URL. Si el intercambio falla
 * (token vencido, postulación no aprobada), no hace nada — queda el flow
 * manual del IdentityModal como fallback.
 */
export function AutoIdentify() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [resolving, setResolving] = useState(false)

  useEffect(() => {
    // Si ya hay session en URL no hacemos nada
    if (searchParams.get('session')) return

    let portalToken: string | null = null
    try {
      portalToken = localStorage.getItem('monchis.driver.portalToken')
      // Si ya tenemos shareToken vigente, no hace falta intercambiar
      const existingShareToken = localStorage.getItem('monchis.bookingShareToken')
      if (existingShareToken) {
        const params = new URLSearchParams(searchParams.toString())
        params.set('session', existingShareToken)
        router.replace(`${pathname}?${params.toString()}`)
        return
      }
    } catch {}

    if (!portalToken) return

    let cancelled = false
    setResolving(true)
    fetch('/api/public/auth/from-portal-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken: portalToken }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        if (cancelled) return
        if (data.shareToken) {
          try {
            localStorage.setItem('monchis.bookingShareToken', data.shareToken)
          } catch {}
          const params = new URLSearchParams(searchParams.toString())
          params.set('session', data.shareToken)
          router.replace(`${pathname}?${params.toString()}`)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setResolving(false)
      })

    return () => {
      cancelled = true
    }
    // Solo corre una vez al montarse (con el snapshot inicial de searchParams)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // No renderiza UI; el banner / flow normal se encarga del resto
  if (!resolving) return null

  return (
    <div className="fixed top-3 right-3 z-50 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-xs shadow-sm">
      <Loader2 className="h-3 w-3 animate-spin" />
      <span className="text-muted-foreground">Reconociéndote…</span>
    </div>
  )
}
