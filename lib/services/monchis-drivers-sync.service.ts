import "server-only"

import { prisma } from "@/lib/prisma"

const DRIVER_READ_URL =
  process.env.MONCHIS_DRIVERS_API_URL_DRIVER_READ ||
  "https://api.monchis-drivers.com/dashboard/driver_read"

interface RawDriverContact {
  phone?: string
  email?: string
  phone_validated_at?: string
}

interface RawMonchisDriver {
  _id: string
  first_name?: string
  last_name?: string
  document_number?: string
  birth_date?: string
  createdAt?: string
  updatedAt?: string
  enabled?: boolean
  contact?: RawDriverContact
  address?: Record<string, unknown>
}

interface RawDriverResponse {
  data?: RawMonchisDriver[]
  success?: boolean
  message?: string
}

export interface DriverSyncResult {
  ok: boolean
  fetched: number
  upserted: number
  durationMs: number
  error?: string
}

function safeDate(s: string | undefined | null): Date | null {
  if (!s) return null
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

function buildFullName(first?: string, last?: string): string | null {
  const f = (first || "").trim()
  const l = (last || "").trim()
  const full = `${f} ${l}`.replace(/\s+/g, " ").trim()
  return full || null
}

export async function syncMonchisDrivers(): Promise<DriverSyncResult> {
  const start = Date.now()
  const token = process.env.MONCHIS_DRIVERS_API_TOKEN
  if (!token) {
    return {
      ok: false,
      fetched: 0,
      upserted: 0,
      durationMs: Date.now() - start,
      error: "MONCHIS_DRIVERS_API_TOKEN no configurado",
    }
  }

  let drivers: RawMonchisDriver[] = []
  try {
    const res = await fetch(DRIVER_READ_URL, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: token,
      },
      cache: "no-store",
    })
    if (!res.ok) {
      return {
        ok: false,
        fetched: 0,
        upserted: 0,
        durationMs: Date.now() - start,
        error: `HTTP ${res.status}`,
      }
    }
    const json = (await res.json()) as RawDriverResponse
    if (!Array.isArray(json.data)) {
      return {
        ok: false,
        fetched: 0,
        upserted: 0,
        durationMs: Date.now() - start,
        error: json.message || "Respuesta sin data",
      }
    }
    drivers = json.data
  } catch (err) {
    return {
      ok: false,
      fetched: 0,
      upserted: 0,
      durationMs: Date.now() - start,
      error: err instanceof Error ? err.message : "Error desconocido",
    }
  }

  // Upsert en chunks paralelizados para evitar saturar la conexión.
  const CHUNK_SIZE = 50
  let upserted = 0
  for (let i = 0; i < drivers.length; i += CHUNK_SIZE) {
    const chunk = drivers.slice(i, i + CHUNK_SIZE)
    await Promise.all(
      chunk.map((d) => {
        const data = {
          firstName: d.first_name?.trim() || null,
          lastName: d.last_name?.trim() || null,
          fullName: buildFullName(d.first_name, d.last_name),
          documentNumber: d.document_number || null,
          email: d.contact?.email || null,
          phone: d.contact?.phone || null,
          phoneValidatedAt: safeDate(d.contact?.phone_validated_at),
          birthDate: safeDate(d.birth_date),
          enabled: d.enabled ?? false,
          createdAtRemote: safeDate(d.createdAt),
          updatedAtRemote: safeDate(d.updatedAt),
          rawData: d as unknown as object,
        }
        return prisma.monchisDriverCache
          .upsert({
            where: { driverId: d._id },
            create: { driverId: d._id, ...data },
            update: data,
          })
          .then(() => {
            upserted += 1
          })
          .catch((err) => {
            console.error(`[drivers-sync] upsert ${d._id} falló:`, err)
          })
      }),
    )
  }

  return {
    ok: true,
    fetched: drivers.length,
    upserted,
    durationMs: Date.now() - start,
  }
}
