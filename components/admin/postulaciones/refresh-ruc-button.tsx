'use client'

import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface RefreshRucButtonProps {
  driverId: string
  onSuccess?: () => void
}

export function RefreshRucButton({ driverId, onSuccess }: RefreshRucButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isLoading) return

    setIsLoading(true)
    const toastId = toast.loading('Consultando RUC…')

    try {
      const res = await fetch(`/api/admin/postulaciones/${driverId}/refresh-ruc`, {
        method: 'POST',
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data?.error || 'Error al consultar RUC', { id: toastId })
        return
      }

      const status = data?.driver?.rucStatus ?? '—'
      const name = data?.driver?.rucName
      toast.success(`RUC: ${status}${name ? ` — ${name}` : ''}`, { id: toastId })
      onSuccess?.()
    } catch (err) {
      console.error('[refresh-ruc] ', err)
      toast.error('Error de red al consultar RUC', { id: toastId })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      disabled={isLoading}
      className="w-full justify-start text-left gap-2 h-auto py-2 px-2 font-normal"
    >
      <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
      <span className="flex-1">{isLoading ? 'Consultando…' : 'Actualizar RUC'}</span>
    </Button>
  )
}
