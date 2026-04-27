"use server"

import { auth } from "@clerk/nextjs/server"
import { revalidatePath, revalidateTag } from "next/cache"

import { TURNOS_CONFIG } from "@/lib/config/turnos.config"

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
