'use client'

import { BookingConfirmDialog } from './booking-confirm-dialog'
import { IdentityModal } from './identity-modal'
import type { useBookingFlow } from './use-booking-flow'

type Flow = ReturnType<typeof useBookingFlow>

/**
 * Renderiza los modales del flujo (identity → confirm) controlados por
 * useBookingFlow. Cada componente que use el hook puede renderizar este wrapper
 * sin duplicar el árbol de modales.
 */
export function BookingFlowDialogs({ flow }: { flow: Flow }) {
  return (
    <>
      <IdentityModal
        open={flow.showIdentity}
        onOpenChange={flow.setShowIdentity}
        onValidated={flow.handleIdentityValidated}
      />
      <BookingConfirmDialog
        open={flow.showConfirm}
        onOpenChange={flow.setShowConfirm}
        shareToken={flow.sessionToken}
        selectedSlot={flow.pendingSlot}
        ruleTitle={flow.pendingTitle}
        onConfirm={flow.handleConfirm}
        loading={flow.booking}
      />
    </>
  )
}
