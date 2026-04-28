"use server"

import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"

import {
  processDriverAttendance,
  updateDriverStatsSnapshot,
} from "@/lib/services/monchis-driver-attendance.service"

export interface ProcessActionResult {
  ok: boolean
  fetched?: number
  skipped?: number
  errors?: number
  durationMs?: number
  error?: string
}

const REQUEST_ID_RE = /^[a-f0-9]{24}$/i

export async function processDriverDays(
  driverId: string,
  daysBack: number,
  options: { forceRefresh?: boolean } = {},
): Promise<ProcessActionResult> {
  const { userId } = await auth()
  if (!userId) return { ok: false, error: "No autorizado" }

  if (!REQUEST_ID_RE.test(driverId)) {
    return { ok: false, error: "driverId inválido" }
  }
  const days = Math.max(1, Math.min(daysBack, 90))

  const result = await processDriverAttendance(driverId, days, options)
  // Refrescar snapshot 30d para que el listado lo refleje (errores acá no
  // rompen la action — la data principal ya quedó persistida).
  try {
    await updateDriverStatsSnapshot(driverId)
  } catch (err) {
    console.error("[drivers] updateDriverStatsSnapshot error:", err)
  }
  revalidatePath(`/admin/gestion/drivers/${driverId}`)
  revalidatePath("/admin/gestion/drivers")

  return {
    ok: result.ok,
    fetched: result.fetched,
    skipped: result.skipped,
    errors: result.errors.length,
    durationMs: result.durationMs,
    error: result.errors.length > 0
      ? `${result.errors.length} día(s) con error: ${result.errors.slice(0, 2).map((e) => `${e.day} (${e.message})`).join(", ")}`
      : undefined,
  }
}
