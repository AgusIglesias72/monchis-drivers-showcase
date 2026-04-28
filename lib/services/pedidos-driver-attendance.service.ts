import "server-only"

import { PEDIDOS_CONFIG } from "@/lib/config/pedidos.config"
import type {
  AttendanceFetchResult,
  RawAttendance,
} from "@/lib/types/pedidos.types"

function formatPyDateOnly(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Asuncion",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d)
}

export async function fetchDriverAttendance(
  driverId: string,
  day: Date | string,
): Promise<AttendanceFetchResult> {
  if (!PEDIDOS_CONFIG.token) {
    return {
      attendances: [],
      fetchedAt: new Date(),
      error: "MONCHIS_DRIVERS_API_TOKEN no configurado",
    }
  }

  const dayStr =
    typeof day === "string" ? day.slice(0, 10) : formatPyDateOnly(day)

  const params = new URLSearchParams({
    start_date: `${dayStr} 00:00:00`,
    end_date: `${dayStr} 23:59:59`,
    driver_id: driverId,
  })

  try {
    const res = await fetch(
      `${PEDIDOS_CONFIG.driverAttendanceUrl}?${params.toString()}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: PEDIDOS_CONFIG.token,
        },
        cache: "no-store",
      },
    )

    if (!res.ok) {
      return {
        attendances: [],
        fetchedAt: new Date(),
        error: `HTTP ${res.status}`,
      }
    }

    const json = (await res.json()) as {
      data?: RawAttendance[]
      success?: boolean
      message?: string
    }

    return {
      attendances: Array.isArray(json.data) ? json.data : [],
      fetchedAt: new Date(),
    }
  } catch (err) {
    return {
      attendances: [],
      fetchedAt: new Date(),
      error: err instanceof Error ? err.message : "Error desconocido",
    }
  }
}
