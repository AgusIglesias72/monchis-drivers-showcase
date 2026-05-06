'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import type { PublicBookingSessionInfo } from '@/lib/types/onboarding-rules.types'

export function LandingBanner({ sessionToken }: { sessionToken: string }) {
  const [info, setInfo] = useState<PublicBookingSessionInfo | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('/api/public/auth/session/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shareToken: sessionToken }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setInfo)
      .catch(() => setError(true))
  }, [sessionToken])

  if (error || !info) return null

  const eligible = info.formDriver.isEligible
  const name = (info.formDriver.firstName || '').trim()

  return (
    <div
      className={`rounded-xl border px-4 py-3.5 mb-6 flex items-start gap-3 ${
        eligible
          ? 'border-success/30 bg-success-soft'
          : 'border-warning/30 bg-warning-soft'
      }`}
    >
      <div
        className={`shrink-0 h-9 w-9 rounded-full flex items-center justify-center ${
          eligible ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'
        }`}
      >
        {eligible ? (
          <CheckCircle2 className="h-5 w-5" />
        ) : (
          <AlertCircle className="h-5 w-5" />
        )}
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
            : info.formDriver.notEligibleReason ||
              'Cuando aprobemos los pasos pendientes vas a poder reservar.'}
        </div>
      </div>
    </div>
  )
}
