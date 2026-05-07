'use client'

import { useEffect, useState } from 'react'
import { LogIn, X } from 'lucide-react'
import { IdentityModal } from './identity-modal'

const DISMISS_KEY = 'monchis.identifyCtaDismissed'

/**
 * Banner discreto para postulantes que entran al link en frío. Hoy la única
 * forma de identificarse es clickear "Reservar" en un slot, lo cual no es
 * obvio. Este CTA acelera el descubrimiento sin chocar con el flow de booking.
 *
 * Se oculta solo cuando: hay session en URL (lo maneja el server), hay algo en
 * localStorage (AutoIdentify lo va a recuperar), o el usuario lo descartó.
 *
 * `forceShow` lo usa el modo preview de QA — bypasea las heurísticas de
 * localStorage para que el admin pueda ver el banner aunque tenga datos
 * cacheados de pruebas anteriores.
 */
export function AnonymousIdentifyCTA({ forceShow = false }: { forceShow?: boolean }) {
  const [show, setShow] = useState(forceShow)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (forceShow) {
      setShow(true)
      return
    }
    try {
      const hasShareToken = localStorage.getItem('monchis.bookingShareToken')
      const hasPortalToken = localStorage.getItem('monchis.driver.portalToken')
      if (hasShareToken || hasPortalToken) return
      if (sessionStorage.getItem(DISMISS_KEY)) return
      setShow(true)
    } catch {
      setShow(true)
    }
  }, [forceShow])

  function handleDismiss() {
    try {
      sessionStorage.setItem(DISMISS_KEY, '1')
    } catch {}
    setShow(false)
  }

  function handleValidated() {
    setOpen(false)
    setShow(false)
  }

  if (!show) return null

  return (
    <>
      <div className="rounded-xl border border-info/30 bg-info-soft px-4 py-3 mb-6 flex items-center gap-3">
        <div className="shrink-0 h-9 w-9 rounded-full bg-info/15 text-info flex items-center justify-center">
          <LogIn className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">¿Ya te postulaste?</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Identificate y te mostramos qué podés agendar.
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="shrink-0 inline-flex items-center justify-center rounded-md bg-brand text-brand-foreground text-xs font-semibold px-3 h-9 hover:bg-brand-hover transition-colors"
        >
          Identificarme
        </button>
        <button
          type="button"
          aria-label="Cerrar"
          onClick={handleDismiss}
          className="shrink-0 self-start text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-foreground/5"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <IdentityModal open={open} onOpenChange={setOpen} onValidated={handleValidated} />
    </>
  )
}
