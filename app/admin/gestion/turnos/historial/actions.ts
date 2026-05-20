"use server"

import { auth } from "@clerk/nextjs/server"

import {
  getSnapshotDetail,
  type SnapshotDetail,
} from "@/lib/services/turnos-snapshot-read.service"

export interface LoadSnapshotResult {
  ok: boolean
  detail?: SnapshotDetail
  error?: string
}

// Carga el detalle (cobertura + diff vs hora anterior) de una foto registrada.
// La captura es 100% automática vía cron horario; desde la UI solo se consulta.
export async function loadSnapshotDetail(
  snapshotId: string,
): Promise<LoadSnapshotResult> {
  const { userId } = await auth()
  if (!userId) return { ok: false, error: "No autorizado" }

  try {
    const detail = await getSnapshotDetail(snapshotId)
    if (!detail) return { ok: false, error: "Foto no encontrada" }
    return { ok: true, detail }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error desconocido",
    }
  }
}
