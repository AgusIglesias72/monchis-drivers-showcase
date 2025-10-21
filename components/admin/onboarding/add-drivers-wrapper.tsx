// components/admin/onboarding/add-drivers-wrapper.tsx
// Este es un Server Component que pasa datos al Client Component

import { AddDriversSectionClient } from './add-drivers-section-client'

interface Driver {
  id: string
  fullName: string | null
  phoneNumber: string
  email: string | null
  cedula: string
  documentsStatus: string
  onboardingStatus: string | null
  onboardingScheduledAt: string | null
  status: string
  createdAt: string
  lastActivityAt: string | null
  isAssignedToOtherEvent: boolean
  canBeSelected: boolean
  disabledReason: string | null
  assignedEvent: {
    id: string
    title: string | null
    scheduledDate: string
  } | null
}

interface AddDriversWrapperProps {
  eventId: string
  initialDrivers: Driver[]
  initialPagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasMore: boolean
  }
  onSuccess: () => void
}

export function AddDriversWrapper({ 
  eventId, 
  initialDrivers,
  initialPagination,
  onSuccess 
}: AddDriversWrapperProps) {
  return (
    <AddDriversSectionClient
      eventId={eventId}
      initialDrivers={initialDrivers}
      initialPagination={initialPagination}
      onSuccess={onSuccess}
    />
  )
}