// app/api/admin/onboarding/rules/[id]/exceptions/route.ts
// POST (create exception)

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { createException } from '@/lib/services/onboarding-rules.service'
import { mapOnboardingErrorToStatus } from '@/lib/services/onboarding-errors'
import type { ExceptionCreateInput } from '@/lib/types/onboarding-rules.types'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireAuth()
  try {
    const { id } = await params
    const body = (await request.json()) as Omit<ExceptionCreateInput, 'ruleId'>
    const exception = await createException({ ...body, ruleId: id }, user.id)
    return NextResponse.json({ exception }, { status: 201 })
  } catch (err) {
    const { status, body: errBody } = mapOnboardingErrorToStatus(err)
    return NextResponse.json(errBody, { status })
  }
}
