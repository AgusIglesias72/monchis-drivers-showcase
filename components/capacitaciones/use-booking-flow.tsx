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
 */
export function useBookingFlow(initialSession?: string) {
  const router = useRouter()
  const [sessionToken, setSessionToken] = useState<string | undefined>(initialSession)
  const [pendingSlot, setPendingSlot] = useState<SlotResponse | null>(null)
  const [pendingTitle, setPendingTitle] = useState<string | undefined>(undefined)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showIdentity, setShowIdentity] = useState(false)
  const [booking, setBooking] = useState(false)

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
    if (!pendingSlot || !sessionToken) return
    setBooking(true)
    try {
      const res = await fetch('/api/public/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shareToken: sessionToken,
          eventId: pendingSlot.eventId || undefined,
          ruleId: pendingSlot.ruleId,
          scheduledDateUTC: pendingSlot.scheduledDateUTC,
          confirmedProfile: profile,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'No pudimos reservar')
      }
      const data = await res.json()
      toast.success('¡Reserva confirmada!')
      setShowConfirm(false)
      router.push(`/capacitaciones/reserva/${data.confirmationToken}`)
    } catch (err: any) {
      toast.error(err?.message || 'No pudimos reservar')
    } finally {
      setBooking(false)
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
    startBooking,
    handleIdentityValidated,
    handleConfirm,
  }
}
