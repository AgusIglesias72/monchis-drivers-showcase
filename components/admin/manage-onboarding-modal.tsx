// components/admin/manage-onboarding-modal.tsx
"use client"

import { ManageOnboardingModalClient } from './manage-onboarding-modal-client'

interface ManageOnboardingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  driverId: string
  driverName: string
  currentOnboarding: any | null  // ✅ Viene desde el servidor
  availableEvents: any[]         // ✅ Viene desde el servidor
  onSuccess: (action?: 'cancel' | 'assign' | 'reassign') => void
}

export function ManageOnboardingModal({
  open,
  onOpenChange,
  driverId,
  driverName,
  currentOnboarding,
  availableEvents,
  onSuccess,
}: ManageOnboardingModalProps) {
  return (
    <ManageOnboardingModalClient
      open={open}
      onOpenChange={onOpenChange}
      driverId={driverId}
      driverName={driverName}
      currentOnboarding={currentOnboarding}
      availableEvents={availableEvents}
      onSuccess={onSuccess}
    />
  )
}