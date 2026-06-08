"use server"

import { auth } from "@clerk/nextjs/server"
import { revalidatePath, revalidateTag } from "next/cache"

import { TURNOS_CONFIG } from "@/lib/config/turnos.config"
import { prisma } from "@/lib/prisma"
import { getComparison } from "@/lib/services/turnos-comparison.service"
import type { CompareMode, ComparisonData } from "@/lib/types/turnos.types"

export interface RefreshResult {
  ok: boolean
  refreshedAt: string
  error?: string
}

export async function refreshTurnos(): Promise<RefreshResult> {
  const { userId } = await auth()
  if (!userId) {
    return { ok: false, refreshedAt: new Date().toISOString(), error: "No autorizado" }
  }

  revalidateTag(TURNOS_CONFIG.cacheTag)
  revalidatePath("/admin/gestion/turnos")

  return { ok: true, refreshedAt: new Date().toISOString() }
}

// ---------------------------------------------------------------------------
// Drivers a revisar: drivers que históricamente tomaron este slot pero no
// están en los turnos actuales que lo cubren.
// ---------------------------------------------------------------------------

export interface DriverToReviewAttendance {
  day: string
  zone: string
  turn: string
  entryAt: string // ISO
  exitAt: string // ISO
}

export interface DriverToReview {
  driverId: string
  fullName: string
  weeksTaken: number
  totalWeeks: number
  attendances: DriverToReviewAttendance[]
}

export interface GetDriversToReviewParams {
  zoneName: string
  hour: number
  baseDateIso: string // "YYYY-MM-DD" del día seleccionado
  currentDriverIds: string[]
}

export interface GetDriversToReviewResult {
  ok: boolean
  drivers: DriverToReview[]
  totalWeeks: number
  weekDates: string[]
  error?: string
}

const WEEKS_BACK = 4
const MIN_WEEKS_TAKEN = 2

function normalizeZone(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
}

function timeToHourDecimal(t: string | null | undefined): number | null {
  if (!t) return null
  const parts = t.split(":")
  if (parts.length < 2) return null
  const h = Number(parts[0])
  const m = Number(parts[1])
  if (isNaN(h) || isNaN(m)) return null
  return h + m / 60
}

// Cache de variantes de zona — la lista cambia pocas veces al año pero la
// query distinct es costosa, así que la guardamos en memoria del proceso.
// normalizeZone(zone) -> [variantes exactas en DB]
const ZONE_VARIANTS_TTL_MS = 60 * 60 * 1000
let zoneVariantsCache: {
  value: Map<string, string[]>
  expiresAt: number
} | null = null

async function getZoneVariants(): Promise<Map<string, string[]>> {
  const now = Date.now()
  if (zoneVariantsCache && zoneVariantsCache.expiresAt > now) {
    return zoneVariantsCache.value
  }
  const rows = await prisma.monchisDriverAttendance.findMany({
    select: { zone: true },
    distinct: ["zone"],
  })
  const map = new Map<string, string[]>()
  for (const r of rows) {
    const key = normalizeZone(r.zone)
    const arr = map.get(key) || []
    arr.push(r.zone)
    map.set(key, arr)
  }
  zoneVariantsCache = { value: map, expiresAt: now + ZONE_VARIANTS_TTL_MS }
  return map
}

function pastSameWeekdayDates(baseDateIso: string, weeksBack: number): string[] {
  const [y, m, d] = baseDateIso.split("-").map(Number)
  if (!y || !m || !d) return []
  const out: string[] = []
  for (let i = 1; i <= weeksBack; i++) {
    const dt = new Date(Date.UTC(y, m - 1, d))
    dt.setUTCDate(dt.getUTCDate() - 7 * i)
    out.push(dt.toISOString().slice(0, 10))
  }
  return out
}

export async function getDriversToReview(
  params: GetDriversToReviewParams,
): Promise<GetDriversToReviewResult> {
  const { userId } = await auth()
  if (!userId) {
    return {
      ok: false,
      drivers: [],
      totalWeeks: WEEKS_BACK,
      weekDates: [],
      error: "No autorizado",
    }
  }

  const { zoneName, hour, baseDateIso, currentDriverIds } = params
  const weekDates = pastSameWeekdayDates(baseDateIso, WEEKS_BACK)
  if (weekDates.length === 0) {
    return { ok: true, drivers: [], totalWeeks: WEEKS_BACK, weekDates: [] }
  }

  const targetZone = normalizeZone(zoneName)
  const excluded = new Set(currentDriverIds)

  // Pre-filtramos la zona en DB con las variantes exactas (tildes, espacios)
  // para evitar traer todas las attendances de los 4 días.
  const variantsMap = await getZoneVariants()
  const zoneVariants = variantsMap.get(targetZone) || []
  if (zoneVariants.length === 0) {
    return { ok: true, drivers: [], totalWeeks: WEEKS_BACK, weekDates }
  }

  const rows = await prisma.monchisDriverAttendance.findMany({
    where: { day: { in: weekDates }, zone: { in: zoneVariants } },
    select: {
      driverId: true,
      day: true,
      zone: true,
      turn: true,
      turnEntryTime: true,
      turnExitTime: true,
      driverEntryAt: true,
      driverExitAt: true,
    },
  })

  // driverId -> Map<day, attendance> (deduplicamos por día — si hay varias
  // attendances el mismo día, nos quedamos con la primera coincidente).
  const byDriver = new Map<string, Map<string, DriverToReviewAttendance>>()

  for (const r of rows) {
    if (excluded.has(r.driverId)) continue
    if (normalizeZone(r.zone) !== targetZone) continue

    const fromH = timeToHourDecimal(r.turnEntryTime)
    let toH = timeToHourDecimal(r.turnExitTime)
    if (fromH === null || toH === null) continue
    // Turnos que terminan a las 00:00 / 01:00 representan cruce de medianoche.
    if (toH <= fromH) toH += 24

    // El turno cubre la hora `hour` si fromH <= hour && toH >= hour+1
    if (fromH > hour || toH < hour + 1) continue

    const att: DriverToReviewAttendance = {
      day: r.day,
      zone: r.zone,
      turn: r.turn,
      entryAt: r.driverEntryAt.toISOString(),
      exitAt: r.driverExitAt.toISOString(),
    }
    let perDay = byDriver.get(r.driverId)
    if (!perDay) {
      perDay = new Map()
      byDriver.set(r.driverId, perDay)
    }
    if (!perDay.has(r.day)) perDay.set(r.day, att)
  }

  const candidates = [...byDriver.entries()]
    .map(([driverId, perDay]) => ({
      driverId,
      attendances: [...perDay.values()].sort((a, b) =>
        a.day < b.day ? 1 : a.day > b.day ? -1 : 0,
      ),
      weeksTaken: perDay.size,
    }))
    .filter((c) => c.weeksTaken >= MIN_WEEKS_TAKEN)

  if (candidates.length === 0) {
    return { ok: true, drivers: [], totalWeeks: WEEKS_BACK, weekDates }
  }

  const cacheRows = await prisma.monchisDriverCache.findMany({
    where: { driverId: { in: candidates.map((c) => c.driverId) } },
    select: { driverId: true, fullName: true, firstName: true, lastName: true },
  })
  const nameByDriver = new Map<string, string>()
  for (const c of cacheRows) {
    const composed = c.fullName ||
      `${c.firstName || ""} ${c.lastName || ""}`.trim() ||
      c.driverId
    nameByDriver.set(c.driverId, composed)
  }

  const drivers: DriverToReview[] = candidates
    .map((c) => ({
      driverId: c.driverId,
      fullName: nameByDriver.get(c.driverId) || c.driverId,
      weeksTaken: c.weeksTaken,
      totalWeeks: WEEKS_BACK,
      attendances: c.attendances,
    }))
    .sort(
      (a, b) =>
        b.weeksTaken - a.weeksTaken ||
        a.fullName.localeCompare(b.fullName, "es"),
    )

  return { ok: true, drivers, totalWeeks: WEEKS_BACK, weekDates }
}

// ---------------------------------------------------------------------------
// Comparación con semanas anteriores: lee de los snapshots horarios y devuelve
// las reservas equivalentes (modo Final o Run rate) para superponer en gris.
// ---------------------------------------------------------------------------

export interface LoadComparisonResult {
  ok: boolean
  data?: ComparisonData
  error?: string
}

export async function loadComparison(params: {
  mode: CompareMode
  weeksBack: number
  selectedDate: string
}): Promise<LoadComparisonResult> {
  const { userId } = await auth()
  if (!userId) return { ok: false, error: "No autorizado" }

  try {
    const data = await getComparison(params)
    return { ok: true, data }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error desconocido",
    }
  }
}
