// app/api/public/capacitaciones/route.ts
// GET → lista de reglas públicas activas con sus próximos slots (3) calculados on-the-fly.

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { listRules } from '@/lib/services/onboarding-rules.service'
import {
  computeSlots,
  type ComputeSlotsExistingEvent,
} from '@/lib/services/onboarding-materialization.service'
import { mapOnboardingErrorToStatus } from '@/lib/services/onboarding-errors'
import { ymdInTZ } from '@/lib/utils/onboarding-time'
import type { ScheduleException, SlotResponse } from '@/lib/types/onboarding-rules.types'

const NEXT_SLOTS_COUNT = 3
const HORIZON_DAYS = 30

export async function GET(_request: NextRequest) {
  try {
    const rules = await listRules({ isActive: true, isPublic: true })
    if (rules.length === 0) {
      return NextResponse.json({ rules: [] }, {
        headers: { 'Cache-Control': 'private, max-age=60' },
      })
    }

    const now = new Date()
    const horizon = new Date(now.getTime() + HORIZON_DAYS * 24 * 60 * 60 * 1000)
    const ruleIds = rules.map((r) => r.id)

    const [exceptions, materializedEvents] = await Promise.all([
      prisma.onboardingScheduleException.findMany({
        where: { ruleId: { in: ruleIds } },
      }),
      prisma.onboardingEvent.findMany({
        where: {
          scheduleRuleId: { in: ruleIds },
          scheduledDate: { gte: now, lte: horizon },
          status: 'SCHEDULED',
        },
        select: {
          id: true,
          scheduleRuleId: true,
          scheduledDate: true,
          currentCapacity: true,
          status: true,
          timezone: true,
        },
      }),
    ])

    const exceptionsByRule = new Map<string, ScheduleException[]>()
    for (const ex of exceptions) {
      const arr = exceptionsByRule.get(ex.ruleId) ?? []
      arr.push({
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
      })
      exceptionsByRule.set(ex.ruleId, arr)
    }

    const eventsByRule = new Map<string, Map<string, ComputeSlotsExistingEvent>>()
    for (const ev of materializedEvents) {
      if (!ev.scheduleRuleId) continue
      const tz = ev.timezone || 'America/Asuncion'
      const ymd = ymdInTZ(ev.scheduledDate, tz)
      const ruleMap = eventsByRule.get(ev.scheduleRuleId) ?? new Map()
      ruleMap.set(ymd, {
        id: ev.id,
        currentCapacity: ev.currentCapacity,
        status: ev.status,
      })
      eventsByRule.set(ev.scheduleRuleId, ruleMap)
    }

    const result = rules.map((rule) => {
      const exs = exceptionsByRule.get(rule.id) ?? []
      const evMap = eventsByRule.get(rule.id) ?? new Map()
      const allSlots = computeSlots(rule, exs, evMap, now, horizon)
      const futureSlots = allSlots.filter((s) => !s.isPast).slice(0, NEXT_SLOTS_COUNT)
      return { ...rule, nextSlots: futureSlots as SlotResponse[] }
    })

    return NextResponse.json(
      { rules: result },
      { headers: { 'Cache-Control': 'private, max-age=60' } },
    )
  } catch (err) {
    const { status, body } = mapOnboardingErrorToStatus(err)
    return NextResponse.json(body, { status })
  }
}
