// app/api/admin/onboarding/locations/[id]/route.ts
// PATCH + DELETE para una ubicación reusable.

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import {
  updateLocation,
  deactivateLocation,
} from '@/lib/services/onboarding-locations.service'
import { mapOnboardingErrorToStatus } from '@/lib/services/onboarding-errors'
import type { LocationUpdateInput } from '@/lib/types/onboarding-rules.types'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireAuth()
  try {
    const { id } = await params
    const input = (await request.json()) as LocationUpdateInput
    const location = await updateLocation(id, input)
    return NextResponse.json({ location })
  } catch (err) {
    const { status, body } = mapOnboardingErrorToStatus(err)
    return NextResponse.json(body, { status })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireAuth()
  try {
    const { id } = await params
    await deactivateLocation(id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    const { status, body } = mapOnboardingErrorToStatus(err)
    return NextResponse.json(body, { status })
  }
}
