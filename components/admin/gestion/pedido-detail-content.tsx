"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { format, formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

import { parseOrderInstant } from "@/lib/utils/pedidos-time"
import { ArrowLeft, AlertCircle, Database, RefreshCw, Wifi } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

import { AdminHeader } from "@/components/admin/admin-header"
import { PedidoDetalle } from "@/components/admin/gestion/pedido-detalle"
import { PedidoDriverDay } from "@/components/admin/gestion/pedido-driver-day"
import { PedidoKpis } from "@/components/admin/gestion/pedido-kpis"
import { PedidoMap } from "@/components/admin/gestion/pedido-map"
import { PedidoTimeline } from "@/components/admin/gestion/pedido-timeline"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { refreshPedido } from "@/app/admin/gestion/pedidos/actions"
import {
  buildMapPoints,
  computeKpis,
} from "@/lib/services/pedidos-kpis"
import type {
  AttendanceFetchResult,
  RawOrder,
} from "@/lib/types/pedidos.types"

interface Props {
  requestId: string
  order?: RawOrder
  source?: "api" | "cache"
  fetchedAtIso?: string
  attendance?: AttendanceFetchResult | null
  googleMapsApiKey?: string
  error?: string
}

function statusBadgeClass(status: string | undefined): string {
  switch (status) {
    case "FINALIZED":
      return "bg-success-soft text-success hover:bg-success-soft"
    case "CANCELLED":
      return "bg-danger-soft text-destructive hover:bg-danger-soft"
    default:
      return "bg-info-soft text-info hover:bg-info-soft"
  }
}

export function PedidoDetailContent({
  requestId,
  order,
  source,
  fetchedAtIso,
  attendance,
  googleMapsApiKey,
  error,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [focusedHistoryIdx, setFocusedHistoryIdx] = useState<number | null>(null)

  const kpis = useMemo(() => (order ? computeKpis(order) : null), [order])
  const mapPoints = useMemo(() => (order ? buildMapPoints(order) : []), [order])
  const offersCount = useMemo(
    () =>
      (order?.histories || []).filter(
        (h) =>
          h.request_state === "PENDING" &&
          (h.drivers_by_id || []).length > 0,
      ).length,
    [order],
  )

  const handleRefresh = () => {
    startTransition(async () => {
      const res = await refreshPedido(requestId)
      if (!res.ok) {
        toast.error(res.error || "No se pudo actualizar")
        return
      }
      router.refresh()
      toast.success("Pedido actualizado")
    })
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-background">
        <AdminHeader
          breadcrumbs={[
            { label: "Gestión Admin" },
            { label: "Pedidos", href: "/admin/gestion/pedidos" },
            { label: requestId.slice(0, 8) },
          ]}
        />
        <div className="w-full p-4 sm:p-6 lg:p-8 space-y-4">
          <Link
            href="/admin/gestion/pedidos"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Volver
          </Link>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No se pudo cargar el pedido</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  const fetchedAt = fetchedAtIso ? new Date(fetchedAtIso) : null
  const externalOrderId = order.external_order_id || null
  const status = order.driver_request_state

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader
        breadcrumbs={[
          { label: "Gestión Admin" },
          { label: "Pedidos", href: "/admin/gestion/pedidos" },
          {
            label: externalOrderId ? `#${externalOrderId}` : requestId.slice(0, 8),
          },
        ]}
      />

      <div className="w-full p-4 sm:p-6 lg:p-8 space-y-6">
        <div>
          <Link
            href="/admin/gestion/pedidos"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Volver al buscador
          </Link>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Pedido {externalOrderId ? `#${externalOrderId}` : requestId.slice(0, 8)}
              </h1>
              {status && (
                <Badge variant="secondary" className={statusBadgeClass(status)}>
                  {status}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-1 text-sm font-mono">
              {requestId}
            </p>
            {(() => {
              const parsed = parseOrderInstant(order.data_origin?.confirmed_at)
              if (!parsed) return null
              return (
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Confirmado {format(parsed, "PPpp", { locale: es })}
                </p>
              )
            })()}
          </div>

          <div className="flex flex-col items-start gap-2 sm:items-end">
            <div className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
              {source === "cache" ? (
                <>
                  <Database className="h-3 w-3" />
                  Datos desde cache
                </>
              ) : (
                <>
                  <Wifi className="h-3 w-3" />
                  Datos en vivo desde la API
                </>
              )}
              {fetchedAt && (
                <span className="text-muted-foreground/70">
                  · {formatDistanceToNow(fetchedAt, { addSuffix: true, locale: es })}
                </span>
              )}
            </div>
            <Button
              onClick={handleRefresh}
              disabled={isPending}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
              {isPending ? "Actualizando..." : "Actualizar"}
            </Button>
          </div>
        </div>

        {kpis && <PedidoKpis kpis={kpis} offersCount={offersCount} />}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <PedidoMap
              points={mapPoints}
              apiKey={googleMapsApiKey || ""}
              focusedHistoryIdx={focusedHistoryIdx}
              onMarkerClick={setFocusedHistoryIdx}
            />
            <PedidoDetalle order={order} />
            <PedidoDriverDay
              attendance={attendance ?? null}
              currentExternalOrderId={externalOrderId}
            />
          </div>

          <div className="lg:col-span-1">
            <PedidoTimeline
              histories={order.histories || []}
              confirmedAt={order.data_origin?.confirmed_at ?? null}
              focusedIdx={focusedHistoryIdx}
              onSelect={setFocusedHistoryIdx}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
