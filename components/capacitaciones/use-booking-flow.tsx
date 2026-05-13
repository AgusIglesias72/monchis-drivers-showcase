'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { SlotResponse } from '@/lib/types/onboarding-rules.types'

interface ConfirmedProfile {
  firstName: string
  lastName: string
  cedula: string
  phoneNumber: string
  email: string
}

/** Detalle mínimo de la reserva actual que mostramos en el dialog de reschedule. */
export interface CurrentBookingSummary {
  scheduledDateUTC: string
  startTime: string
  endTime: string
}

/**
 * Centraliza el flow de reserva: gating de identidad, dialog de confirmación y
 * POST al endpoint. Tanto el calendar overview de la landing como las cards de
 * cada rule lo usan para abrir el booking sin tener que navegar al detail.
 *
 * Si se pasa `rescheduleToken`, los flows POST van a /reschedule en lugar de
 * crear una reserva nueva (no hace falta pedir confirmedProfile en ese caso).
 */
export function useBookingFlow(initialSession?: string, rescheduleToken?: string) {
  const router = useRouter()
  const [sessionToken, setSessionToken] = useState<string | undefined>(initialSession)
  const [pendingSlot, setPendingSlot] = useState<SlotResponse | null>(null)
  const [pendingTitle, setPendingTitle] = useState<string | undefined>(undefined)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showIdentity, setShowIdentity] = useState(false)
  const [booking, setBooking] = useState(false)
  const [currentBooking, setCurrentBooking] = useState<CurrentBookingSummary | null>(null)
  const isReschedule = Boolean(rescheduleToken)

  // Recovery del shareToken desde localStorage si no vino en URL ni initial.
  useEffect(() => {
    if (sessionToken) return
    try {
      const stored = localStorage.getItem('monchis.bookingShareToken')
      if (stored) setSessionToken(stored)
    } catch {}
  }, [sessionToken])

  // En reschedule: traemos los datos de la reserva actual para que el dialog
  // pueda mostrar el "De / A" comparativo. Si el fetch falla, el dialog cae a
  // su copy genérico — preferimos degradar antes que bloquear el flujo.
  useEffect(() => {
    if (!rescheduleToken) return
    let cancelled = false
    fetch(`/api/public/booking/${rescheduleToken}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (cancelled) return
        if (d?.scheduledDateUTC && d?.startTime && d?.endTime) {
          setCurrentBooking({
            scheduledDateUTC: d.scheduledDateUTC,
            startTime: d.startTime,
            endTime: d.endTime,
          })
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [rescheduleToken])

  function startBooking(slot: SlotResponse, ruleTitle?: string) {
    setPendingSlot(slot)
    setPendingTitle(ruleTitle ?? slot.ruleTitle)
    if (!sessionToken) {
      setShowIdentity(true)
    } else {
      setShowConfirm(true)
    }
  }

  function handleIdentityValidated(token: string) {
    setSessionToken(token)
    setShowIdentity(false)
    if (pendingSlot) {
      // Pequeño delay para evitar conflicto con la animación de cierre del modal
      setTimeout(() => setShowConfirm(true), 80)
    }
  }

  async function handleConfirm(profile: ConfirmedProfile) {
    if (!pendingSlot) return
    if (!isReschedule && !sessionToken) return

    setBooking(true)
    try {
      // Pre-flight: re-validar disponibilidad del slot por si otro driver lo
      // ocupó entre que se abrió el dialog y el submit. Sin esto, el backend
      // rechaza con 409 EVENT_FULL y el postulante ve un toast genérico sin
      // entender qué pasó ("recién lo vi disponible"). Es defensa ligera —
      // el backend sigue siendo la autoridad final (OCC con retries).
      const stillAvailable = await isSlotStillAvailable(pendingSlot)
      if (!stillAvailable) {
        toast.error(
          'Ese horario se llenó hace unos segundos. Elegí otro slot para continuar.',
          { duration: 6000 },
        )
        setShowConfirm(false)
        return
      }

      const url = isReschedule
        ? `/api/public/booking/${rescheduleToken}/reschedule`
        : '/api/public/booking'
      const body = isReschedule
        ? {
            eventId: pendingSlot.eventId || undefined,
            ruleId: pendingSlot.ruleId,
            scheduledDateUTC: pendingSlot.scheduledDateUTC,
          }
        : {
            shareToken: sessionToken,
            eventId: pendingSlot.eventId || undefined,
            ruleId: pendingSlot.ruleId,
            scheduledDateUTC: pendingSlot.scheduledDateUTC,
            confirmedProfile: profile,
          }
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        // 409 puede ser "EVENT_FULL" o "DOUBLE_BOOKING" — mensaje específico
        if (res.status === 409 && err.error?.toLowerCase?.().includes('full')) {
          toast.error('Ese horario se llenó. Elegí otro slot para continuar.', { duration: 6000 })
          setShowConfirm(false)
          return
        }
        throw new Error(err.error || (isReschedule ? 'No pudimos reagendar' : 'No pudimos reservar'))
      }
      const data = await res.json()
      toast.success(isReschedule ? '¡Reserva reagendada!' : '¡Reserva confirmada!')
      // Con WhatsApp aún caído y email opcional, un driver sin email queda sin
      // ningún canal de confirmación además de la URL. Le avisamos para que
      // bookmarkee la página de detalle a la que estamos por redirigir.
      if (!isReschedule && !profile.email?.trim()) {
        toast('No nos diste email — guardá esta página para volver a verla.', {
          duration: 7000,
          icon: '📌',
        })
      }
      setShowConfirm(false)
      // El reschedule genera un nuevo confirmationToken (la attendee anterior queda
      // CANCELLED); siempre usamos el que devuelve el API.
      router.push(`/capacitaciones/reserva/${data.confirmationToken}`)
    } catch (err: any) {
      toast.error(err?.message || (isReschedule ? 'No pudimos reagendar' : 'No pudimos reservar'))
    } finally {
      setBooking(false)
    }
  }

  function startBookingForReschedule(slot: SlotResponse, ruleTitle?: string) {
    // En reschedule no hace falta identity — el rescheduleToken ya autentica
    setPendingSlot(slot)
    setPendingTitle(ruleTitle ?? slot.ruleTitle)
    setShowConfirm(true)
  }

  /**
   * Refetch del slot pedido para confirmar que sigue con cupos antes de postear.
   * Usa el endpoint público de slots de la rule con un rango chico del día del
   * evento, y matchea por scheduledDateUTC. Si el fetch falla por red, devolvemos
   * true (no bloqueamos el flow — el backend valida igual).
   */
  async function isSlotStillAvailable(slot: SlotResponse): Promise<boolean> {
    if (!slot.ruleSlug) return true
    try {
      const ymd = slot.scheduledDateUTC.slice(0, 10)
      const res = await fetch(
        `/api/public/capacitaciones/${slot.ruleSlug}/slots?from=${ymd}&to=${ymd}`,
        { cache: 'no-store' },
      )
      if (!res.ok) return true
      const data = await res.json()
      const slots: SlotResponse[] = data?.slots ?? []
      const fresh = slots.find((s) => s.scheduledDateUTC === slot.scheduledDateUTC)
      if (!fresh) return true
      return fresh.availableSlots > 0 && !fresh.isFull && !fresh.isPastNotice && !fresh.isPast
    } catch {
      return true
    }
  }

  return {
    sessionToken,
    pendingSlot,
    pendingTitle,
    showConfirm,
    setShowConfirm,
    showIdentity,
    setShowIdentity,
    booking,
    isReschedule,
    currentBooking,
    startBooking: isReschedule ? startBookingForReschedule : startBooking,
    handleIdentityValidated,
    handleConfirm,
  }
}
