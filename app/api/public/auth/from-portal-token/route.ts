// app/api/public/auth/from-portal-token/route.ts
//
// POST { accessToken } → shareToken + info de elegibility, dado el accessToken
// del portal de postulación. Permite que el driver salte el modal de identidad
// si ya tenemos su token de portal en localStorage.

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOrCreateActiveSession } from '@/lib/services/public-booking-session.service'
import { checkEligibility } from '@/lib/services/onboarding-eligibility'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const accessToken: unknown = body?.accessToken

    if (typeof accessToken !== 'string' || accessToken.length < 8) {
      return NextResponse.json({ error: 'accessToken inválido' }, { status: 400 })
    }

    const driver = await prisma.formDriver.findUnique({
      where: { accessToken },
      include: {
        documents: { select: { documentType: true, status: true } },
      },
    })

    if (!driver) {
      // Token inexistente: respondemos found:false sin filtrar info
      return NextResponse.json({ found: false })
    }

    const { isEligible, reason: notEligibleReason } = checkEligibility({
      status: driver.status,
      documentsStatus: driver.documentsStatus,
      firstName: driver.firstName,
      lastName: driver.lastName,
      documents: driver.documents,
      assistedCompletion: driver.assistedCompletion,
    })

    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      undefined
    const userAgent = request.headers.get('user-agent') || undefined

    const response: {
      found: boolean
      shareToken?: string
      formDriver: {
        firstName: string | null
        lastName: string | null
        isEligible: boolean
        notEligibleReason: string | null
        postulationStatus: string
      }
    } = {
      found: true,
      formDriver: {
        firstName: driver.firstName,
        lastName: driver.lastName,
        isEligible,
        notEligibleReason,
        postulationStatus: driver.status,
      },
    }

    if (isEligible) {
      const session = await getOrCreateActiveSession(driver.id, 30, ip, userAgent)
      response.shareToken = session.shareToken
    }

    return NextResponse.json(response)
  } catch (err) {
    console.error('[from-portal-token error]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
