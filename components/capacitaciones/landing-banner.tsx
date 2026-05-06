'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { CheckCircle2, AlertCircle, ExternalLink, X } from 'lucide-react'
import type { PublicBookingSessionInfo } from '@/lib/types/onboarding-rules.types'

interface SsrIdentity {
  firstName: string | null
  isEligible: boolean
  notEligibleReason: string | null
  postulationStatus: string
  portalToken: string | null
}

interface Props {
  /** Si el server ya resolvió la identidad (cookie del portal), pasámoslo y
   *  evitamos el round-trip del session validate. */
  ssrIdentity?: SsrIdentity
  /** Caso fallback: el server no resolvió pero hay session en URL. */
  sessionToken?: string
}

export function LandingBanner({ ssrIdentity, sessionToken }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [info, setInfo] = useState<PublicBookingSessionInfo | null>(null)
  const [error, setError] = useState(false)

  // Solo hacemos fetch cliente si NO tenemos SSR identity y SÍ tenemos sessionToken
  useEffect(() => {
    if (ssrIdentity || !sessionToken) return
    fetch('/api/public/auth/session/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shareToken: sessionToken }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setInfo)
      .catch(() => setError(true))
  }, [sessionToken, ssrIdentity])

  // Resolvemos los datos a mostrar — preferimos SSR si vino
  let firstName: string | null = null
  let eligible = false
  let notEligibleReason: string | null = null
  let portalToken: string | null = null

  if (ssrIdentity) {
    firstName = ssrIdentity.firstName
    eligible = ssrIdentity.isEligible
    notEligibleReason = ssrIdentity.notEligibleReason
    portalToken = ssrIdentity.portalToken
  } else if (info) {
    firstName = info.formDriver.firstName
    eligible = info.formDriver.isEligible
    notEligibleReason = info.formDriver.notEligibleReason
  } else if (error) {
    return null
  } else {
    return null
  }

  function handleNotMe() {
    // Limpiar localStorage + cookie + URL
    try {
      localStorage.removeItem('monchis.bookingShareToken')
      localStorage.removeItem('monchis.driver.portalToken')
    } catch {}
    // Borrar cookie del portal
    document.cookie = 'monchis_portal_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
    // Limpiar ?session= de la URL y refrescar
    router.replace(pathname)
    router.refresh()
  }

  const name = (firstName || '').trim()

  return (
    <div
      className={`rounded-xl border px-4 py-3.5 mb-6 flex items-start gap-3 ${
        eligible ? 'border-success/30 bg-success-soft' : 'border-warning/30 bg-warning-soft'
      }`}
    >
      <div
        className={`shrink-0 h-9 w-9 rounded-full flex items-center justify-center ${
          eligible ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'
        }`}
      >
        {eligible ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm">
          {name ? (
            <>
              <span className="capitalize">{name.toLowerCase()}</span>
              {eligible ? ', ya podés agendar 🎉' : ', tu postulación todavía no está completa'}
            </>
          ) : eligible ? (
            'Validamos tu postulación, ya podés agendar 🎉'
          ) : (
            'Tu postulación todavía no está completa'
          )}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {eligible
            ? 'Elegí la capacitación que prefieras y reservá tu día.'
            : notEligibleReason || 'Cuando aprobemos los pasos pendientes vas a poder reservar.'}
        </div>
        {!eligible && portalToken && (
          <Link
            href={`/postulacion/${portalToken}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-warning hover:underline mt-2"
          >
            Ver mi postulación
            <ExternalLink className="h-3 w-3" />
          </Link>
        )}
      </div>
      <button
        type="button"
        onClick={handleNotMe}
        aria-label="No soy yo"
        title="¿No sos vos? Limpiar identidad"
        className="shrink-0 self-start text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-foreground/5"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
