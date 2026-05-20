// app/api/cron/snapshot-turnos/route.ts
//
// Cron horario (`0 * * * *`) que saca una "foto" del estado de planificación de
// turnos (reservas por zona/hora) consultando la API externa SIN caché, la
// persiste en turnos_snapshot / turnos_shift_snapshot, y postea a Slack un
// resumen con el delta hora-a-hora por zona y las deserciones detectadas.
//
// NO modifica la vista on-the-fly de /admin/gestion/turnos.

import { NextRequest, NextResponse } from "next/server"

import { requireCronAuth } from "@/lib/auth"
import { captureTurnosSnapshot } from "@/lib/services/turnos-snapshot.service"

export const maxDuration = 120

export async function GET(request: NextRequest) {
  const cronError = requireCronAuth(request)
  if (cronError) {
    console.error("❌ [CRON snapshot-turnos] Unauthorized")
    return cronError
  }

  const t0 = Date.now()
  console.log("📸 [CRON snapshot-turnos] starting")

  try {
    const result = await captureTurnosSnapshot()
    const durationMs = Date.now() - t0
    console.log(
      `✅ [CRON snapshot-turnos] done: shifts=${result.shiftCount} ` +
        `active=${result.activeAssigned} zones=${result.zonesActive} ` +
        `events=${result.eventsCreated} slack=${result.slackSent} ` +
        `pruned=${result.pruned} in ${durationMs}ms`,
    )
    return NextResponse.json({
      success: true,
      ...result,
      durationMs,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error("❌ [CRON snapshot-turnos] error:", err)
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}
