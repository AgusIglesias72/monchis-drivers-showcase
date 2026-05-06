// app/api/admin/onboarding/rules/[id]/materialize/route.ts
// POST → corre materialización on-demand para una rule. Útil cuando admin
// recién la creó o cambió capacidad y quiere los slots ya pre-creados.

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { materializeRule } from '@/lib/services/onboarding-materialization.service'
import { mapOnboardingErrorToStatus } from '@/lib/services/onboarding-errors'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireAuth()
  try {
    const { id } = await params
    let weeksAhead = 8
    try {
      const body = await request.json()
      if (body && typeof body.weeksAhead === 'number' && body.weeksAhead > 0 && body.weeksAhead <= 26) {
        weeksAhead = body.weeksAhead
      }
    } catch {
      // body opcional
    }
    const result = await materializeRule(id, weeksAhead)
    return NextResponse.json({ ...result, weeksAhead })
  } catch (err) {
    const { status, body } = mapOnboardingErrorToStatus(err)
    return NextResponse.json(body, { status })
  }
}
