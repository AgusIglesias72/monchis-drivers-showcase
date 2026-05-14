"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  AlertTriangle,
  Bike,
  EyeOff,
  Layers,
  Map as MapIcon,
  MapPinOff,
  Pause,
  Play,
  RefreshCw,
  ShoppingBag,
  Store,
} from "lucide-react"
import { toast } from "sonner"

import { AdminHeader } from "@/components/admin/admin-header"
import { CommerceDetailSheet } from "@/components/admin/gestion/live/commerce-detail-sheet"
import { DriverDetailSheet } from "@/components/admin/gestion/live/driver-detail-sheet"
import type { PedidoFilter } from "@/components/admin/gestion/live/live-filters"
import { LiveComerciosGrid } from "@/components/admin/gestion/live/live-comercios-grid"
import { LiveDriversLoad } from "@/components/admin/gestion/live/live-drivers-load"
import { LiveFunnel } from "@/components/admin/gestion/live/live-funnel"
import { LiveMap } from "@/components/admin/gestion/live/live-map"
import { LiveZonesGrid } from "@/components/admin/gestion/live/live-zones-grid"
import {
  DriversTab,
  PedidosTab,
} from "@/components/admin/gestion/live/live-side-panel"
import { PedidoDetailSheet } from "@/components/admin/gestion/live/pedido-detail-sheet"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LIVE_PANEL_CONFIG } from "@/lib/config/live-panel.config"
import { aggregateCommerces } from "@/lib/services/live-commerces"
import type {
  LivePanelPayload,
  LiveRequest,
  LiveRoute,
} from "@/lib/types/live-panel.types"

interface Props {
  initial: LivePanelPayload
}

type Highlight =
  | { kind: "request" | "driver" | "zone" | "commerce"; id: string }
  | null

type LiveView = "pedidos" | "drivers" | "comercios"

export function LivePanelContent({ initial }: Props) {
  const [data, setData] = useState<LivePanelPayload>(initial)
  const [paused, setPaused] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [highlight, setHighlight] = useState<Highlight>(null)
  const [pedidosFilter, setPedidosFilter] = useState<PedidoFilter>("all")
  const [activeRoute, setActiveRoute] = useState<LiveRoute | null>(null)
  const [routeLoading, setRouteLoading] = useState(false)
  const [view, setView] = useState<LiveView>("pedidos")
  const [showMap, setShowMap] = useState(true)
  const [showZones, setShowZones] = useState(true)

  const commerces = useMemo(
    () =>
      aggregateCommerces({
        pending: data.pending,
        delayed: data.delayed,
        active: data.active,
      }),
    [data.pending, data.delayed, data.active],
  )
  const commercesAlertCount = useMemo(
    () => commerces.filter((c) => c.hasAlert).length,
    [commerces],
  )
  // Cache local de rutas. Guardamos `null` para fetches fallidos así no
  // reintentamos en bucle si el backend legacy está caído / devuelve 500.
  const routeCacheRef = useRef(new Map<string, LiveRoute | null>())
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

  // Si el highlight es un driver con pedidos vigentes, mostramos el trayecto
  // del más representativo (priorizamos DELIVERY/OUTSIDE → WAITING_ORDER →
  // ACCEPTED → resto, desempata por antigüedad en estado).
  const driverActiveRequestId = useMemo<string | null>(() => {
    if (highlight?.kind !== "driver") return null
    const orders = data.active.filter((r) => r.driverId === highlight.id)
    if (orders.length === 0) return null
    const priority = (s: string | null) => {
      if (s === "DELIVERY" || s === "OUTSIDE") return 0
      if (s === "WAITING_ORDER") return 1
      if (
        s === "ACCEPTED" ||
        s === "ASSIGNED" ||
        s === "ASSIGNED_DELIVERY" ||
        s === "ASSIGNED_PICKUP"
      )
        return 2
      return 3
    }
    const sorted = [...orders].sort((a, b) => {
      const pa = priority(a.state)
      const pb = priority(b.state)
      if (pa !== pb) return pa - pb
      const at = a.currentStateSince
        ? new Date(a.currentStateSince).getTime()
        : Number.POSITIVE_INFINITY
      const bt = b.currentStateSince
        ? new Date(b.currentStateSince).getTime()
        : Number.POSITIVE_INFINITY
      return at - bt
    })
    return sorted[0]?.requestId ?? null
  }, [highlight, data.active])

  // Cuando highlight cambia a un pedido (o a un driver con pedido vigente),
  // fetch (o lee del cache) la ruta correspondiente.
  useEffect(() => {
    let requestId: string | null = null
    if (highlight?.kind === "request") requestId = highlight.id
    else if (highlight?.kind === "driver") requestId = driverActiveRequestId

    if (!requestId) {
      setActiveRoute(null)
      return
    }

    // Si ya tenemos un fetch (exitoso o fallido) cacheado, usamos eso.
    if (routeCacheRef.current.has(requestId)) {
      setActiveRoute(routeCacheRef.current.get(requestId) ?? null)
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
        routeCacheRef.current.set(requestId!, route)
        setActiveRoute(route)
      })
      .catch((err) => {
        if (cancelled) return
        // El backend legacy a veces tira 500/timeouts en route-detail (caché
        // miss + upstream lento). Cacheamos el fallo para evitar refetch en
        // loop y dejamos al panel funcionando sin ruta — el resto del mapa
        // sigue siendo útil.
        console.error("[live-panel] route fetch error:", err)
        routeCacheRef.current.set(requestId!, null)
        setActiveRoute(null)
      })
      .finally(() => {
        if (!cancelled) setRouteLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [highlight, driverActiveRequestId])

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
            {view === "pedidos" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowZones((s) => !s)}
                title={showZones ? "Ocultar zonas" : "Mostrar zonas"}
              >
                {showZones ? (
                  <>
                    <EyeOff className="mr-2 h-4 w-4" />
                    Ocultar zonas
                  </>
                ) : (
                  <>
                    <Layers className="mr-2 h-4 w-4" />
                    Mostrar zonas
                  </>
                )}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMap((s) => !s)}
              title={showMap ? "Ocultar mapa" : "Mostrar mapa"}
            >
              {showMap ? (
                <>
                  <MapPinOff className="mr-2 h-4 w-4" />
                  Ocultar mapa
                </>
              ) : (
                <>
                  <MapIcon className="mr-2 h-4 w-4" />
                  Mostrar mapa
                </>
              )}
            </Button>
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

        {/* Tabs (renderizado arriba; el mismo nodo se repite abajo del mapa). */}
        <ViewTabs
          view={view}
          setView={setView}
          pendingCount={data.pending.length + data.active.length}
          driversCount={data.drivers.length}
          commercesCount={commerces.length}
          commercesAlertCount={commercesAlertCount}
        />

        {/* Stats row específica de cada vista */}
        {view === "pedidos" && (
          <LiveFunnel
            pending={data.pending}
            active={data.active}
            delayed={data.delayed}
            filter={pedidosFilter}
            onFilterChange={setPedidosFilter}
          />
        )}
        {view === "pedidos" && showZones && data.zones.length > 0 && (
          <LiveZonesGrid
            zones={data.zones}
            highlight={highlight}
            onHighlight={setHighlight}
          />
        )}
        {view === "drivers" && <LiveDriversLoad drivers={data.drivers} />}
        {/* Comercios: sin stats row (la grilla de zonas hacía ruido y el sort
            tier-based del grid ya prioriza los comercios con problemas). */}

        {/* Mapa full width arriba; lista de la vista activa abajo. El mapa
            es togglable desde el header (showMap).
            relative + z-0 + isolate crea un stacking context que contiene los
            panes internos de Leaflet (z-index 200-700 por default), evitando
            que se monten encima del Sheet de detalle (z-50). */}
        {showMap && (
          <div
            ref={mapWrapperRef}
            className="relative z-0 isolate scroll-mt-20"
          >
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
        )}

        {/* Tabs replicadas abajo del mapa para no obligar a scrollear arriba. */}
        {showMap && (
          <ViewTabs
            view={view}
            setView={setView}
            pendingCount={data.pending.length + data.active.length}
            driversCount={data.drivers.length}
            commercesCount={commerces.length}
            commercesAlertCount={commercesAlertCount}
          />
        )}

        {view === "pedidos" && (
          <PedidosTab
            pending={data.pending}
            delayed={data.delayed}
            active={data.active}
            highlight={highlight}
            onHighlight={setHighlight}
            filter={pedidosFilter}
            onFilterChange={setPedidosFilter}
          />
        )}
        {view === "drivers" && (
          <DriversTab
            drivers={data.drivers}
            zones={data.zones}
            highlight={highlight}
            onHighlight={setHighlight}
            allRequests={[
              ...data.pending,
              ...data.active,
              ...data.delayed,
            ]}
            onRequestClick={(id) => setHighlight({ kind: "request", id })}
          />
        )}
        {view === "comercios" && (
          <LiveComerciosGrid
            commerces={commerces}
            drivers={data.drivers}
            highlight={highlight}
            onHighlight={setHighlight}
            onRequestClick={(id) =>
              setHighlight({ kind: "request", id })
            }
          />
        )}
      </div>

      <PedidoDetailSheet
        pedido={(() => {
          if (highlight?.kind !== "request") return null
          return (
            [
              ...data.pending,
              ...data.active,
              ...data.delayed,
            ].find((r) => r.requestId === highlight.id) ?? null
          )
        })()}
        driver={(() => {
          if (highlight?.kind !== "request") return null
          const r = [
            ...data.pending,
            ...data.active,
            ...data.delayed,
          ].find((r) => r.requestId === highlight.id)
          if (!r?.driverId) return null
          return data.drivers.find((d) => d.driverId === r.driverId) ?? null
        })()}
        delayedSet={new Set(data.delayed.map((r) => r.requestId))}
        onClose={() => setHighlight(null)}
      />

      {/* Si el mapa está visible, el highlight de un driver dibuja su ruta
          punteada y NO abrimos el sheet — la info ya queda visible sobre el
          mapa. Sólo desplegamos el sheet cuando el mapa está oculto. */}
      <DriverDetailSheet
        driver={
          !showMap && highlight?.kind === "driver"
            ? data.drivers.find((d) => d.driverId === highlight.id) ?? null
            : null
        }
        driverRequests={
          !showMap && highlight?.kind === "driver"
            ? data.active.filter((r) => r.driverId === highlight.id)
            : []
        }
        onClose={() => setHighlight(null)}
        onRequestClick={(id) => setHighlight({ kind: "request", id })}
      />

      <CommerceDetailSheet
        commerce={
          highlight?.kind === "commerce"
            ? commerces.find(
                (c) => String(c.branchId) === highlight.id,
              ) ?? null
            : null
        }
        commerceRequests={
          highlight?.kind === "commerce"
            ? (() => {
                const branchId = Number(highlight.id)
                const merged = new Map<string, LiveRequest>()
                for (const r of data.pending) merged.set(r.requestId, r)
                for (const r of data.active) merged.set(r.requestId, r)
                return [...merged.values()].filter(
                  (r) => r.branchId === branchId,
                )
              })()
            : []
        }
        onClose={() => setHighlight(null)}
        onRequestClick={(id) => setHighlight({ kind: "request", id })}
      />
    </>
  )
}

function ViewTabs({
  view,
  setView,
  pendingCount,
  driversCount,
  commercesCount,
  commercesAlertCount,
}: {
  view: LiveView
  setView: (v: LiveView) => void
  pendingCount: number
  driversCount: number
  commercesCount: number
  commercesAlertCount: number
}) {
  return (
    <Tabs value={view} onValueChange={(v) => setView(v as LiveView)}>
      <TabsList className="h-9">
        <TabsTrigger value="pedidos" className="gap-1.5 px-3 text-[13px]">
          <ShoppingBag className="h-3.5 w-3.5" />
          Pedidos
          <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-muted px-1 text-[10px] font-bold tabular-nums">
            {pendingCount}
          </span>
        </TabsTrigger>
        <TabsTrigger value="drivers" className="gap-1.5 px-3 text-[13px]">
          <Bike className="h-3.5 w-3.5" />
          Drivers
          <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-muted px-1 text-[10px] font-bold tabular-nums">
            {driversCount}
          </span>
        </TabsTrigger>
        <TabsTrigger value="comercios" className="gap-1.5 px-3 text-[13px]">
          <Store className="h-3.5 w-3.5" />
          Comercios
          <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-muted px-1 text-[10px] font-bold tabular-nums">
            {commercesCount}
          </span>
          {commercesAlertCount > 0 && (
            <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold tabular-nums text-white">
              {commercesAlertCount}
            </span>
          )}
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
