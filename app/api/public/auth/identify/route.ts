// app/api/public/auth/identify/route.ts
//
// POST { cedula, phoneLast4 } → identifica al postulante por cédula + últimos 4
// del teléfono y emite/reusa un shareToken si es elegible. Reemplaza el flow
// engorroso del "pegá el link de WhatsApp": el driver ya tiene su FormDriver,
// le damos un atajo para recuperar la sesión sin cargar el link.
//
// Rate limit: 8 intentos / hora por IP (defensa contra fuerza bruta sobre la
// cédula).

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOrCreateActiveSession } from '@/lib/services/public-booking-session.service'
import { checkEligibility } from '@/lib/services/onboarding-eligibility'

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000
const RATE_LIMIT_MAX = 8
const counters = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(key: string): boolean {
  const now = Date.now()
  const rec = counters.get(key)
  if (!rec || now > rec.resetAt) {
    counters.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }
  if (rec.count >= RATE_LIMIT_MAX) return false
  rec.count++
  return true
}

interface IdentifyResponse {
  found: boolean
  shareToken?: string
  portalToken?: string // accessToken del portal — para ir directo a /postulacion/[token]
  formDriver?: {
    firstName: string | null
    lastName: string | null
    isEligible: boolean
    notEligibleReason: string | null
    postulationStatus: string
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const cedulaRaw: unknown = body?.cedula
    const phoneLast4Raw: unknown = body?.phoneLast4

    if (typeof cedulaRaw !== 'string' || typeof phoneLast4Raw !== 'string') {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    const cedula = cedulaRaw.replace(/\D/g, '')
    const phoneLast4 = phoneLast4Raw.replace(/\D/g, '')

    if (cedula.length < 5 || cedula.length > 15) {
      return NextResponse.json(
        { error: 'Ingresá tu cédula completa (solo números).' },
        { status: 400 },
      )
    }
    if (phoneLast4.length !== 4) {
      return NextResponse.json(
        { error: 'Necesitamos los últimos 4 dígitos de tu teléfono.' },
        { status: 400 },
      )
    }

    // Rate limit por IP
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'
    if (!checkRateLimit(`identify:${ip}`)) {
      return NextResponse.json(
        { error: 'Demasiados intentos. Intentá en una hora.' },
        { status: 429 },
      )
    }

    // Match por cédula. Si hay múltiples (poco común), filtramos por phoneLast4.
    const candidates = await prisma.formDriver.findMany({
      where: { cedula },
      include: {
        documents: {
          select: { documentType: true, status: true },
        },
      },
    })

    const driver = candidates.find(
      (d) => d.phoneNumber.replace(/\D/g, '').slice(-4) === phoneLast4,
    )

    const response: IdentifyResponse = { found: false }

    if (!driver) {
      // Sin filtrado: no decimos si la cédula existe o no para evitar leak.
      return NextResponse.json(response, { status: 200 })
    }

    const { isEligible, reason: notEligibleReason } = checkEligibility({
      status: driver.status,
      documentsStatus: driver.documentsStatus,
      firstName: driver.firstName,
      lastName: driver.lastName,
      documents: driver.documents,
      assistedCompletion: driver.assistedCompletion,
    })

    response.found = true
    response.formDriver = {
      firstName: driver.firstName,
      lastName: driver.lastName,
      isEligible,
      notEligibleReason,
      postulationStatus: driver.status,
    }
    if (driver.accessToken) {
      response.portalToken = driver.accessToken
    }

    if (isEligible) {
      const session = await getOrCreateActiveSession(
        driver.id,
        30,
        ip,
        request.headers.get('user-agent') || undefined,
      )
      response.shareToken = session.shareToken
    }

    // Persistimos la cookie del portal apenas hay match — independiente de
    // elegibilidad. Esto permite que /postulacion identifique al driver en SSR
    // sin necesidad de visitar /postulacion/<token> primero, y que el banner
    // de /capacitaciones aparezca pre-resuelto en la próxima carga.
    const res = NextResponse.json(response)
    if (driver.accessToken) {
      res.cookies.set('monchis_portal_token', driver.accessToken, {
        httpOnly: false,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 60, // 60 días
        path: '/',
      })
    }
    return res
  } catch (err) {
    console.error('[identify error]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
