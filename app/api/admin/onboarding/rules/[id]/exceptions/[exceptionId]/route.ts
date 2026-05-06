// app/api/admin/onboarding/rules/[id]/exceptions/[exceptionId]/route.ts
// DELETE excepción.

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { deleteException } from '@/lib/services/onboarding-rules.service'
import { mapOnboardingErrorToStatus } from '@/lib/services/onboarding-errors'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; exceptionId: string }> },
) {
  const user = await requireAuth()
  try {
    const { id, exceptionId } = await params
    await deleteException(id, exceptionId, user.id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    const { status, body } = mapOnboardingErrorToStatus(err)
    return NextResponse.json(body, { status })
  }
}
