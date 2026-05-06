'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Calendar, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  portalToken: string
  disabled?: boolean
  disabledReason?: string
}

export function BookingRecoveryButton({ portalToken, disabled, disabledReason }: Props) {
  const [busy, setBusy] = useState(false)

  async function go() {
    setBusy(true)
    try {
      const res = await fetch(`/api/postulacion/${portalToken}/booking-session`, { method: 'POST' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'No pudimos generar tu link')
      }
      const data = await res.json()
      window.location.href = data.redirectUrl || `/capacitaciones?session=${data.shareToken}`
    } catch (err: any) {
      toast.error(err?.message || 'Error al generar link')
      setBusy(false)
    }
  }

  if (disabled) {
    return (
      <Button disabled variant="outline" className="w-full" title={disabledReason}>
        <Calendar className="mr-2 h-4 w-4" />
        {disabledReason || 'Aún no podés reservar'}
      </Button>
    )
  }

  return (
    <Button
      onClick={go}
      disabled={busy}
      className="w-full bg-brand text-brand-foreground hover:bg-brand-hover"
    >
      {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Calendar className="mr-2 h-4 w-4" />}
      Reservar mi capacitación →
    </Button>
  )
}
