// app/api/public/capacitaciones/[slug]/route.ts
// GET detalle público de una rule. 404 si no es activa o no es pública.

import { NextRequest, NextResponse } from 'next/server'
import { getRuleBySlug } from '@/lib/services/onboarding-rules.service'
import { mapOnboardingErrorToStatus } from '@/lib/services/onboarding-errors'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params
    const rule = await getRuleBySlug(slug)
    if (!rule || !rule.isActive || !rule.isPublic) {
      return NextResponse.json({ error: 'Capacitación no encontrada' }, { status: 404 })
    }
    return NextResponse.json(
      { rule },
      { headers: { 'Cache-Control': 'private, max-age=60' } },
    )
  } catch (err) {
    const { status, body } = mapOnboardingErrorToStatus(err)
    return NextResponse.json(body, { status })
  }
}
