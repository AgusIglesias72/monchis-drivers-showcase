// lib/services/onboarding-materialization.service.ts
//
// Materializa OnboardingEvent rows desde reglas recurrentes (OnboardingScheduleRule).
// Usado por (a) cron diario que pre-genera la próxima ventana, (b) booking on-demand
// si el slot todavía no fue creado, y (c) UI pública que necesita listar slots
// dinámicamente sin esperar al cron.

import { prisma } from '@/lib/prisma'
import {
  PY_TZ,
  combineDateAndTimeInTZ,
  ymdInTZ,
  dayOfWeekInTZ,
  enumerateDaysInTZ,
  addMinutesToHHMM,
} from '@/lib/utils/onboarding-time'
import type {
  RuleSummary,
  ScheduleException,
  SlotResponse,
} from '@/lib/types/onboarding-rules.types'
import type { OnboardingScheduleRule, OnboardingScheduleException } from '@prisma/client'

// ==================== TYPES ====================

export interface MaterializeResult {
  created: number
  skipped: number
}

export interface MaterializeAllResult {
  totalCreated: number
  totalSkipped: number
  perRule: Array<{ ruleId: string; slug: string; created: number; skipped: number }>
}

// ==================== HELPERS ====================

function buildExceptionMap(
  exceptions: OnboardingScheduleException[],
  timezone: string,
): Map<string, OnboardingScheduleException> {
  const map = new Map<string, OnboardingScheduleException>()
  for (const ex of exceptions) {
    // Las excepciones se almacenan a 00:00 UTC (definición canónica del día).
    // Para indexar, derivamos YYYY-MM-DD usando UTC para evitar shift de TZ.
    const ymd = ex.date.toISOString().slice(0, 10)
    map.set(ymd, ex)
  }
  return map
}

function isWithinValidity(ymd: string, rule: OnboardingScheduleRule): boolean {
  const validFromYmd = rule.validFrom.toISOString().slice(0, 10)
  if (ymd < validFromYmd) return false
  if (rule.validTo) {
    const validToYmd = rule.validTo.toISOString().slice(0, 10)
    if (ymd > validToYmd) return false
  }
  return true
}

// ==================== MATERIALIZE A SINGLE RULE ====================

export async function materializeRule(
  ruleId: string,
  weeksAhead = 8,
): Promise<MaterializeResult> {
  const rule = await prisma.onboardingScheduleRule.findUnique({
    where: { id: ruleId },
    include: { exceptions: true },
  })
  if (!rule) throw new Error(`Regla "${ruleId}" no encontrada`)
  if (!rule.isActive) return { created: 0, skipped: 0 }

  const tz = rule.timezone || PY_TZ
  const exceptionMap = buildExceptionMap(rule.exceptions, tz)

  const now = new Date()
  const horizon = new Date(now.getTime() + weeksAhead * 7 * 24 * 60 * 60 * 1000)
  const ymds = enumerateDaysInTZ(now, horizon, tz)

  let created = 0
  let skipped = 0

  for (const ymd of ymds) {
    if (!isWithinValidity(ymd, rule)) {
      skipped++
      continue
    }

    // dayOfWeek calculado a partir del día calendario en TZ (no UTC) para
    // que un slot a las 23:00 PY no se cuente como sábado por accidente.
    const probeDateUTC = combineDateAndTimeInTZ(ymd, '12:00', tz)
    const dow = dayOfWeekInTZ(probeDateUTC, tz)
    if (!rule.daysOfWeek.includes(dow)) {
      continue
    }

    const ex = exceptionMap.get(ymd)
    if (ex && ex.type === 'CANCELLED') {
      skipped++
      continue
    }

    const startTime = ex?.overrideStartTime || rule.startTime
    const durationMin = ex?.overrideDurationMin ?? rule.durationMinutes
    const maxCapacity = ex?.overrideMaxCapacity ?? rule.maxCapacity
    const meetingLink = ex?.overrideMeetingLink ?? rule.meetingLink

    const scheduledDate = combineDateAndTimeInTZ(ymd, startTime, tz)
    const endTime = addMinutesToHHMM(startTime, durationMin)

    // Idempotente: usamos findFirst en lugar de @@unique para no requerir
    // migration adicional. Si ya existe un evento para (rule, scheduledDate),
    // skip.
    const existing = await prisma.onboardingEvent.findFirst({
      where: {
        scheduleRuleId: rule.id,
        scheduledDate,
      },
      select: { id: true },
    })
    if (existing) {
      skipped++
      continue
    }

    await prisma.onboardingEvent.create({
      data: {
        scheduleRuleId: rule.id,
        title: rule.title,
        modality: rule.modality,
        instructions: rule.instructions,
        durationMinutes: durationMin,
        timezone: tz,
        scheduledDate,
        startTime,
        endTime,
        location: rule.location,
        locationAddress: rule.locationAddress,
        meetingLink,
        maxCapacity,
        currentCapacity: 0,
        version: 0,
        status: 'SCHEDULED',
        organizer: rule.defaultOrganizer,
      },
    })
    created++
  }

  return { created, skipped }
}

// ==================== MATERIALIZE ALL ACTIVE ====================

export async function materializeAllActiveRules(weeksAhead = 8): Promise<MaterializeAllResult> {
  const rules = await prisma.onboardingScheduleRule.findMany({
    where: { isActive: true },
    select: { id: true, slug: true },
  })

  let totalCreated = 0
  let totalSkipped = 0
  const perRule: MaterializeAllResult['perRule'] = []

  for (const r of rules) {
    try {
      const res = await materializeRule(r.id, weeksAhead)
      totalCreated += res.created
      totalSkipped += res.skipped
      perRule.push({ ruleId: r.id, slug: r.slug, created: res.created, skipped: res.skipped })
    } catch (err) {
      console.error(`[materialize] falla en regla ${r.slug}:`, err)
      perRule.push({ ruleId: r.id, slug: r.slug, created: 0, skipped: 0 })
    }
  }

  return { totalCreated, totalSkipped, perRule }
}

// ==================== COMPUTE SLOTS (on-the-fly listing) ====================

export interface ComputeSlotsExistingEvent {
  id: string
  currentCapacity: number
  status: string
}

export function computeSlots(
  rule: RuleSummary,
  exceptions: ScheduleException[],
  existingEvents: Map<string, ComputeSlotsExistingEvent>,
  fromUTC: Date,
  toUTC: Date,
): SlotResponse[] {
  const tz = rule.timezone || PY_TZ
  const now = new Date()

  // Cap de la ventana al maxFutureDays de la regla.
  const maxFutureMs = rule.maxFutureDays * 24 * 60 * 60 * 1000
  const ruleHorizon = new Date(now.getTime() + maxFutureMs)
  const effectiveTo = toUTC.getTime() > ruleHorizon.getTime() ? ruleHorizon : toUTC
  if (effectiveTo.getTime() < fromUTC.getTime()) return []

  const validFromDate = new Date(rule.validFrom)
  const validToDate = rule.validTo ? new Date(rule.validTo) : null

  const exceptionMap = new Map<string, ScheduleException>()
  for (const ex of exceptions) {
    const ymd = ex.date.slice(0, 10)
    exceptionMap.set(ymd, ex)
  }

  const ymds = enumerateDaysInTZ(fromUTC, effectiveTo, tz)
  const slots: SlotResponse[] = []
  const minNoticeMs = rule.minNoticeHours * 60 * 60 * 1000

  for (const ymd of ymds) {
    // Validez de la rule.
    const validFromYmd = validFromDate.toISOString().slice(0, 10)
    if (ymd < validFromYmd) continue
    if (validToDate) {
      const validToYmd = validToDate.toISOString().slice(0, 10)
      if (ymd > validToYmd) continue
    }

    // Día de semana (en TZ del rule).
    const probeDateUTC = combineDateAndTimeInTZ(ymd, '12:00', tz)
    const dow = dayOfWeekInTZ(probeDateUTC, tz)
    if (!rule.daysOfWeek.includes(dow)) continue

    const ex = exceptionMap.get(ymd)
    if (ex && ex.type === 'CANCELLED') continue

    const startTime = ex?.overrideStartTime || rule.startTime
    const durationMin = ex?.overrideDurationMin ?? rule.durationMinutes
    const maxCapacity = ex?.overrideMaxCapacity ?? rule.maxCapacity
    const isOverride = !!ex && ex.type === 'OVERRIDE'

    const scheduledDateUTC = combineDateAndTimeInTZ(ymd, startTime, tz)
    const endTime = addMinutesToHHMM(startTime, durationMin)

    // Filtro de ventana (fromUTC..effectiveTo).
    if (scheduledDateUTC.getTime() < fromUTC.getTime()) continue
    if (scheduledDateUTC.getTime() > effectiveTo.getTime()) continue

    const isPast = scheduledDateUTC.getTime() <= now.getTime()
    const isPastNotice = scheduledDateUTC.getTime() - now.getTime() < minNoticeMs

    const existing = existingEvents.get(ymd)
    const currentCapacity = existing?.currentCapacity ?? 0
    const isFull = currentCapacity >= maxCapacity
    const eventId = existing?.id ?? null

    slots.push({
      ruleId: rule.id,
      ruleSlug: rule.slug,
      ruleTitle: rule.title,
      modality: rule.modality,
      date: ymd,
      startTime,
      endTime,
      scheduledDateUTC: scheduledDateUTC.toISOString(),
      durationMinutes: durationMin,
      maxCapacity,
      currentCapacity,
      availableSlots: Math.max(0, maxCapacity - currentCapacity),
      isFull,
      isPastNotice,
      isPast,
      isOverride,
      eventId,
    })
  }

  return slots
}

// ==================== HELPER: get-or-materialize a single slot (used by booking) ====================

export async function getOrMaterializeSlot(
  ruleId: string,
  scheduledDateUTC: Date,
): Promise<{ id: string; currentCapacity: number; maxCapacity: number | null; version: number; status: string }> {
  const rule = await prisma.onboardingScheduleRule.findUnique({
    where: { id: ruleId },
    include: { exceptions: true },
  })
  if (!rule) throw new Error(`Regla "${ruleId}" no encontrada`)

  const tz = rule.timezone || PY_TZ
  const ymd = ymdInTZ(scheduledDateUTC, tz)
  const dow = dayOfWeekInTZ(scheduledDateUTC, tz)

  if (!rule.daysOfWeek.includes(dow)) {
    throw new Error(`La fecha solicitada no corresponde a un día de la regla`)
  }
  if (!isWithinValidity(ymd, rule)) {
    throw new Error('La fecha solicitada está fuera del período de validez')
  }

  const exception = rule.exceptions.find(
    (e) => e.date.toISOString().slice(0, 10) === ymd,
  )
  if (exception?.type === 'CANCELLED') {
    throw new Error('Ese día está cancelado por excepción')
  }

  const startTime = exception?.overrideStartTime || rule.startTime
  const durationMin = exception?.overrideDurationMin ?? rule.durationMinutes
  const maxCapacity = exception?.overrideMaxCapacity ?? rule.maxCapacity
  const meetingLink = exception?.overrideMeetingLink ?? rule.meetingLink

  // Defensivo: el caller puede haber pasado un Date con minutos arbitrarios.
  // Recalculamos el scheduledDate canonico desde ymd + startTime para
  // asegurar idempotencia con materializeRule.
  const canonicalScheduledDate = combineDateAndTimeInTZ(ymd, startTime, tz)
  const endTime = addMinutesToHHMM(startTime, durationMin)

  const existing = await prisma.onboardingEvent.findFirst({
    where: {
      scheduleRuleId: rule.id,
      scheduledDate: canonicalScheduledDate,
    },
  })
  if (existing) {
    return {
      id: existing.id,
      currentCapacity: existing.currentCapacity,
      maxCapacity: existing.maxCapacity,
      version: existing.version,
      status: existing.status,
    }
  }

  const created = await prisma.onboardingEvent.create({
    data: {
      scheduleRuleId: rule.id,
      title: rule.title,
      modality: rule.modality,
      instructions: rule.instructions,
      durationMinutes: durationMin,
      timezone: tz,
      scheduledDate: canonicalScheduledDate,
      startTime,
      endTime,
      location: rule.location,
      locationAddress: rule.locationAddress,
      meetingLink,
      maxCapacity,
      currentCapacity: 0,
      version: 0,
      status: 'SCHEDULED',
      organizer: rule.defaultOrganizer,
    },
  })

  return {
    id: created.id,
    currentCapacity: created.currentCapacity,
    maxCapacity: created.maxCapacity,
    version: created.version,
    status: created.status,
  }
}
