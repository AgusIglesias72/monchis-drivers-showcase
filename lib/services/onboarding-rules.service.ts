// lib/services/onboarding-rules.service.ts
//
// CRUD de OnboardingScheduleRule + sus excepciones. Es el corazón del nuevo
// modelo tipo Calendly: una rule define la recurrencia y los slots se calculan
// dinámicamente (ver onboarding-materialization.service).

import { prisma } from '@/lib/prisma'
import { slugify, isValidSlug } from '@/lib/utils/slugify'
import { ValidationError } from './onboarding-errors'
import type {
  RuleSummary,
  RuleWithRelations,
  RuleCreateInput,
  RuleUpdateInput,
  ScheduleException,
  ExceptionCreateInput,
} from '@/lib/types/onboarding-rules.types'
import type {
  OnboardingScheduleRule,
  OnboardingScheduleException,
  OnboardingLocation,
  Prisma,
} from '@prisma/client'

// ==================== MAPPERS ====================

type RuleWithLocation = OnboardingScheduleRule & { savedLocation?: OnboardingLocation | null }

function toRuleSummary(rule: RuleWithLocation): RuleSummary {
  const saved = rule.savedLocation
    ? {
        id: rule.savedLocation.id,
        name: rule.savedLocation.name,
        address: rule.savedLocation.address,
        googleMapsUrl: rule.savedLocation.googleMapsUrl,
        notes: rule.savedLocation.notes,
        isActive: rule.savedLocation.isActive,
        createdAt: rule.savedLocation.createdAt.toISOString(),
        updatedAt: rule.savedLocation.updatedAt.toISOString(),
      }
    : null
  return {
    id: rule.id,
    slug: rule.slug,
    title: rule.title,
    description: rule.description,
    instructions: rule.instructions,
    modality: rule.modality,
    locationId: rule.locationId,
    savedLocation: saved,
    location: rule.location,
    locationAddress: rule.locationAddress,
    googleMapsUrl: rule.googleMapsUrl,
    locationLat: rule.locationLat,
    locationLng: rule.locationLng,
    meetingLink: rule.meetingLink,
    meetingPlatform: rule.meetingPlatform,
    frequency: rule.frequency,
    daysOfWeek: rule.daysOfWeek,
    startTime: rule.startTime,
    durationMinutes: rule.durationMinutes,
    timezone: rule.timezone,
    validFrom: rule.validFrom.toISOString(),
    validTo: rule.validTo ? rule.validTo.toISOString() : null,
    maxCapacity: rule.maxCapacity,
    minNoticeHours: rule.minNoticeHours,
    maxFutureDays: rule.maxFutureDays,
    bufferBeforeMin: rule.bufferBeforeMin,
    bufferAfterMin: rule.bufferAfterMin,
    cancelDeadlineHours: rule.cancelDeadlineHours,
    paymentMode: rule.paymentMode,
    isActive: rule.isActive,
    isPublic: rule.isPublic,
    defaultOrganizer: rule.defaultOrganizer,
    createdBy: rule.createdBy,
    createdAt: rule.createdAt.toISOString(),
    updatedAt: rule.updatedAt.toISOString(),
  }
}

function toScheduleException(ex: OnboardingScheduleException): ScheduleException {
  return {
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
  }
}

// ==================== VALIDATION ====================

function validateRuleInput(input: RuleCreateInput | RuleUpdateInput, isUpdate = false): void {
  if (!isUpdate || input.daysOfWeek !== undefined) {
    const dow = input.daysOfWeek ?? []
    if (!Array.isArray(dow) || dow.length < 1) {
      throw new ValidationError('Debes seleccionar al menos un día de la semana')
    }
    for (const d of dow) {
      if (!Number.isInteger(d) || d < 0 || d > 6) {
        throw new ValidationError(`Día inválido: ${d}. Debe ser entero 0-6`)
      }
    }
  }

  if (input.startTime !== undefined && input.startTime !== null) {
    if (!/^\d{2}:\d{2}$/.test(input.startTime)) {
      throw new ValidationError(`startTime inválido: "${input.startTime}". Formato HH:MM`)
    }
  }

  if (input.durationMinutes !== undefined && input.durationMinutes !== null) {
    if (!Number.isInteger(input.durationMinutes) || input.durationMinutes < 15 || input.durationMinutes > 1440) {
      throw new ValidationError('durationMinutes debe estar entre 15 y 1440')
    }
  }

  if (input.modality !== undefined) {
    if (input.modality !== 'IN_PERSON' && !input.meetingLink && !isUpdate) {
      throw new ValidationError('meetingLink es obligatorio para modalidad VIRTUAL o HYBRID')
    }
    if (input.modality !== 'VIRTUAL' && !input.locationAddress && !isUpdate) {
      throw new ValidationError('locationAddress es obligatorio para modalidad IN_PERSON o HYBRID')
    }
  }

  if (input.slug !== undefined && input.slug !== null) {
    if (!isValidSlug(input.slug)) {
      throw new ValidationError('slug inválido. Usar minúsculas, números y guiones (3-80 chars)')
    }
  }

  if (input.validFrom !== undefined && input.validFrom !== null) {
    const d = new Date(input.validFrom)
    if (isNaN(d.getTime())) throw new ValidationError('validFrom inválido')
  }
  if (input.validTo !== undefined && input.validTo !== null) {
    const d = new Date(input.validTo)
    if (isNaN(d.getTime())) throw new ValidationError('validTo inválido')
  }
}

// ==================== READ ====================

export async function listRules(filters?: {
  isActive?: boolean
  isPublic?: boolean
}): Promise<RuleSummary[]> {
  const where: Prisma.OnboardingScheduleRuleWhereInput = {}
  if (filters?.isActive !== undefined) where.isActive = filters.isActive
  if (filters?.isPublic !== undefined) where.isPublic = filters.isPublic

  const rules = await prisma.onboardingScheduleRule.findMany({
    where,
    orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    include: { savedLocation: true },
  })
  return rules.map(toRuleSummary)
}

export async function getRuleById(id: string): Promise<RuleWithRelations | null> {
  const rule = await prisma.onboardingScheduleRule.findUnique({
    where: { id },
    include: {
      exceptions: { orderBy: { date: 'asc' } },
      organizerUser: { select: { fullName: true, firstName: true, lastName: true } },
      savedLocation: true,
    },
  })
  if (!rule) return null

  const now = new Date()
  const upcomingEvents = await prisma.onboardingEvent.findMany({
    where: {
      scheduleRuleId: id,
      scheduledDate: { gte: now },
      status: 'SCHEDULED',
    },
    select: { currentCapacity: true },
  })
  const upcomingEventsCount = upcomingEvents.length
  const totalAttendeesCount = upcomingEvents.reduce((acc, e) => acc + (e.currentCapacity || 0), 0)

  const organizerName =
    rule.organizerUser?.fullName ||
    [rule.organizerUser?.firstName, rule.organizerUser?.lastName].filter(Boolean).join(' ') ||
    null

  return {
    ...toRuleSummary(rule),
    exceptions: rule.exceptions.map(toScheduleException),
    organizerName,
    upcomingEventsCount,
    totalAttendeesCount,
  }
}

export async function getRuleBySlug(slug: string): Promise<RuleSummary | null> {
  const rule = await prisma.onboardingScheduleRule.findUnique({
    where: { slug },
    include: { savedLocation: true },
  })
  return rule ? toRuleSummary(rule) : null
}

// ==================== CREATE ====================

export async function createRule(input: RuleCreateInput, createdBy: string): Promise<RuleSummary> {
  validateRuleInput(input, false)

  const slug = input.slug && isValidSlug(input.slug) ? input.slug : slugify(input.title)
  if (!isValidSlug(slug)) {
    throw new ValidationError('No se pudo generar un slug válido a partir del título')
  }

  const existing = await prisma.onboardingScheduleRule.findUnique({ where: { slug } })
  if (existing) {
    throw new ValidationError(`Ya existe una capacitación con slug "${slug}"`)
  }

  const created = await prisma.onboardingScheduleRule.create({
    include: { savedLocation: true },
    data: {
      slug,
      title: input.title,
      description: input.description ?? null,
      instructions: input.instructions ?? null,
      modality: input.modality,
      locationId: input.locationId ?? null,
      location: input.location ?? null,
      locationAddress: input.locationAddress ?? null,
      googleMapsUrl: input.googleMapsUrl ?? null,
      meetingLink: input.meetingLink ?? null,
      meetingPlatform: input.meetingPlatform ?? null,
      frequency: input.frequency ?? 'WEEKLY',
      daysOfWeek: input.daysOfWeek,
      startTime: input.startTime,
      durationMinutes: input.durationMinutes,
      timezone: input.timezone ?? 'America/Asuncion',
      validFrom: new Date(input.validFrom),
      validTo: input.validTo ? new Date(input.validTo) : null,
      maxCapacity: input.maxCapacity ?? 20,
      minNoticeHours: input.minNoticeHours ?? 2,
      maxFutureDays: input.maxFutureDays ?? 60,
      bufferBeforeMin: input.bufferBeforeMin ?? 0,
      bufferAfterMin: input.bufferAfterMin ?? 0,
      cancelDeadlineHours: input.cancelDeadlineHours ?? 4,
      paymentMode: input.paymentMode ?? 'POST_EVENT',
      isActive: input.isActive ?? true,
      isPublic: input.isPublic ?? true,
      defaultOrganizer: input.defaultOrganizer,
      createdBy,
    },
  })

  await safeAudit({
    userId: createdBy,
    action: 'ONBOARDING_EVENT_CREATED',
    actionType: 'CREATE',
    entityType: 'OnboardingScheduleRule',
    entityId: created.id,
    description: `Regla de capacitación creada: ${created.title}`,
    metadata: { slug: created.slug, modality: created.modality },
  })

  return toRuleSummary(created)
}

// ==================== UPDATE ====================

export async function updateRule(id: string, input: RuleUpdateInput, updatedBy?: string): Promise<RuleSummary> {
  validateRuleInput(input, true)

  const current = await prisma.onboardingScheduleRule.findUnique({ where: { id } })
  if (!current) throw new ValidationError(`Regla "${id}" no encontrada`)

  if (input.slug !== undefined && input.slug !== null && input.slug !== current.slug) {
    const existing = await prisma.onboardingScheduleRule.findUnique({ where: { slug: input.slug } })
    if (existing) throw new ValidationError(`Ya existe una capacitación con slug "${input.slug}"`)
  }

  const data: Prisma.OnboardingScheduleRuleUpdateInput = {}
  if (input.slug !== undefined) data.slug = input.slug ?? undefined
  if (input.title !== undefined) data.title = input.title
  if (input.description !== undefined) data.description = input.description
  if (input.instructions !== undefined) data.instructions = input.instructions
  if (input.modality !== undefined) data.modality = input.modality
  if (input.locationId !== undefined) {
    data.savedLocation = input.locationId
      ? { connect: { id: input.locationId } }
      : { disconnect: true }
  }
  if (input.location !== undefined) data.location = input.location
  if (input.locationAddress !== undefined) data.locationAddress = input.locationAddress
  if (input.googleMapsUrl !== undefined) data.googleMapsUrl = input.googleMapsUrl
  if (input.meetingLink !== undefined) data.meetingLink = input.meetingLink
  if (input.meetingPlatform !== undefined) data.meetingPlatform = input.meetingPlatform
  if (input.frequency !== undefined) data.frequency = input.frequency
  if (input.daysOfWeek !== undefined) data.daysOfWeek = input.daysOfWeek
  if (input.startTime !== undefined) data.startTime = input.startTime
  if (input.durationMinutes !== undefined) data.durationMinutes = input.durationMinutes
  if (input.timezone !== undefined) data.timezone = input.timezone ?? 'America/Asuncion'
  if (input.validFrom !== undefined && input.validFrom !== null) data.validFrom = new Date(input.validFrom)
  if (input.validTo !== undefined) data.validTo = input.validTo ? new Date(input.validTo) : null
  if (input.maxCapacity !== undefined) data.maxCapacity = input.maxCapacity
  if (input.minNoticeHours !== undefined) data.minNoticeHours = input.minNoticeHours
  if (input.maxFutureDays !== undefined) data.maxFutureDays = input.maxFutureDays
  if (input.bufferBeforeMin !== undefined) data.bufferBeforeMin = input.bufferBeforeMin
  if (input.bufferAfterMin !== undefined) data.bufferAfterMin = input.bufferAfterMin
  if (input.cancelDeadlineHours !== undefined) data.cancelDeadlineHours = input.cancelDeadlineHours
  if (input.paymentMode !== undefined) data.paymentMode = input.paymentMode
  if (input.isActive !== undefined) data.isActive = input.isActive
  if (input.isPublic !== undefined) data.isPublic = input.isPublic
  if (input.defaultOrganizer !== undefined) {
    data.organizerUser = { connect: { id: input.defaultOrganizer } }
  }

  const updated = await prisma.onboardingScheduleRule.update({
    where: { id },
    data,
    include: { savedLocation: true },
  })

  await safeAudit({
    userId: updatedBy ?? current.createdBy,
    action: 'ONBOARDING_EVENT_UPDATED',
    actionType: 'UPDATE',
    entityType: 'OnboardingScheduleRule',
    entityId: id,
    description: `Regla de capacitación actualizada: ${updated.title}`,
    changes: Object.keys(data),
  })

  return toRuleSummary(updated)
}

// ==================== DEACTIVATE ====================

export async function deactivateRule(id: string, updatedBy?: string): Promise<RuleSummary> {
  const current = await prisma.onboardingScheduleRule.findUnique({ where: { id } })
  if (!current) throw new ValidationError(`Regla "${id}" no encontrada`)

  const updated = await prisma.onboardingScheduleRule.update({
    where: { id },
    data: { isActive: false },
    include: { savedLocation: true },
  })

  await safeAudit({
    userId: updatedBy ?? current.createdBy,
    action: 'ONBOARDING_EVENT_CANCELLED',
    actionType: 'CANCEL',
    entityType: 'OnboardingScheduleRule',
    entityId: id,
    description: `Regla desactivada: ${current.title}`,
  })

  return toRuleSummary(updated)
}

// ==================== EXCEPTIONS ====================

export async function createException(
  input: ExceptionCreateInput,
  createdBy: string,
): Promise<ScheduleException> {
  const rule = await prisma.onboardingScheduleRule.findUnique({ where: { id: input.ruleId } })
  if (!rule) throw new ValidationError(`Regla "${input.ruleId}" no encontrada`)

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    throw new ValidationError('date debe ser YYYY-MM-DD')
  }
  // Defensivo: parseamos el día como UTC 00:00 para uniformar el almacenamiento.
  const date = new Date(`${input.date}T00:00:00.000Z`)

  if (date < new Date(rule.validFrom.toISOString().split('T')[0] + 'T00:00:00.000Z')) {
    throw new ValidationError('La excepción es anterior al inicio de validez de la regla')
  }
  if (rule.validTo) {
    const validToDate = new Date(rule.validTo.toISOString().split('T')[0] + 'T00:00:00.000Z')
    if (date > validToDate) {
      throw new ValidationError('La excepción es posterior al fin de validez de la regla')
    }
  }

  // Día de la semana en UTC (date está fijado a 00:00 UTC, así que getUTCDay basta).
  const dow = date.getUTCDay()
  if (!rule.daysOfWeek.includes(dow)) {
    throw new ValidationError(
      `La fecha (día ${dow}) no corresponde a un día de la regla (${rule.daysOfWeek.join(', ')})`,
    )
  }

  if (input.type === 'OVERRIDE') {
    if (input.overrideStartTime && !/^\d{2}:\d{2}$/.test(input.overrideStartTime)) {
      throw new ValidationError(`overrideStartTime inválido: "${input.overrideStartTime}"`)
    }
    if (input.overrideDurationMin !== undefined && input.overrideDurationMin !== null) {
      if (input.overrideDurationMin < 15 || input.overrideDurationMin > 1440) {
        throw new ValidationError('overrideDurationMin debe estar entre 15 y 1440')
      }
    }
    if (input.overrideMaxCapacity !== undefined && input.overrideMaxCapacity !== null) {
      if (input.overrideMaxCapacity < 1) throw new ValidationError('overrideMaxCapacity inválido')
    }
  }

  const created = await prisma.onboardingScheduleException.upsert({
    where: { ruleId_date: { ruleId: input.ruleId, date } },
    update: {
      type: input.type,
      overrideStartTime: input.overrideStartTime ?? null,
      overrideDurationMin: input.overrideDurationMin ?? null,
      overrideMaxCapacity: input.overrideMaxCapacity ?? null,
      overrideMeetingLink: input.overrideMeetingLink ?? null,
      reason: input.reason ?? null,
    },
    create: {
      ruleId: input.ruleId,
      date,
      type: input.type,
      overrideStartTime: input.overrideStartTime ?? null,
      overrideDurationMin: input.overrideDurationMin ?? null,
      overrideMaxCapacity: input.overrideMaxCapacity ?? null,
      overrideMeetingLink: input.overrideMeetingLink ?? null,
      reason: input.reason ?? null,
      createdBy,
    },
  })

  await safeAudit({
    userId: createdBy,
    action: 'ONBOARDING_EVENT_UPDATED',
    actionType: 'CREATE',
    entityType: 'OnboardingScheduleException',
    entityId: created.id,
    description: `Excepción ${input.type} creada para regla ${rule.title} en ${input.date}`,
    metadata: { ruleId: input.ruleId, date: input.date, type: input.type },
  })

  return toScheduleException(created)
}

export async function deleteException(ruleId: string, exceptionId: string, deletedBy?: string): Promise<void> {
  const ex = await prisma.onboardingScheduleException.findUnique({ where: { id: exceptionId } })
  if (!ex || ex.ruleId !== ruleId) {
    throw new ValidationError('Excepción no encontrada')
  }
  await prisma.onboardingScheduleException.delete({ where: { id: exceptionId } })

  await safeAudit({
    userId: deletedBy ?? ex.createdBy,
    action: 'ONBOARDING_EVENT_UPDATED',
    actionType: 'DELETE',
    entityType: 'OnboardingScheduleException',
    entityId: exceptionId,
    description: `Excepción eliminada para regla ${ruleId}`,
  })
}

// ==================== AUDIT (best-effort, sin headers para usar fuera de request context) ====================

async function safeAudit(input: {
  userId: string
  userEmail?: string
  action: Prisma.AuditLogCreateInput['action']
  actionType: string
  description?: string
  entityType: string
  entityId: string
  changes?: unknown
  metadata?: unknown
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId,
        userEmail: input.userEmail,
        action: input.action,
        actionType: input.actionType,
        description: input.description,
        entityType: input.entityType,
        entityId: input.entityId,
        changes: input.changes as Prisma.InputJsonValue | undefined,
        metadata: input.metadata as Prisma.InputJsonValue | undefined,
      },
    })
  } catch (err) {
    console.error('[onboarding-rules audit error]', err)
  }
}
