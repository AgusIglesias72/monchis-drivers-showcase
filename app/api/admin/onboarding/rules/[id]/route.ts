// app/api/admin/onboarding/rules/[id]/route.ts
// GET (detail) + PATCH (update) + DELETE (deactivate).

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import {
  getRuleById,
  updateRule,
  deactivateRule,
} from '@/lib/services/onboarding-rules.service'
import { mapOnboardingErrorToStatus } from '@/lib/services/onboarding-errors'
import type { RuleUpdateInput } from '@/lib/types/onboarding-rules.types'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireAuth()
  try {
    const { id } = await params
    const rule = await getRuleById(id)
    if (!rule) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })
    return NextResponse.json({ rule })
  } catch (err) {
    const { status, body } = mapOnboardingErrorToStatus(err)
    return NextResponse.json(body, { status })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireAuth()
  try {
    const { id } = await params
    const input = (await request.json()) as RuleUpdateInput
    const rule = await updateRule(id, input, user.id)
    return NextResponse.json({ rule })
  } catch (err) {
    const { status, body } = mapOnboardingErrorToStatus(err)
    return NextResponse.json(body, { status })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireAuth()
  try {
    const { id } = await params
    const rule = await deactivateRule(id, user.id)
    return NextResponse.json({ rule })
  } catch (err) {
    const { status, body } = mapOnboardingErrorToStatus(err)
    return NextResponse.json(body, { status })
  }
}
