'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'

/**
 * Fallback de identificación cliente: solo se monta cuando el server no pudo
 * resolver la identidad por cookie. Usamos localStorage como segundo intento
 * (driver puede haber pasado por /postulacion/[token] antes de que tuviéramos
 * cookies, o navegó en privado y la cookie no se persistió).
 *
 * Si encuentra portalToken local, intercambia por shareToken y refresca la
 * página con ?session= para que el server-side la próxima vez ya identifique.
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
          // Persistir la cookie para que el SSR identifique en próximos renders.
          // Con la cookie seteada, no hace falta meter ?session= en la URL — el
          // router.refresh() vuelve a correr el server component y resuelve la
          // identidad por cookie. URL queda limpia.
          try {
            const days = 60
            const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString()
            document.cookie = `monchis_portal_token=${portalToken}; expires=${expires}; path=/; samesite=lax`
          } catch {}
          router.refresh()
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setResolving(false)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!resolving) return null

  return (
    <div className="fixed top-3 right-3 z-50 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-xs shadow-sm">
      <Loader2 className="h-3 w-3 animate-spin" />
      <span className="text-muted-foreground">Reconociéndote…</span>
    </div>
  )
}
