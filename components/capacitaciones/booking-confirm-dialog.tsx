'use client'

import { useEffect, useState } from 'react'
import { Loader2, Calendar, Clock, MapPin, Video, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatPYLong } from '@/lib/utils/onboarding-time'
import type { SlotResponse } from '@/lib/types/onboarding-rules.types'

interface Profile {
  firstName: string
  lastName: string
  cedula: string
  phoneNumber: string
  email: string
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  shareToken: string | undefined
  selectedSlot: SlotResponse | null
  ruleTitle?: string
  onConfirm: (confirmedProfile: Profile) => Promise<void>
  loading: boolean
}

const MODALITY_ICON = {
  IN_PERSON: MapPin,
  VIRTUAL: Video,
  HYBRID: Zap,
} as const

const MODALITY_LABEL = {
  IN_PERSON: 'Presencial',
  VIRTUAL: 'Virtual',
  HYBRID: 'Híbrida',
} as const

export function BookingConfirmDialog({
  open,
  onOpenChange,
  shareToken,
  selectedSlot,
  ruleTitle,
  onConfirm,
  loading,
}: Props) {
  const [profile, setProfile] = useState<Profile>({
    firstName: '',
    lastName: '',
    cedula: '',
    phoneNumber: '',
    email: '',
  })
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileLoaded, setProfileLoaded] = useState(false)

  // Cargar el perfil cuando el dialog se abre
  useEffect(() => {
    if (!open || !shareToken || profileLoaded) return
    let cancelled = false
    setProfileLoading(true)
    fetch('/api/public/auth/session/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shareToken }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (cancelled) return
        const p = d.profile || {}
        setProfile({
          firstName: p.firstName || '',
          lastName: p.lastName || '',
          cedula: p.cedula || '',
          phoneNumber: p.phoneNumber || '',
          email: p.email || '',
        })
        setProfileLoaded(true)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setProfileLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, shareToken, profileLoaded])

  // Reset al cerrar para que la próxima apertura recargue datos frescos
  useEffect(() => {
    if (!open) {
      setProfileLoaded(false)
    }
  }, [open])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!profile.firstName.trim() || !profile.lastName.trim() || !profile.cedula.trim() || !profile.phoneNumber.trim()) {
      return
    }
    void onConfirm(profile)
  }

  const Icon = selectedSlot ? MODALITY_ICON[selectedSlot.modality] : Calendar

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Confirmá tus datos</DialogTitle>
            <DialogDescription>
              Verificá que esté todo correcto antes de reservar tu lugar.
            </DialogDescription>
          </DialogHeader>

          {/* Resumen del slot seleccionado */}
          {selectedSlot && (
            <div className="mt-4 rounded-lg border bg-muted/30 p-3.5">
              <div className="flex items-start gap-3">
                <div className="shrink-0 h-10 w-10 rounded-md bg-brand-soft text-brand flex items-center justify-center">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  {ruleTitle && (
                    <div className="font-semibold text-sm leading-tight">{ruleTitle}</div>
                  )}
                  <div className="text-xs text-muted-foreground mt-0.5 first-letter:uppercase">
                    {formatPYLong(new Date(selectedSlot.scheduledDateUTC))}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-xs">
                    <span className="inline-flex items-center gap-1 font-semibold tabular-nums">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      {selectedSlot.startTime} — {selectedSlot.endTime}
                    </span>
                    <span className="text-muted-foreground">
                      {MODALITY_LABEL[selectedSlot.modality]}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <div className="grid gap-4 py-4">
            {profileLoading ? (
              <>
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName" className="text-xs font-medium">
                      Nombre <span className="text-brand">*</span>
                    </Label>
                    <Input
                      id="firstName"
                      value={profile.firstName}
                      onChange={(e) => setProfile((p) => ({ ...p, firstName: e.target.value }))}
                      className="h-10"
                      autoComplete="given-name"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lastName" className="text-xs font-medium">
                      Apellido <span className="text-brand">*</span>
                    </Label>
                    <Input
                      id="lastName"
                      value={profile.lastName}
                      onChange={(e) => setProfile((p) => ({ ...p, lastName: e.target.value }))}
                      className="h-10"
                      autoComplete="family-name"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cedula" className="text-xs font-medium">
                    Cédula <span className="text-brand">*</span>
                  </Label>
                  <Input
                    id="cedula"
                    value={profile.cedula}
                    onChange={(e) => setProfile((p) => ({ ...p, cedula: e.target.value }))}
                    placeholder="1234567"
                    className="h-10"
                    inputMode="numeric"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phoneNumber" className="text-xs font-medium">
                    Teléfono <span className="text-brand">*</span>
                  </Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    value={profile.phoneNumber}
                    onChange={(e) => setProfile((p) => ({ ...p, phoneNumber: e.target.value }))}
                    placeholder="+595 9XX XXX XXX"
                    className="h-10"
                    autoComplete="tel"
                    required
                  />
                </div>
                {profile.email && (
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-medium">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                      placeholder="tu@email.com"
                      className="h-10"
                      autoComplete="email"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Te enviamos la confirmación con el ICS para tu calendario.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || profileLoading}
              className="bg-brand text-brand-foreground hover:bg-brand-hover"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar reserva
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
