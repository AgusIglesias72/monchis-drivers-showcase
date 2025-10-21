// components/admin/schedule-onboarding-modal.tsx
"use client"

import { useEffect, useState } from 'react'
import { ScheduleOnboardingModalClient } from './schedule-onboarding-modal-client'
import { getAvailableOnboardingEvents } from '@/lib/actions/onboarding.actions'
import { Loader2 } from 'lucide-react'

interface ScheduleOnboardingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  driverId: string
  driverName: string
  onSuccess: () => void
}

export function ScheduleOnboardingModal({
  open,
  onOpenChange,
  driverId,
  driverName,
  onSuccess,
}: ScheduleOnboardingModalProps) {
  const [events, setEvents] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (open) {
      loadEvents()
    }
  }, [open])

  const loadEvents = async () => {
    setIsLoading(true)
    try {
      const result = await getAvailableOnboardingEvents()
      if (result.success) {
        setEvents(result.events || [])
      } else {
        console.error('Error al cargar eventos:', result.error)
        setEvents([])
      }
    } catch (error) {
      console.error('Error:', error)
      setEvents([])
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <ScheduleOnboardingModalClient
      open={open}
      onOpenChange={onOpenChange}
      driverId={driverId}
      driverName={driverName}
      events={events}
      onSuccess={onSuccess}
    />
  )
}