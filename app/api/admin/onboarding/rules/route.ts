// app/api/admin/onboarding/rules/route.ts
// GET (list) + POST (create) reglas recurrentes de capacitación.

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { listRules, createRule } from '@/lib/services/onboarding-rules.service'
import { mapOnboardingErrorToStatus } from '@/lib/services/onboarding-errors'
import { revalidateCapacitacionesPublic } from '@/lib/utils/revalidate-capacitaciones'
import type { RuleCreateInput } from '@/lib/types/onboarding-rules.types'

export async function GET(request: NextRequest) {
  await requireAuth()
  try {
    const { searchParams } = new URL(request.url)
    const isActiveParam = searchParams.get('isActive')
    const isPublicParam = searchParams.get('isPublic')

    const rules = await listRules({
      isActive: isActiveParam == null ? undefined : isActiveParam === 'true',
      isPublic: isPublicParam == null ? undefined : isPublicParam === 'true',
    })
    return NextResponse.json({ rules })
  } catch (err) {
    const { status, body } = mapOnboardingErrorToStatus(err)
    return NextResponse.json(body, { status })
  }
}

export async function POST(request: NextRequest) {
  const user = await requireAuth()
  try {
    const input = (await request.json()) as RuleCreateInput
    if (!input || typeof input !== 'object') {
      return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
    }
    const rule = await createRule(input, user.id)
    revalidateCapacitacionesPublic(rule.slug)
    return NextResponse.json({ rule }, { status: 201 })
  } catch (err) {
    const { status, body } = mapOnboardingErrorToStatus(err)
    return NextResponse.json(body, { status })
  }
}
