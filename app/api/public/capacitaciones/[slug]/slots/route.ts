// app/api/public/capacitaciones/[slug]/slots/route.ts
// GET ?from=YYYY-MM-DD&to=YYYY-MM-DD → SlotResponse[] para una rule.

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRuleBySlug } from '@/lib/services/onboarding-rules.service'
import {
  computeSlots,
  type ComputeSlotsExistingEvent,
} from '@/lib/services/onboarding-materialization.service'
import { mapOnboardingErrorToStatus } from '@/lib/services/onboarding-errors'
import { combineDateAndTimeInTZ, ymdInTZ } from '@/lib/utils/onboarding-time'
import type { ScheduleException } from '@/lib/types/onboarding-rules.types'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params
    const { searchParams } = new URL(request.url)
    const fromYmd = searchParams.get('from')
    const toYmd = searchParams.get('to')

    const rule = await getRuleBySlug(slug)
    if (!rule || !rule.isActive || !rule.isPublic) {
      return NextResponse.json({ error: 'Capacitación no encontrada' }, { status: 404 })
    }

    const tz = rule.timezone || 'America/Asuncion'
    const now = new Date()
    const defaultHorizon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    const fromUTC = fromYmd
      ? combineDateAndTimeInTZ(fromYmd, '00:00', tz)
      : now
    const toUTC = toYmd
      ? combineDateAndTimeInTZ(toYmd, '23:59', tz)
      : defaultHorizon

    if (toUTC.getTime() < fromUTC.getTime()) {
      return NextResponse.json({ error: 'Rango inválido (to < from)' }, { status: 400 })
    }

    const [exRaw, evRaw] = await Promise.all([
      prisma.onboardingScheduleException.findMany({ where: { ruleId: rule.id } }),
      prisma.onboardingEvent.findMany({
        where: {
          scheduleRuleId: rule.id,
          scheduledDate: { gte: fromUTC, lte: toUTC },
          status: 'SCHEDULED',
        },
        select: {
          id: true,
          scheduledDate: true,
          currentCapacity: true,
          status: true,
          timezone: true,
        },
      }),
    ])

    const exceptions: ScheduleException[] = exRaw.map((ex) => ({
      id: ex.id,
      ruleId: ex.ruleId,
      date: ex.date.toISOString(),
      type: ex.type,
      overrideStartTime: ex.overrideStartTime,
      overrideDurationMin: ex.overrideDurationMin,
      overrideMaxCapacity: ex.overrideMaxCapacity,
      overrideMeetingLink: ex.overrideMeetingLink,
      reason: ex.reason,
      createdBy: ex.createdBy,
      createdAt: ex.createdAt.toISOString(),
    }))

    const evMap = new Map<string, ComputeSlotsExistingEvent>()
    for (const ev of evRaw) {
      const tzEv = ev.timezone || tz
      const ymd = ymdInTZ(ev.scheduledDate, tzEv)
      evMap.set(ymd, { id: ev.id, currentCapacity: ev.currentCapacity, status: ev.status })
    }

    const slots = computeSlots(rule, exceptions, evMap, fromUTC, toUTC)

    return NextResponse.json(
      { slots },
      { headers: { 'Cache-Control': 'private, max-age=10' } },
    )
  } catch (err) {
    const { status, body } = mapOnboardingErrorToStatus(err)
    return NextResponse.json(body, { status })
  }
}
