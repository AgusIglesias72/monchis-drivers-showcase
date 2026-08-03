// app/api/admin/gestion/anomalias/export/route.ts
//
// Exporta a Excel los eventos de "salida sin acción" (anomalías) respetando
// los filtros activos (tipo + rango de fechas). Reusa searchDepartureEvents
// con un pageSize amplio para traer todo el set filtrado.

import { NextRequest, NextResponse } from "next/server"
import * as XLSX from "xlsx"
import { formatInTimeZone } from "date-fns-tz"

import { searchDepartureEvents } from "@/lib/services/driver-departures-read.service"
import type { DepartureEventType } from "@/lib/services/driver-departure.service"
import { PY_TZ } from "@/lib/utils/onboarding-time"

export const dynamic = "force-dynamic"

// Cap defensivo: el cron retiene eventos 90 días, no esperamos más que esto.
const EXPORT_LIMIT = 50000

const TYPE_BY_PARAM: Record<string, DepartureEventType> = {
  origin: "LEFT_ORIGIN_WITHOUT_DELIVERY",
  dest: "LEFT_DESTINATION_WITHOUT_FINALIZE",
}

const TYPE_LABEL: Record<string, string> = {
  LEFT_ORIGIN_WITHOUT_DELIVERY: "Salió del comercio sin marcar En camino",
  LEFT_DESTINATION_WITHOUT_FINALIZE: "Se fue del cliente sin marcar Entregado",
}

const PLACE_LABEL: Record<string, string> = {
  LEFT_ORIGIN_WITHOUT_DELIVERY: "Comercio",
  LEFT_DESTINATION_WITHOUT_FINALIZE: "Cliente",
}

const STATUS_LABEL: Record<string, string> = {
  FINALIZED: "Entregado",
  CANCELED: "Cancelado",
  CANCELED_BY_CLIENT: "Cancelado por cliente",
  CANCELLED: "Cancelado",
  DELIVERY: "En camino",
  OUTSIDE: "Afuera",
  WAITING_ORDER: "En el comercio",
  ACCEPTED: "Aceptado",
  PENDING: "Buscando driver",
}

function statusLabel(status: string | null): string {
  if (!status) return "—"
  return STATUS_LABEL[status] || status
}

function parseDateOrNull(s: string | undefined, endOfDay = false): Date | null {
  if (!s) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim())
  if (!m) return null
  const [, y, mo, d] = m
  return new Date(
    `${y}-${mo}-${d}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`,
  )
}

function fmtDate(d: Date | null): string {
  if (!d) return ""
  return formatInTimeZone(d, PY_TZ, "dd/MM/yyyy HH:mm")
}

function fmtDuration(seconds: number | null): string {
  if (seconds === null) return ""
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m < 60) return s > 0 ? `${m}m ${s}s` : `${m}m`
  const h = Math.floor(m / 60)
  return `${h}h ${m % 60}m`
}

// ¿La orden avanzó después del evento? (marcado tardío).
function markedLater(
  type: string,
  currentStatus: string | null,
): boolean {
  if (!currentStatus) return false
  if (type === "LEFT_ORIGIN_WITHOUT_DELIVERY") {
    return ["DELIVERY", "OUTSIDE", "FINALIZED"].includes(currentStatus)
  }
  return currentStatus === "FINALIZED"
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const typeParam: string =
      body.type && TYPE_BY_PARAM[body.type] ? body.type : "all"
    const from = parseDateOrNull(body.from)
    const to = parseDateOrNull(body.to, true)

    const { rows } = await searchDepartureEvents({
      from,
      to,
      type: typeParam === "all" ? null : TYPE_BY_PARAM[typeParam],
      page: 1,
      pageSize: EXPORT_LIMIT,
    })

    const excelData = rows.map((r) => ({
      "ID Evento": r.id,
      Tipo: TYPE_LABEL[r.type] || r.type,
      "Pedido": r.externalOrderId ? `#${r.externalOrderId}` : "",
      "Request ID": r.requestId,
      Driver: r.driverName || "",
      Zona: r.zoneName || "",
      Comercio: r.branchName || "",
      "Lugar del evento": r.placeName || "",
      "Tipo de lugar": PLACE_LABEL[r.type] || "",
      "Estado en el evento": statusLabel(r.stateAtEvent),
      "Llegó al lugar": fmtDate(r.arrivedAt),
      "Se fue del lugar": fmtDate(r.leftAt),
      "Tiempo en el lugar": fmtDuration(r.dwellSeconds),
      "Tiempo en el lugar (seg)": r.dwellSeconds,
      Detectado: fmtDate(r.detectedAt),
      "Distancia al detectar (m)": r.distanceAtDetectionM,
      "Distancia otro punto (m)":
        r.otherPlaceDistanceM ?? "",
      "Estado actual": statusLabel(r.currentStatus),
      "Marcó después": markedLater(r.type, r.currentStatus) ? "Sí" : "No",
    }))

    const ws = XLSX.utils.json_to_sheet(excelData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Anomalías")

    ws["!cols"] = [
      { wch: 10 }, // ID Evento
      { wch: 42 }, // Tipo
      { wch: 12 }, // Pedido
      { wch: 26 }, // Request ID
      { wch: 24 }, // Driver
      { wch: 20 }, // Zona
      { wch: 24 }, // Comercio
      { wch: 30 }, // Lugar del evento
      { wch: 14 }, // Tipo de lugar
      { wch: 18 }, // Estado en el evento
      { wch: 18 }, // Llegó al lugar
      { wch: 18 }, // Se fue del lugar
      { wch: 16 }, // Tiempo en el lugar
      { wch: 20 }, // Tiempo (seg)
      { wch: 18 }, // Detectado
      { wch: 22 }, // Distancia al detectar
      { wch: 22 }, // Distancia otro punto
      { wch: 18 }, // Estado actual
      { wch: 14 }, // Marcó después
    ]

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })

    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="anomalias_${
          new Date().toISOString().split("T")[0]
        }.xlsx"`,
      },
    })
  } catch (error: any) {
    console.error("Error al exportar anomalías:", error)
    return NextResponse.json(
      { error: error.message || "Error al exportar datos" },
      { status: 500 },
    )
  }
}
