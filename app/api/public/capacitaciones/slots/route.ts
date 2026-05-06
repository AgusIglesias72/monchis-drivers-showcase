// app/api/public/capacitaciones/slots/route.ts
// GET ?from=YYYY-MM-DD&to=YYYY-MM-DD → slots combinados de todas las reglas
// públicas activas. Usado por el calendario overview de la landing.

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { listRules } from '@/lib/services/onboarding-rules.service'
import {
  computeSlots,
  type ComputeSlotsExistingEvent,
} from '@/lib/services/onboarding-materialization.service'
import { mapOnboardingErrorToStatus } from '@/lib/services/onboarding-errors'
import { combineDateAndTimeInTZ, ymdInTZ } from '@/lib/utils/onboarding-time'
import type { ScheduleException, SlotResponse } from '@/lib/types/onboarding-rules.types'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fromYmd = searchParams.get('from')
    const toYmd = searchParams.get('to')

    const now = new Date()
    const tz = 'America/Asuncion'
    const fromUTC = fromYmd ? combineDateAndTimeInTZ(fromYmd, '00:00', tz) : now
    const toUTC = toYmd
      ? combineDateAndTimeInTZ(toYmd, '23:59', tz)
      : new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)

    if (toUTC.getTime() < fromUTC.getTime()) {
      return NextResponse.json({ error: 'Rango inválido (to < from)' }, { status: 400 })
    }

    const rules = await listRules({ isActive: true, isPublic: true })
    if (rules.length === 0) {
      return NextResponse.json(
        { slots: [] },
        { headers: { 'Cache-Control': 'private, max-age=30' } },
      )
    }

    const ruleIds = rules.map((r) => r.id)
    const [exceptions, materializedEvents] = await Promise.all([
      prisma.onboardingScheduleException.findMany({
        where: { ruleId: { in: ruleIds } },
      }),
      prisma.onboardingEvent.findMany({
        where: {
          scheduleRuleId: { in: ruleIds },
          scheduledDate: { gte: fromUTC, lte: toUTC },
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
      const tzEv = ev.timezone || tz
      const ymd = ymdInTZ(ev.scheduledDate, tzEv)
      const ruleMap = eventsByRule.get(ev.scheduleRuleId) ?? new Map()
      ruleMap.set(ymd, {
        id: ev.id,
        currentCapacity: ev.currentCapacity,
        status: ev.status,
      })
      eventsByRule.set(ev.scheduleRuleId, ruleMap)
    }

    const allSlots: SlotResponse[] = []
    for (const rule of rules) {
      const exs = exceptionsByRule.get(rule.id) ?? []
      const evMap = eventsByRule.get(rule.id) ?? new Map()
      const slots = computeSlots(rule, exs, evMap, fromUTC, toUTC)
      allSlots.push(...slots)
    }

    // Orden: por fecha ascendente, luego por hora
    allSlots.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date)
      return a.startTime.localeCompare(b.startTime)
    })

    return NextResponse.json(
      { slots: allSlots },
      { headers: { 'Cache-Control': 'private, max-age=30' } },
    )
  } catch (err) {
    const { status, body } = mapOnboardingErrorToStatus(err)
    return NextResponse.json(body, { status })
  }
}
