'use client'

// Pantalla post-submit del form público: muestra la revisión IA en tiempo real
// y resuelve a uno de 3 desenlaces (calendario de capacitación, en revisión,
// o motivos + WhatsApp). Hace polling read-only a /api/form/decision-status;
// cualquier error/timeout degrada a "en revisión" — nunca bloquea al postulante.

import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Check, Clock, Loader2, X } from 'lucide-react'
import { addMonths, endOfMonth, startOfMonth } from 'date-fns'
import { Button } from '@/components/ui/button'
import { WHATSAPP_ACQUISITION_URL } from '@/lib/constants/contact'
import { LandingCalendar } from '@/components/capacitaciones/landing-calendar'
import { ymdInTZ } from '@/lib/utils/onboarding-time'
import type { PublicCheck } from '@/lib/services/agent.service'

// Mismo rojo del form público (FormularioMonchis.tsx).
const MONCHIS_RED = '#e7243f'

const POLL_INTERVAL_MS = 2500
// Debe cubrir el peor caso del servidor antes de degradar a 'review': el race
// del pipeline (AGENT_RACE_BUDGET_MS, 45s) + la ventana del auto-approve
// (AUTO_APPROVE_SETTLE_BUDGET_MS, 15s) de realtime-decision.service, más margen
// de polling. Si esos budgets cambian, ajustar acá — un cliente que abandona
// antes que el servidor convierte aprobaciones lentas en 'review' irreversible.
const POLL_BUDGET_MS = 75_000
// Mínimo en 'reviewing' para que la animación no parpadee si la decisión ya
// estaba resuelta (ej. el cron procesó al postulante en step 5/6).
const MIN_REVIEWING_MS = 4000
export const DECISION_SESSION_KEY = 'monchis_decision_session'

type Phase = 'reviewing' | 'approved' | 'review' | 'rejected'

const CHECK_LABELS: Record<PublicCheck['key'], string> = {
  identidad: 'Documento de identidad',
  antecedentes: 'Certificado de antecedentes',
  ruc: 'Datos fiscales (RUC)',
}

interface Props {
  sessionId: string
  firstName: string
  lastName: string
  onShareWhatsApp: () => void
}

export function PostSubmitDecision({ sessionId, firstName, lastName, onShareWhatsApp }: Props) {
  const [phase, setPhase] = useState<Phase>('reviewing')
  const [checks, setChecks] = useState<PublicCheck[] | null>(null)
  const [shareToken, setShareToken] = useState<string | null>(null)
  const [names, setNames] = useState({ firstName, lastName })

  // Polling del estado real de la decisión.
  useEffect(() => {
    let cancelled = false
    const startedAt = Date.now()

    const settle = (next: Phase, nextChecks: PublicCheck[] | null, token: string | null) => {
      const apply = () => {
        if (cancelled) return
        setChecks(nextChecks)
        setShareToken(token)
        setPhase(next)
      }
      const remaining = MIN_REVIEWING_MS - (Date.now() - startedAt)
      if (remaining > 0) setTimeout(apply, remaining)
      else apply()
    }

    const tick = async () => {
      if (cancelled) return
      if (Date.now() - startedAt > POLL_BUDGET_MS) {
        settle('review', null, null)
        return
      }
      try {
        const r = await fetch('/api/form/decision-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        })
        if (r.status === 404) {
          settle('review', null, null)
          return
        }
        if (r.ok) {
          const d = await r.json()
          if (!cancelled && (d.firstName || d.lastName)) {
            setNames((prev) => ({
              firstName: prev.firstName || d.firstName || '',
              lastName: prev.lastName || d.lastName || '',
            }))
          }
          if (d.state === 'approved' && d.booking?.shareToken) {
            settle('approved', d.checks ?? null, d.booking.shareToken)
            return
          }
          if (d.state === 'rejected') {
            settle('rejected', d.checks ?? null, null)
            return
          }
          if (d.state === 'review') {
            settle('review', d.checks ?? null, null)
            return
          }
          // 'pending' (o approved sin token): seguir poleando dentro del budget.
        }
      } catch {
        // Error de red: reintentar hasta agotar el budget.
      }
      if (!cancelled) setTimeout(tick, POLL_INTERVAL_MS)
    }

    void tick()
    return () => {
      cancelled = true
    }
  }, [sessionId])

  // Efectos al llegar a un estado terminal: limpiar la sesión de recovery y
  // guardar el shareToken para que el flow de booking pueda recuperarlo.
  useEffect(() => {
    if (phase === 'reviewing') return
    try {
      localStorage.removeItem(DECISION_SESSION_KEY)
    } catch {}
    if (phase === 'approved' && shareToken) {
      try {
        localStorage.setItem('monchis.bookingShareToken', shareToken)
      } catch {}
    }
  }, [phase, shareToken])

  const consultWhatsApp = useCallback(() => {
    const fullName = [names.firstName, names.lastName].filter(Boolean).join(' ').trim()
    const message = encodeURIComponent(
      `Hola! Quisiera consultar por mi postulación de driver de Monchis.` +
        (fullName ? `\n\nNombre: ${fullName}` : ''),
    )
    window.open(`${WHATSAPP_ACQUISITION_URL}?text=${message}`, '_blank')
  }, [names])

  if (phase === 'reviewing') {
    return (
      <Shell>
        <ReviewingContent />
      </Shell>
    )
  }

  if (phase === 'approved' && shareToken) {
    return (
      <Shell wide>
        <ApprovedContent shareToken={shareToken} />
      </Shell>
    )
  }

  if (phase === 'rejected') {
    return (
      <Shell>
        <RejectedContent checks={checks} onConsult={consultWhatsApp} />
      </Shell>
    )
  }

  return (
    <Shell>
      <ReviewContent onConsult={consultWhatsApp} onShareWhatsApp={onShareWhatsApp} />
    </Shell>
  )
}

// ───────────────────── Layout compartido ─────────────────────

function Shell({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div
      className="min-h-screen relative overflow-hidden flex items-center justify-center p-4 py-10"
      style={{ backgroundColor: MONCHIS_RED }}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-white/15 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-white/10 rounded-full blur-3xl"></div>
      </div>
      <div
        className={`${wide ? 'max-w-3xl' : 'max-w-md'} w-full bg-white rounded-3xl shadow-2xl p-6 md:p-8 relative z-10`}
      >
        {children}
      </div>
    </div>
  )
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  )
}

// ───────────────────── Reviewing ─────────────────────

const REVIEWING_ITEMS = ['Documento de identidad', 'Certificado de antecedentes', 'Datos fiscales']
const REVIEWING_DELAYS_MS = [3000, 6000, 9000]

function ReviewingContent() {
  // Animación de percepción: los ítems pasan de spinner a check con delays
  // fijos mientras el polling real decide. No refleja el estado del backend.
  const [doneCount, setDoneCount] = useState(0)

  useEffect(() => {
    const timers = REVIEWING_DELAYS_MS.map((ms, i) =>
      setTimeout(() => setDoneCount((n) => Math.max(n, i + 1)), ms),
    )
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <div className="text-center">
      <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: `${MONCHIS_RED}15` }}>
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: MONCHIS_RED }} />
      </div>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Estamos revisando tu postulación</h2>
      <p className="text-gray-600 mb-6">Esto suele tomar menos de un minuto. No cierres esta pantalla.</p>

      <div className="text-left space-y-3">
        {REVIEWING_ITEMS.map((label, i) => {
          const done = i < doneCount
          return (
            <div key={label} className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
              {done ? (
                <span className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <Check className="w-4 h-4 text-green-600" />
                </span>
              ) : (
                <Loader2 className="w-5 h-5 text-gray-400 animate-spin shrink-0" />
              )}
              <span className={`text-sm font-medium ${done ? 'text-gray-800' : 'text-gray-500'}`}>
                {label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ───────────────────── Approved ─────────────────────

function ApprovedContent({ shareToken }: { shareToken: string }) {
  // null = todavía chequeando disponibilidad; false = sin fechas publicadas.
  const [hasSlots, setHasSlots] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const today = new Date()
        const from = ymdInTZ(startOfMonth(today))
        const to = ymdInTZ(endOfMonth(addMonths(today, 1)))
        const r = await fetch(`/api/public/capacitaciones/slots?from=${from}&to=${to}`)
        if (!r.ok) {
          // Si el check falla, degradamos al calendario normal (él maneja su carga).
          if (!cancelled) setHasSlots(true)
          return
        }
        const d = await r.json()
        const slots = (d.slots || []) as Array<{
          isFull?: boolean
          isPast?: boolean
          isPastNotice?: boolean
        }>
        const available = slots.some((s) => !s.isFull && !s.isPast && !s.isPastNotice)
        if (!cancelled) setHasSlots(available)
      } catch {
        if (!cancelled) setHasSlots(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div>
      <div className="text-center mb-6">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Tu postulación fue aprobada!</h2>
        <p className="text-gray-600">Elegí día y horario para tu capacitación.</p>
      </div>

      {hasSlots === null && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
        </div>
      )}

      {hasSlots === true && (
        <>
          <LandingCalendar sessionToken={shareToken} hideHeader />
          <p className="text-xs text-gray-500 text-center mt-4">
            Si preferís agendar más tarde, entrá a{' '}
            <Link href="/capacitaciones" className="underline font-medium text-gray-700">
              monchisdrivers.com/capacitaciones
            </Link>
            .
          </p>
        </>
      )}

      {hasSlots === false && (
        <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-6 text-center">
          <p className="text-sm text-gray-700 font-medium mb-1">
            Todavía no hay fechas publicadas
          </p>
          <p className="text-sm text-gray-500">
            Te vamos a avisar por WhatsApp cuando haya capacitaciones disponibles para agendarte.
          </p>
        </div>
      )}
    </div>
  )
}

// ───────────────────── Review (en revisión) ─────────────────────

function ReviewContent({
  onConsult,
  onShareWhatsApp,
}: {
  onConsult: () => void
  onShareWhatsApp: () => void
}) {
  return (
    <div className="text-center">
      <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Clock className="w-10 h-10 text-amber-600" />
      </div>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Tu postulación quedó en revisión</h2>
      <p className="text-gray-600 mb-6">
        Nuestro equipo la va a revisar y te avisamos por WhatsApp en las próximas 24-48 horas.
      </p>

      <Button onClick={onConsult} variant="outline" className="w-full cursor-pointer">
        <WhatsAppIcon className="w-6 h-6 mr-2" />
        Consultar sobre mi postulación
      </Button>

      <div className="mt-8 pt-6 border-t border-gray-200">
        <p className="text-sm text-gray-700 font-medium mb-3">
          ¿Conocés a otra persona a la que le pueda interesar?
        </p>
        <p className="text-xs text-gray-500 mb-4">Compartir por:</p>
        <Button
          onClick={onShareWhatsApp}
          className="w-full bg-green-500 hover:bg-green-600 text-white cursor-pointer"
        >
          <WhatsAppIcon className="w-6 h-6 mr-2" />
          WhatsApp
        </Button>
      </div>
    </div>
  )
}

// ───────────────────── Rejected ─────────────────────

function RejectedContent({
  checks,
  onConsult,
}: {
  checks: PublicCheck[] | null
  onConsult: () => void
}) {
  const hasChecks = !!checks && checks.length > 0

  return (
    <div className="text-center">
      <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
        <X className="w-10 h-10" style={{ color: MONCHIS_RED }} />
      </div>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Revisamos tu postulación</h2>
      <p className="text-gray-600 mb-6">
        {hasChecks
          ? 'Encontramos algunos puntos que impiden avanzar por ahora:'
          : 'Encontramos puntos que requieren revisión. Escribinos por WhatsApp para ver tu caso.'}
      </p>

      {hasChecks && (
        <div className="text-left space-y-3 mb-6">
          {checks.map((check) => (
            <div
              key={check.key}
              className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3"
            >
              {check.status === 'ok' ? (
                <span className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-4 h-4 text-gray-500" />
                </span>
              ) : check.status === 'warn' ? (
                <span className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                </span>
              ) : (
                <span className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                  <X className="w-4 h-4 text-red-600" />
                </span>
              )}
              <div>
                <div className="text-sm font-medium text-gray-800">{CHECK_LABELS[check.key]}</div>
                {check.status !== 'ok' && (
                  <div className="text-sm text-gray-600 mt-0.5">{check.motive}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Button
        onClick={onConsult}
        className="w-full text-white cursor-pointer"
        style={{ backgroundColor: MONCHIS_RED }}
      >
        <WhatsAppIcon className="w-6 h-6 mr-2" />
        Consultar por mi postulación
      </Button>
      <p className="text-xs text-gray-500 mt-4">
        Si creés que hay un error o querés volver a intentarlo, escribinos.
      </p>
    </div>
  )
}

export default PostSubmitDecision
