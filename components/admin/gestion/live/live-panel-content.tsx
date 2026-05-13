"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { AlertTriangle, Pause, Play, RefreshCw } from "lucide-react"
import { toast } from "sonner"

import { AdminHeader } from "@/components/admin/admin-header"
import type { PedidoFilter } from "@/components/admin/gestion/live/live-filters"
import { LiveFunnel } from "@/components/admin/gestion/live/live-funnel"
import { LiveKpis } from "@/components/admin/gestion/live/live-kpis"
import { LiveMap } from "@/components/admin/gestion/live/live-map"
import { LiveSidePanel } from "@/components/admin/gestion/live/live-side-panel"
import { LiveZonesGrid } from "@/components/admin/gestion/live/live-zones-grid"
import { PedidoDetailSheet } from "@/components/admin/gestion/live/pedido-detail-sheet"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { LIVE_PANEL_CONFIG } from "@/lib/config/live-panel.config"
import type {
  LivePanelPayload,
  LiveRoute,
} from "@/lib/types/live-panel.types"

interface Props {
  initial: LivePanelPayload
}

type Highlight =
  | { kind: "request" | "driver" | "zone"; id: string }
  | null

export function LivePanelContent({ initial }: Props) {
  const [data, setData] = useState<LivePanelPayload>(initial)
  const [paused, setPaused] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [highlight, setHighlight] = useState<Highlight>(null)
  const [pedidosFilter, setPedidosFilter] = useState<PedidoFilter>("all")
  const [activeRoute, setActiveRoute] = useState<LiveRoute | null>(null)
  const [routeLoading, setRouteLoading] = useState(false)
  // Cache local de rutas para no re-fetch al alternar.
  const routeCacheRef = useRef(new Map<string, LiveRoute>())
  const mapWrapperRef = useRef<HTMLDivElement | null>(null)

  // Para highlights de driver/zona traemos el mapa a la vista si quedó fuera
  // del viewport. Para "request" no hace falta — abrimos un sheet de detalle
  // que ya muestra todo (mapa de trayecto incluido).
  useEffect(() => {
    if (!highlight || highlight.kind === "request" || !mapWrapperRef.current)
      return
    const rect = mapWrapperRef.current.getBoundingClientRect()
    const isVisible = rect.top < window.innerHeight - 200 && rect.bottom > 100
    if (!isVisible) {
      mapWrapperRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      })
    }
  }, [highlight])

  // Mantenemos `paused` en un ref para que el setInterval lo lea sin recrearse.
  const pausedRef = useRef(paused)
  pausedRef.current = paused

  const refresh = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true)
    try {
      const res = await fetch("/api/admin/gestion/live", {
        cache: "no-store",
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const payload = (await res.json()) as LivePanelPayload
      setData(payload)
      if (manual) toast.success("Datos actualizados")
    } catch (err) {
      if (manual) {
        toast.error(
          err instanceof Error ? err.message : "Error actualizando el panel",
        )
      } else {
        // Silencioso en el polling — sólo log
        console.error("[live-panel] poll error:", err)
      }
    } finally {
      if (manual) setRefreshing(false)
    }
  }, [])

  // Cuando highlight cambia a un pedido, fetch (o lee del cache) su ruta.
  useEffect(() => {
    if (!highlight || highlight.kind !== "request") {
      setActiveRoute(null)
      return
    }
    const requestId = highlight.id
    const cached = routeCacheRef.current.get(requestId)
    if (cached) {
      setActiveRoute(cached)
      return
    }
    let cancelled = false
    setRouteLoading(true)
    fetch(`/api/admin/gestion/live/route-detail?requestId=${requestId}`, {
      cache: "no-store",
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return (await res.json()) as LiveRoute
      })
      .then((route) => {
        if (cancelled) return
        routeCacheRef.current.set(requestId, route)
        setActiveRoute(route)
      })
      .catch((err) => {
        if (cancelled) return
        console.error("[live-panel] route fetch error:", err)
        toast.error("No se pudo cargar la ruta del pedido")
      })
      .finally(() => {
        if (!cancelled) setRouteLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [highlight])

  // Polling con visibility-awareness: si el tab está oculto, pausamos para
  // no quemar requests ni cuota de la API legacy.
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null

    function start() {
      if (timer) return
      timer = setInterval(() => {
        if (pausedRef.current) return
        if (document.visibilityState !== "visible") return
        refresh(false)
      }, LIVE_PANEL_CONFIG.pollIntervalMs)
    }
    function stop() {
      if (!timer) return
      clearInterval(timer)
      timer = null
    }

    function onVisibility() {
      if (document.visibilityState === "visible" && !pausedRef.current) {
        // Refresh inmediato al volver al tab para no quedarte con data vieja.
        refresh(false)
        start()
      } else {
        stop()
      }
    }

    if (document.visibilityState === "visible") start()
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      stop()
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [refresh])

  const fetchedAt = new Date(data.fetchedAt)
  const fetchedAtLabel = fetchedAt.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })

  return (
    <>
      <AdminHeader
        breadcrumbs={[
          { label: "Gestión Admin" },
          { label: "Live" },
        ]}
      />

      <div className="flex-1 space-y-4 p-4 lg:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Panel Live</h1>
            <p className="text-sm text-muted-foreground">
              Estado en tiempo real — última actualización{" "}
              <span className="font-mono">{fetchedAtLabel}</span>
              {data.enqueued > 0 && (
                <span className="ml-2 text-xs text-muted-foreground/70">
                  · +{data.enqueued} pedido{data.enqueued === 1 ? "" : "s"} a
                  cola
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPaused((p) => !p)}
              title={
                paused
                  ? "Reanudar actualizaciones automáticas"
                  : "Pausar actualizaciones automáticas"
              }
            >
              {paused ? (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Reanudar
                </>
              ) : (
                <>
                  <Pause className="mr-2 h-4 w-4" />
                  Pausar
                </>
              )}
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => refresh(true)}
              disabled={refreshing}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              Actualizar
            </Button>
          </div>
        </div>

        {data.errors.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Algunos servicios externos fallaron</AlertTitle>
            <AlertDescription>
              <ul className="mt-1 list-disc pl-5 text-xs">
                {data.errors.map((e, i) => (
                  <li key={i}>
                    <span className="font-mono">{e.source}</span>: {e.message}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <LiveKpis summary={data.summary} />

        <LiveFunnel
          pending={data.pending}
          active={data.active}
          delayed={data.delayed}
          filter={pedidosFilter}
          onFilterChange={setPedidosFilter}
        />

        <LiveZonesGrid
          zones={data.zones}
          highlight={highlight}
          onHighlight={setHighlight}
        />

        {/* relative + z-0 + isolate crea un stacking context que contiene los
            panes internos de Leaflet (z-index 200-700 por default), evitando
            que se monten encima del Sheet de detalle (z-50). */}
        <div ref={mapWrapperRef} className="relative z-0 isolate scroll-mt-20">
          <LiveMap
            zones={data.zones}
            drivers={data.drivers}
            pending={data.pending}
            delayed={data.delayed}
            active={data.active}
            highlight={highlight}
            onHighlight={setHighlight}
            activeRoute={activeRoute}
            routeLoading={routeLoading}
          />
        </div>

        <LiveSidePanel
          pending={data.pending}
          delayed={data.delayed}
          active={data.active}
          drivers={data.drivers}
          zones={data.zones}
          highlight={highlight}
          onHighlight={setHighlight}
          filter={pedidosFilter}
          onFilterChange={setPedidosFilter}
        />
      </div>

      <PedidoDetailSheet
        pedido={
          highlight?.kind === "request"
            ? [
                ...data.pending,
                ...data.active,
                ...data.delayed,
              ].find((r) => r.requestId === highlight.id) ?? null
            : null
        }
        route={activeRoute}
        routeLoading={routeLoading}
        delayedSet={new Set(data.delayed.map((r) => r.requestId))}
        onClose={() => setHighlight(null)}
      />
    </>
  )
}
