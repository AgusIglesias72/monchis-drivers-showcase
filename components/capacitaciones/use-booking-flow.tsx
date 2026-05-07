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
  const isReschedule = Boolean(rescheduleToken)

  // Recovery del shareToken desde localStorage si no vino en URL ni initial.
  useEffect(() => {
    if (sessionToken) return
    try {
      const stored = localStorage.getItem('monchis.bookingShareToken')
      if (stored) setSessionToken(stored)
    } catch {}
  }, [sessionToken])

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
        throw new Error(err.error || (isReschedule ? 'No pudimos reagendar' : 'No pudimos reservar'))
      }
      const data = await res.json()
      toast.success(isReschedule ? '¡Reserva reagendada!' : '¡Reserva confirmada!')
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
    startBooking: isReschedule ? startBookingForReschedule : startBooking,
    handleIdentityValidated,
    handleConfirm,
  }
}
