// app/api/admin/onboarding/locations/route.ts
// GET (list) + POST (create) ubicaciones reusables para capacitaciones.

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import {
  listLocations,
  createLocation,
} from '@/lib/services/onboarding-locations.service'
import { mapOnboardingErrorToStatus } from '@/lib/services/onboarding-errors'
import type { LocationCreateInput } from '@/lib/types/onboarding-rules.types'

export async function GET(request: NextRequest) {
  await requireAuth()
  try {
    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('includeInactive') === 'true'
    const locations = await listLocations({ includeInactive })
    return NextResponse.json({ locations })
  } catch (err) {
    const { status, body } = mapOnboardingErrorToStatus(err)
    return NextResponse.json(body, { status })
  }
}

export async function POST(request: NextRequest) {
  const user = await requireAuth()
  try {
    const input = (await request.json()) as LocationCreateInput
    if (!input || typeof input !== 'object') {
      return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
    }
    const location = await createLocation(input, user.id)
    return NextResponse.json({ location }, { status: 201 })
  } catch (err) {
    const { status, body } = mapOnboardingErrorToStatus(err)
    return NextResponse.json(body, { status })
  }
}
