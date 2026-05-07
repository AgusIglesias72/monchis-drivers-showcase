// lib/services/preview-identity.ts
//
// Devuelve identidades mockeadas para el modo preview de /capacitaciones.
// Solo se aplica si la request viene de un usuario autenticado en Clerk —
// para postulantes anónimos el query param ?preview= no tiene efecto.
//
// El widget <PreviewModeToggle /> dispara estos estados desde la UI.

import { auth } from '@clerk/nextjs/server'
import type { ResolvedIdentity } from './onboarding-identity'

export type PreviewIdentityState = 'anonymous' | 'eligible' | 'pending'

const PREVIEW_STATES = new Set<PreviewIdentityState>(['anonymous', 'eligible', 'pending'])

export function isPreviewState(value: unknown): value is PreviewIdentityState {
  return typeof value === 'string' && PREVIEW_STATES.has(value as PreviewIdentityState)
}

/**
 * Resuelve el preview state a aplicar para esta request. Devuelve null si no
 * corresponde — sea porque no se pasó param, el valor es inválido, o el
 * usuario no está autenticado en Clerk.
 */
export async function resolvePreviewState(
  rawValue: string | undefined,
): Promise<PreviewIdentityState | null> {
  if (!rawValue || !isPreviewState(rawValue)) return null
  const { userId } = await auth()
  if (!userId) return null
  return rawValue
}

export function getPreviewIdentity(state: PreviewIdentityState): ResolvedIdentity {
  switch (state) {
    case 'anonymous':
      return {
        found: false,
        shareToken: null,
        portalToken: null,
        driver: null,
      }
    case 'eligible':
      return {
        found: true,
        shareToken: 'preview-share-token',
        portalToken: 'preview-portal-token',
        driver: {
          firstName: 'Demo',
          lastName: 'Postulante',
          isEligible: true,
          notEligibleReason: null,
          postulationStatus: 'APPROVED',
          documentsStatus: 'APPROVED',
        },
      }
    case 'pending':
      return {
        found: true,
        shareToken: null,
        portalToken: 'preview-portal-token',
        driver: {
          firstName: 'Demo',
          lastName: 'Postulante',
          isEligible: false,
          notEligibleReason: 'Falta validar antecedentes policiales',
          postulationStatus: 'PENDING_REVIEW',
          documentsStatus: 'IN_REVIEW',
        },
      }
  }
}
