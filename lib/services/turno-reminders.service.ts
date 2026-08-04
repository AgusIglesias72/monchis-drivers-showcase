// lib/services/turno-reminders.service.ts
//
// Recordatorio pre-turno por Intercom. Corre cada 15 min (cron
// `/api/cron/turno-reminders`) y le manda a cada driver con un turno
// reservado que arranca en 15-30 min un mensaje 1-1, asignado a Abel
// Cardozo (Supervisor de Logística) y cerrado tras el envío (no se
// espera respuesta del driver).
//
// Idempotencia: TurnoReminderSent tiene unique(shiftId, driverId) — "1
// mensaje por persona por turno" aunque el cron se solape entre corridas.
//
// Rollout monitoreado: MAX_SENDS_PER_RUN limita los envíos reales por corrida
// (default 5, override con TURNO_REMINDER_MAX_PER_RUN).

import "server-only"

import { prisma } from "@/lib/prisma"
import { fetchAllZoneShifts } from "@/lib/services/turnos.service"
import { closeConversation, resolveContactId, sendDirectMessage } from "@/lib/services/intercom.service"
import { combineDateAndTimeInTZ, PY_TZ } from "@/lib/utils/onboarding-time"
import type { FlattenedShift } from "@/lib/types/turnos.types"

// "Notificaciones Monchis" — admin de Intercom provisto para envíos automatizados.
const SENDER_ADMIN_ID =
  process.env.INTERCOM_TURNO_REMINDER_SENDER_ADMIN_ID || "10559938"
// "Supervisor de Logística" (Abel Cardozo).
const ASSIGNEE_ADMIN_ID =
  process.env.INTERCOM_TURNO_REMINDER_ASSIGNEE_ADMIN_ID || "8731182"

const WINDOW_FROM_MIN = 15
const WINDOW_TO_MIN = 30
const SEND_DELAY_MS = 200

// Tope de envíos reales por corrida, para el rollout inicial monitoreado. El
// resto de los candidatos de esa corrida queda sin fila en TurnoReminderSent
// (no se marca "hecho"), así que si su turno sigue dentro de la ventana en la
// próxima corrida (15 min después) se reintenta. Subir/soltar vía env var
// cuando ya esté validado en producción.
const MAX_SENDS_PER_RUN = Math.max(
  0,
  parseInt(process.env.TURNO_REMINDER_MAX_PER_RUN || "5", 10),
)

interface DueShift {
  shift: FlattenedShift
  startUtc: Date
}

interface ReminderCandidate {
  shiftId: string
  driverId: string
  dateIso: string
  fromHour: number | null
  zoneId: string
  zoneName: string
  driverName: string
  minutesUntil: number
}

export interface TurnoRemindersStats {
  shiftsDue: number
  candidates: number
  sent: number
  failed: number
  skippedNoContact: number
  skippedAlready: number
  skippedCapped: number
  dryRunCandidates?: ReminderCandidate[]
}

function hhmm(fromHour: number): string {
  const hours = Math.floor(fromHour)
  const minutes = Math.round((fromHour - hours) * 60)
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function escapeHtmlText(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

function getDueShifts(shifts: FlattenedShift[], now: Date): DueShift[] {
  const windowFrom = new Date(now.getTime() + WINDOW_FROM_MIN * 60_000)
  const windowTo = new Date(now.getTime() + WINDOW_TO_MIN * 60_000)

  const due: DueShift[] = []
  for (const shift of shifts) {
    if (shift.fromHour == null) continue
    if (shift.driverIds.length === 0) continue

    let startUtc: Date
    try {
      startUtc = combineDateAndTimeInTZ(shift.dateIso, hhmm(shift.fromHour), PY_TZ)
    } catch {
      continue
    }

    if (startUtc >= windowFrom && startUtc < windowTo) {
      due.push({ shift, startUtc })
    }
  }
  return due
}

function buildReminderBody(
  driverName: string,
  zoneName: string,
  hora: string,
  minutesUntil: number,
): string {
  return `Hola ${escapeHtmlText(driverName)} 👋, tu turno de hoy en ${escapeHtmlText(zoneName)} empieza a las ${hora} (en ${minutesUntil} minutos). ¡Te esperamos!`
}

export async function sendTurnoReminders(
  opts: { dryRun?: boolean } = {},
): Promise<TurnoRemindersStats> {
  const dryRun = opts.dryRun ?? false
  const now = new Date()

  const { shifts } = await fetchAllZoneShifts({ fresh: true })
  const dueShifts = getDueShifts(shifts, now)

  const stats: TurnoRemindersStats = {
    shiftsDue: dueShifts.length,
    candidates: 0,
    sent: 0,
    failed: 0,
    skippedNoContact: 0,
    skippedAlready: 0,
    skippedCapped: 0,
    dryRunCandidates: dryRun ? [] : undefined,
  }
  let sendAttempts = 0

  for (const { shift, startUtc } of dueShifts) {
    const minutesUntil = Math.max(0, Math.round((startUtc.getTime() - now.getTime()) / 60_000))

    for (const driverId of shift.driverIds) {
      const already = await prisma.turnoReminderSent.findUnique({
        where: { shiftId_driverId: { shiftId: shift.shiftId, driverId } },
        select: { id: true },
      })
      if (already) {
        stats.skippedAlready++
        continue
      }

      stats.candidates++

      if (!dryRun && sendAttempts >= MAX_SENDS_PER_RUN) {
        stats.skippedCapped++
        continue
      }

      const driver = await prisma.monchisDriverCache.findUnique({
        where: { driverId },
        select: {
          driverId: true,
          firstName: true,
          lastName: true,
          fullName: true,
          email: true,
          phone: true,
          intercomContactId: true,
          intercomExternalId: true,
        },
      })

      const driverName =
        driver?.fullName ??
        ([driver?.firstName, driver?.lastName].filter(Boolean).join(" ").trim() ||
          "conductor")

      if (dryRun) {
        stats.dryRunCandidates?.push({
          shiftId: shift.shiftId,
          driverId,
          dateIso: shift.dateIso,
          fromHour: shift.fromHour,
          zoneId: shift.zoneId,
          zoneName: shift.zoneName,
          driverName,
          minutesUntil,
        })
        continue
      }

      let contactId = driver?.intercomContactId ?? null
      if (!contactId && driver) {
        contactId = await resolveContactId(driver)
      }

      if (!contactId) {
        stats.skippedNoContact++
        await prisma.turnoReminderSent.create({
          data: {
            shiftId: shift.shiftId,
            driverId,
            dateIso: shift.dateIso,
            fromHour: shift.fromHour,
            zoneId: shift.zoneId,
            zoneName: shift.zoneName,
            status: "skipped_no_contact",
          },
        })
        continue
      }

      const body = buildReminderBody(
        driverName,
        shift.zoneName,
        shift.fromHour != null ? hhmm(shift.fromHour) : "",
        minutesUntil,
      )

      sendAttempts++
      try {
        const result = await sendDirectMessage({
          contactId,
          senderAdminId: SENDER_ADMIN_ID,
          assigneeAdminId: ASSIGNEE_ADMIN_ID,
          body,
          driverId,
          clerkUserId: "system:cron-turno-reminders",
          metadata: {
            source: "turno_reminder",
            shiftId: shift.shiftId,
            zoneId: shift.zoneId,
            zoneName: shift.zoneName,
            dateIso: shift.dateIso,
            fromHour: shift.fromHour,
          },
        })

        await prisma.turnoReminderSent.create({
          data: {
            shiftId: shift.shiftId,
            driverId,
            dateIso: shift.dateIso,
            fromHour: shift.fromHour,
            zoneId: shift.zoneId,
            zoneName: shift.zoneName,
            status: "sent",
            intercomConversationId: result.conversationId,
          },
        })
        stats.sent++

        // Cerramos la conversación después de mandar el recordatorio (a
        // diferencia de otros envíos de Intercom, acá no se espera respuesta
        // del driver). Best-effort: si falla el cierre, el mensaje ya se
        // mandó y quedó registrado como 'sent' — no lo hacemos fallar por esto.
        if (result.conversationId) {
          try {
            await closeConversation(result.conversationId)
          } catch (closeErr) {
            console.error(
              "[turno-reminders] no se pudo cerrar la conversación:",
              closeErr instanceof Error ? closeErr.message : closeErr,
            )
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err)
        console.error("[turno-reminders] envío falló:", errorMessage)
        await prisma.turnoReminderSent.create({
          data: {
            shiftId: shift.shiftId,
            driverId,
            dateIso: shift.dateIso,
            fromHour: shift.fromHour,
            zoneId: shift.zoneId,
            zoneName: shift.zoneName,
            status: "failed",
            errorMessage,
          },
        })
        stats.failed++
      }

      await sleep(SEND_DELAY_MS)
    }
  }

  return stats
}

// ==================== LOG / AUDITORÍA ====================

export interface TurnoReminderLogItem {
  id: string
  createdAt: string
  shiftId: string
  driverId: string
  driverName: string
  dateIso: string
  fromHour: number | null
  zoneName: string
  status: string
  intercomConversationId: string | null
  errorMessage: string | null
}

export interface TurnoReminderLogResult {
  items: TurnoReminderLogItem[]
  nextCursor: string | null
}

/**
 * Lista paginada (cursor) de TurnoReminderSent con el nombre del driver
 * resuelto, para la vista de auditoría en el panel (pestaña Recordatorios).
 */
export async function listTurnoReminderLogs(
  opts: { limit?: number; cursor?: string; status?: string } = {},
): Promise<TurnoReminderLogResult> {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200)

  const rows = await prisma.turnoReminderSent.findMany({
    where: opts.status ? { status: opts.status } : undefined,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
  })

  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows
  const nextCursor = hasMore ? page[page.length - 1].id : null

  const driverIds = [...new Set(page.map((r) => r.driverId))]
  const drivers = driverIds.length
    ? await prisma.monchisDriverCache.findMany({
        where: { driverId: { in: driverIds } },
        select: { driverId: true, fullName: true, firstName: true, lastName: true },
      })
    : []
  const driverMap = new Map(drivers.map((d) => [d.driverId, d]))

  const items: TurnoReminderLogItem[] = page.map((r) => {
    const d = driverMap.get(r.driverId)
    const driverName =
      d?.fullName ??
      ([d?.firstName, d?.lastName].filter(Boolean).join(" ").trim() || r.driverId)
    return {
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      shiftId: r.shiftId,
      driverId: r.driverId,
      driverName,
      dateIso: r.dateIso,
      fromHour: r.fromHour,
      zoneName: r.zoneName,
      status: r.status,
      intercomConversationId: r.intercomConversationId,
      errorMessage: r.errorMessage,
    }
  })

  return { items, nextCursor }
}
