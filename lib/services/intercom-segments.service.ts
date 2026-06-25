import "server-only"

import { TURNOS_CONFIG } from "@/lib/config/turnos.config"
import { prisma } from "@/lib/prisma"
import { fetchAllZoneShifts } from "@/lib/services/turnos.service"
import type { FlattenedShift, PaymentType } from "@/lib/types/turnos.types"

const WINDOW_DAYS = 3
const MS_PER_HOUR = 3_600_000
const MS_PER_DAY = 24 * MS_PER_HOUR

export interface SegmentShift {
  shiftId: string
  zoneName: string
  dateIso: string
  dayName: string
  fromHour: number | null
  toHour: number | null
  paymentType: PaymentType
}

export interface SegmentDriver {
  driverId: string
  fullName: string
  phone: string | null
  primaryZone: string | null
  linked: boolean
  intercomContactId: string | null
  // external_id legacy que Intercom tiene cargado (= User ID numérico de
  // Monchis). Sirve para matchear listas/CSV de User IDs contra el driver.
  intercomExternalId: string | null
  shiftCount: number
  shifts: SegmentShift[]
  // Días distintos con asistencia registrada en los últimos 7 días. Relevante
  // sobre todo para el segmento "sin turnos" (¿estuvo activo igual?).
  workedLastWeekDays: number
  // Turnos tomados en los últimos 30 días (snapshot materializado en la cache,
  // = filas de asistencia). Para detectar potenciales activos en "sin turnos".
  shiftsLast30d: number
  // True si ya iniciamos una conversación de Intercom con este driver (existe
  // fila en IntercomConversation). Se muestra como badge en todos los segmentos.
  hasConversation: boolean
}

export type EnabledFilter = "enabled" | "disabled" | "all"

export interface DriverSegments {
  windowDays: number
  windowFromIso: string
  windowToIso: string
  fetchedAt: string
  // Día más reciente con asistencia registrada (YYYY-MM-DD) o null si no hay
  // datos. Sirve para avisar en la UI si la asistencia viene atrasada.
  attendanceMaxDay: string | null
  errors: { zoneId: string; message: string }[]
  enabledFilter: EnabledFilter
  conTurnos: SegmentDriver[]
  sinTurnos: SegmentDriver[]
  totals: {
    drivers: number
    conTurnos: number
    sinTurnos: number
    linkedConTurnos: number
    linkedSinTurnos: number
    linkedTotal: number
  }
}

// "Ahora" en Asunción, expresado en el mismo marco pseudo-UTC que usan los
// turnos: dateIso + fromHour/toHour se leen con getUTCHours() así que su
// wall-clock representa hora de Asunción tratada como UTC. Para comparar contra
// "ahora" sin desfases de zona, traducimos el instante real a ese mismo marco.
function asuncionNowPseudoUtc(): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TURNOS_CONFIG.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date())
  const v = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0)
  const hour = v("hour") % 24 // algunos runtimes devuelven 24 a medianoche
  return new Date(
    Date.UTC(v("year"), v("month") - 1, v("day"), hour, v("minute"), v("second")),
  )
}

// Fecha YYYY-MM-DD de un instante pseudo-UTC (sus componentes UTC ya son el
// wall-clock de Asunción).
function pseudoIso(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate(),
  ).padStart(2, "0")}`
}

// ¿El turno se solapa con [now, windowEnd]? Construye inicio/fin en el mismo
// marco pseudo-UTC. Si toHour <= fromHour se asume cruce de medianoche (+24h);
// si no hay horas, cuenta el día completo del turno.
function shiftInWindow(
  shift: FlattenedShift,
  nowMs: number,
  windowEndMs: number,
): boolean {
  const [y, m, d] = shift.dateIso.split("-").map(Number)
  if (!y || !m || !d) return false

  const dayBaseMs = Date.UTC(y, m - 1, d)
  const fromH = shift.fromHour ?? 0
  let toH = shift.toHour ?? (shift.fromHour != null ? shift.fromHour + 1 : 24)
  if (toH <= fromH) toH += 24

  const startMs = dayBaseMs + fromH * MS_PER_HOUR
  const endMs = dayBaseMs + toH * MS_PER_HOUR
  return endMs >= nowMs && startMs <= windowEndMs
}

function displayName(d: {
  fullName: string | null
  firstName: string | null
  lastName: string | null
}): string {
  return (
    d.fullName ??
    ([d.firstName, d.lastName].filter(Boolean).join(" ").trim() || "(sin nombre)")
  )
}

export async function getDriverSegments(opts?: {
  fresh?: boolean
  enabledFilter?: EnabledFilter
}): Promise<DriverSegments> {
  const enabledFilter: EnabledFilter = opts?.enabledFilter ?? "enabled"
  const { shifts, fetchedAt, errors } = await fetchAllZoneShifts({
    fresh: opts?.fresh ?? false,
  })

  // Ventana: desde ahora hasta el FIN del día en el que caen las +72hs. Así, si
  // 72hs exactas caen en la tarde del domingo, igual incluimos toda la noche del
  // domingo (el día calendario completo).
  const now = asuncionNowPseudoUtc()
  const nowMs = now.getTime()
  const lastDay = new Date(nowMs + WINDOW_DAYS * MS_PER_DAY)
  const windowEnd = new Date(
    Date.UTC(
      lastDay.getUTCFullYear(),
      lastDay.getUTCMonth(),
      lastDay.getUTCDate(),
      23,
      59,
      59,
      999,
    ),
  )
  const windowEndMs = windowEnd.getTime()

  // driverId -> turnos dentro de la ventana
  const byDriver = new Map<string, SegmentShift[]>()
  for (const s of shifts) {
    if (!shiftInWindow(s, nowMs, windowEndMs)) continue
    const entry: SegmentShift = {
      shiftId: s.shiftId,
      zoneName: s.zoneName,
      dateIso: s.dateIso,
      dayName: s.dayName,
      fromHour: s.fromHour,
      toHour: s.toHour,
      paymentType: s.paymentType,
    }
    for (const id of s.driverIds) {
      const arr = byDriver.get(id)
      if (arr) arr.push(entry)
      else byDriver.set(id, [entry])
    }
  }

  // Asistencia de los últimos 7 días: días distintos trabajados por driver +
  // el día más reciente registrado (para señalar atraso de datos en la UI).
  const weekAgoIso = pseudoIso(new Date(nowMs - 7 * MS_PER_DAY))
  const todayIso = pseudoIso(now)
  const [drivers, attendanceRows, attendanceMax, conversationRows] =
    await Promise.all([
    prisma.monchisDriverCache.findMany({
      where:
        enabledFilter === "all"
          ? {}
          : { enabled: enabledFilter === "enabled" },
      select: {
        driverId: true,
        fullName: true,
        firstName: true,
        lastName: true,
        phone: true,
        primaryZone30d: true,
        intercomContactId: true,
        intercomExternalId: true,
        sessions30d: true,
      },
      orderBy: { fullName: "asc" },
    }),
    prisma.monchisDriverAttendance.findMany({
      where: { day: { gte: weekAgoIso, lte: todayIso } },
      select: { driverId: true, day: true },
      distinct: ["driverId", "day"],
    }),
    prisma.monchisDriverAttendance.aggregate({ _max: { day: true } }),
    prisma.intercomConversation.findMany({
      where: { driverId: { not: null } },
      select: { driverId: true },
      distinct: ["driverId"],
    }),
  ])

  const workedDays = new Map<string, number>()
  for (const r of attendanceRows) {
    workedDays.set(r.driverId, (workedDays.get(r.driverId) ?? 0) + 1)
  }

  const driversWithConversation = new Set<string>()
  for (const c of conversationRows) {
    if (c.driverId) driversWithConversation.add(c.driverId)
  }

  const conTurnos: SegmentDriver[] = []
  const sinTurnos: SegmentDriver[] = []
  let linkedConTurnos = 0
  let linkedSinTurnos = 0

  for (const d of drivers) {
    const linked = d.intercomContactId != null
    const base = {
      driverId: d.driverId,
      fullName: displayName(d),
      phone: d.phone,
      primaryZone: d.primaryZone30d,
      linked,
      intercomContactId: d.intercomContactId,
      intercomExternalId: d.intercomExternalId,
      workedLastWeekDays: workedDays.get(d.driverId) ?? 0,
      shiftsLast30d: d.sessions30d,
      hasConversation: driversWithConversation.has(d.driverId),
    }

    const driverShifts = byDriver.get(d.driverId)
    if (driverShifts && driverShifts.length > 0) {
      driverShifts.sort(
        (a, b) =>
          a.dateIso.localeCompare(b.dateIso) ||
          (a.fromHour ?? 0) - (b.fromHour ?? 0),
      )
      conTurnos.push({ ...base, shiftCount: driverShifts.length, shifts: driverShifts })
      if (linked) linkedConTurnos++
    } else {
      sinTurnos.push({ ...base, shiftCount: 0, shifts: [] })
      if (linked) linkedSinTurnos++
    }
  }

  conTurnos.sort(
    (a, b) => b.shiftCount - a.shiftCount || a.fullName.localeCompare(b.fullName),
  )
  // Default útil: potenciales activos primero (más turnos en los últimos 30d).
  sinTurnos.sort(
    (a, b) =>
      b.shiftsLast30d - a.shiftsLast30d || a.fullName.localeCompare(b.fullName),
  )

  return {
    windowDays: WINDOW_DAYS,
    windowFromIso: pseudoIso(now),
    windowToIso: pseudoIso(lastDay),
    fetchedAt: fetchedAt.toISOString(),
    attendanceMaxDay: attendanceMax._max.day ?? null,
    errors,
    enabledFilter,
    conTurnos,
    sinTurnos,
    totals: {
      drivers: drivers.length,
      conTurnos: conTurnos.length,
      sinTurnos: sinTurnos.length,
      linkedConTurnos,
      linkedSinTurnos,
      linkedTotal: linkedConTurnos + linkedSinTurnos,
    },
  }
}
