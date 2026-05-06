// lib/services/onboarding-identity.ts
//
// Resuelve la identidad del driver en el server (SSR) leyendo la cookie del
// portal. Usado por /capacitaciones para identificar al driver sin que el
// cliente tenga que hacer una llamada de AutoIdentify (evita el flicker).
//
// Devuelve un objeto que el server puede pasar como prop al cliente para
// hidratar el banner, decidir qué secciones mostrar, etc.

import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { getOrCreateActiveSession } from './public-booking-session.service'
import { checkEligibility } from './onboarding-eligibility'

const PORTAL_TOKEN_COOKIE = 'monchis_portal_token'

export interface ResolvedIdentity {
  found: boolean
  shareToken: string | null
  portalToken: string | null
  driver: {
    firstName: string | null
    lastName: string | null
    isEligible: boolean
    notEligibleReason: string | null
    postulationStatus: string
    documentsStatus: string
  } | null
}

const EMPTY: ResolvedIdentity = {
  found: false,
  shareToken: null,
  portalToken: null,
  driver: null,
}

export async function resolveIdentityFromCookie(): Promise<ResolvedIdentity> {
  try {
    const cookieStore = await cookies()
    const portalToken = cookieStore.get(PORTAL_TOKEN_COOKIE)?.value
    if (!portalToken) return EMPTY

    const driver = await prisma.formDriver.findUnique({
      where: { accessToken: portalToken },
      include: { documents: { select: { documentType: true, status: true } } },
    })
    if (!driver) return { ...EMPTY, portalToken }

    const eligibility = checkEligibility({
      status: driver.status,
      documentsStatus: driver.documentsStatus,
      firstName: driver.firstName,
      lastName: driver.lastName,
      documents: driver.documents,
    })

    let shareToken: string | null = null
    if (eligibility.isEligible) {
      const session = await getOrCreateActiveSession(driver.id, 30)
      shareToken = session.shareToken
    }

    return {
      found: true,
      shareToken,
      portalToken,
      driver: {
        firstName: driver.firstName,
        lastName: driver.lastName,
        isEligible: eligibility.isEligible,
        notEligibleReason: eligibility.reason,
        postulationStatus: driver.status,
        documentsStatus: driver.documentsStatus,
      },
    }
  } catch (err) {
    console.error('[resolveIdentityFromCookie] error', err)
    return EMPTY
  }
}
