"use client"

import "leaflet/dist/leaflet.css"

import { useEffect, useMemo, useRef } from "react"
import L from "leaflet"
import { Phone, Timer } from "lucide-react"
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polygon,
  Polyline,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet"

import { LIVE_PANEL_CONFIG } from "@/lib/config/live-panel.config"
import type {
  LiveBreadcrumb,
  LiveDriver,
  LiveRequest,
  LiveRoute,
  LiveZone,
} from "@/lib/types/live-panel.types"

interface Props {
  zones: LiveZone[]
  drivers: LiveDriver[]
  pending: LiveRequest[]
  delayed: LiveRequest[]
  active: LiveRequest[]
  highlight: { kind: "request" | "driver" | "zone" | "commerce"; id: string } | null
  onHighlight: (
    h: { kind: "request" | "driver" | "zone" | "commerce"; id: string } | null,
  ) => void
  activeRoute: LiveRoute | null
  routeLoading: boolean
  breadcrumb: LiveBreadcrumb | null
}

interface CommerceGroup {
  key: string
  origin: { lat: number; lng: number; name: string; address: string }
  branchId: number | null
  requests: LiveRequest[]
}

const ZONE_FILL: Record<LiveZone["warningKpi"], string> = {
  default: "#10b981",
  yellow: "#f59e0b",
  red: "#ef4444",
}

const ZONE_OPACITY: Record<LiveZone["warningKpi"], number> = {
  default: 0.06,
  yellow: 0.18,
  red: 0.28,
}

const PRE_DELIVERY_STATES = new Set([
  "PENDING",
  "ASSIGNED",
  "ASSIGNED_DELIVERY",
  "ASSIGNED_PICKUP",
  "ACCEPTED",
  "WAITING_ORDER",
])

function isPreDelivery(state: string | null): boolean {
  return state ? PRE_DELIVERY_STATES.has(state) : false
}

// ============================================================================
// Helpers de tiempo / labels (duplicados intencionalmente acá: la lógica del
// mapa corre por fuera del side-panel y queremos evitar imports cruzados que
// arrastren `"use client"` y demás)
// ============================================================================

function elapsedMinutesSince(iso: string | null): number | null {
  if (!iso) return null
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 0) return null
  return Math.floor(ms / 60000)
}

function formatElapsed(min: number | null): string {
  if (min === null) return "—"
  if (min < 1) return "<1m"
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function bucketTone(
  min: number | null,
): "fresh" | "warm" | "hot" | "critical" {
  if (min === null) return "fresh"
  if (min < 3) return "fresh"
  if (min < 7) return "warm"
  if (min < 15) return "hot"
  return "critical"
}

function stateLabel(state: string | null): string {
  switch (state) {
    case "PENDING":
      return "Sin driver"
    case "ACCEPTED":
      return "Aceptado"
    case "WAITING_ORDER":
      return "En comercio"
    case "DELIVERY":
      return "En camino"
    case "OUTSIDE":
      return "Afuera"
    case "ASSIGNED":
    case "ASSIGNED_DELIVERY":
      return "Asignado"
    case "ASSIGNED_PICKUP":
      return "Pickup asign."
    case "FINALIZED":
      return "Entregado"
    case "CANCELLED":
      return "Cancelado"
    default:
      return state || "—"
  }
}

const STATE_BADGE_BG: Record<string, string> = {
  PENDING: "bg-warning-soft text-warning",
  ACCEPTED: "bg-violet-100 text-violet-900",
  WAITING_ORDER: "bg-sky-100 text-sky-900",
  DELIVERY: "bg-info-soft text-info",
  OUTSIDE: "bg-cyan-100 text-cyan-900",
  ASSIGNED: "bg-fuchsia-100 text-fuchsia-900",
  ASSIGNED_DELIVERY: "bg-fuchsia-100 text-fuchsia-900",
  ASSIGNED_PICKUP: "bg-fuchsia-100 text-fuchsia-900",
}

const TONE_CLASS: Record<ReturnType<typeof bucketTone>, string> = {
  fresh: "bg-success text-white",
  warm: "bg-warning text-white",
  hot: "bg-warning text-white",
  critical: "bg-destructive text-white",
}

// ============================================================================
// Iconos (divIcon)
// ============================================================================

const BIKE_SVG = `
  <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="18.5" cy="17.5" r="3.5"/>
    <circle cx="5.5" cy="17.5" r="3.5"/>
    <circle cx="15" cy="5" r="1"/>
    <path d="M12 17.5V14l-3-3 4-3 2 3h2"/>
  </svg>
`

function driverIcon(opts: {
  zoneColor: string
  hasActive: boolean
  available: boolean
  activeCount: number
  highlighted: boolean
  linkedToHighlight: boolean
}) {
  const {
    zoneColor,
    hasActive,
    available,
    activeCount,
    highlighted,
    linkedToHighlight,
  } = opts
  const baseSize = highlighted ? 20 : hasActive ? 18 : 16
  const opacity = !hasActive && !available ? 0.55 : 1
  const fill = !available && !hasActive ? "#9ca3af" : zoneColor

  let boxShadow = "0 1px 3px rgba(0,0,0,.4)"
  if (highlighted) {
    boxShadow = "0 0 0 2px rgba(0,0,0,0.85), 0 1px 3px rgba(0,0,0,.4)"
  } else if (linkedToHighlight) {
    boxShadow = "0 0 0 2px #fbbf24, 0 1px 3px rgba(0,0,0,.4)"
  } else if (!hasActive && available) {
    boxShadow = "0 0 0 1.5px #10b981, 0 1px 3px rgba(0,0,0,.4)"
  }

  const iconInnerSize = Math.round(baseSize * 0.62)

  const html = `
    <div style="position:relative;width:${baseSize}px;height:${baseSize}px;opacity:${opacity};">
      <div style="
        position:absolute;
        inset:0;
        border-radius:50%;
        background:${fill};
        border:1.5px solid #fff;
        box-shadow:${boxShadow};
        display:flex;
        align-items:center;
        justify-content:center;
      ">
        <div style="width:${iconInnerSize}px;height:${iconInnerSize}px;">
          ${BIKE_SVG.replace(/^\s*<svg/, `<svg width="${iconInnerSize}" height="${iconInnerSize}"`)}
        </div>
      </div>
      ${
        hasActive
          ? `<div style="
              position:absolute;
              top:-3px;
              right:-3px;
              min-width:12px;
              height:12px;
              padding:0 2px;
              border-radius:9999px;
              background:#1d4ed8;
              color:#fff;
              font-size:9px;
              font-weight:800;
              line-height:1;
              display:flex;
              align-items:center;
              justify-content:center;
              border:1.5px solid #fff;
              box-shadow:0 1px 2px rgba(0,0,0,.4);
            ">${activeCount}</div>`
          : ""
      }
    </div>
  `

  return L.divIcon({
    html,
    className: "live-map-driver",
    iconSize: [baseSize, baseSize],
    iconAnchor: [baseSize / 2, baseSize / 2],
    popupAnchor: [0, -baseSize / 2],
  })
}

function commercePinIcon(opts: {
  color: string
  count: number
  highlighted: boolean
}) {
  const { color, count, highlighted } = opts
  const w = highlighted ? 18 : 15
  const h = w + 2

  const html = `
    <div style="position:relative;width:${w}px;height:${h}px;">
      <svg width="${w}" height="${h}" viewBox="0 0 24 28" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0C5.4 0 0 5.4 0 12c0 8 12 16 12 16s12-8 12-16c0-6.6-5.4-12-12-12z" fill="${color}" stroke="#fff" stroke-width="2"/>
        <circle cx="12" cy="12" r="4" fill="#fff"/>
      </svg>
      ${
        count > 1
          ? `<div style="
              position:absolute;
              top:-2px;
              right:-2px;
              min-width:12px;
              height:12px;
              padding:0 2px;
              border-radius:9999px;
              background:#111827;
              color:#fff;
              font-size:9px;
              font-weight:800;
              line-height:1;
              display:flex;
              align-items:center;
              justify-content:center;
              border:1.5px solid #fff;
              box-shadow:0 1px 2px rgba(0,0,0,.4);
            ">${count > 99 ? "99+" : count}</div>`
          : ""
      }
    </div>
  `

  return L.divIcon({
    html,
    className: "live-map-commerce",
    iconSize: [w, h],
    iconAnchor: [w / 2, h - 2],
    popupAnchor: [0, -h],
  })
}

function squareIcon(color: string, label: string, size = 24) {
  const html = `
    <div style="
      background:${color};
      color:#fff;
      width:${size}px;
      height:${size}px;
      border-radius:4px;
      border:2px solid #fff;
      display:flex;
      align-items:center;
      justify-content:center;
      font-weight:700;
      font-size:11px;
      box-shadow:0 1px 4px rgba(0,0,0,.4);
    ">${label}</div>
  `
  return L.divIcon({
    html,
    className: "live-map-square",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  })
}

const ROUTE_ORIGIN_ICON = squareIcon("#10b981", "C")
const ROUTE_DESTINATION_ICON = squareIcon("#ef4444", "D")

function commercePinColor(
  requests: LiveRequest[],
  delayedSet: Set<string>,
): string {
  let hasDelayed = false
  let hasNoDriver = false
  let hasPreDelivery = false
  for (const r of requests) {
    if (r.isDelayed || delayedSet.has(r.requestId)) hasDelayed = true
    if (r.state === "PENDING") hasNoDriver = true
    if (isPreDelivery(r.state)) hasPreDelivery = true
  }
  if (hasDelayed) return "#ef4444"
  if (hasNoDriver) return "#f59e0b"
  if (hasPreDelivery) return "#3b82f6"
  return "#9ca3af"
}

// ============================================================================
// HighlightFocus: centra el mapa cuando cambia el highlight
// ============================================================================

function HighlightFocus({
  highlight,
  zones,
  drivers,
  pending,
  delayed,
  active,
  activeRoute,
  breadcrumb,
}: Props) {
  const map = useMap()
  useEffect(() => {
    if (!highlight) return
    if (highlight.kind === "zone") {
      const z = zones.find((x) => x.zoneId === highlight.id)
      if (z?.polygon && z.polygon.length > 0) {
        map.fitBounds(z.polygon as L.LatLngBoundsLiteral, { padding: [40, 40] })
      }
    } else if (highlight.kind === "driver") {
      const d = drivers.find((x) => x.driverId === highlight.id)
      if (!d?.position) return
      // Encuadramos todo lo que tengamos: posición del driver + comercio +
      // cliente + history + rastro. El rastro se incluye aunque route-detail
      // haya fallado (es un caso común: ver cache-the-failure en el panel).
      const pts: [number, number][] = [[d.position.lat, d.position.lng]]
      if (activeRoute) {
        if (activeRoute.origin)
          pts.push([activeRoute.origin.lat, activeRoute.origin.lng])
        if (activeRoute.destination)
          pts.push([activeRoute.destination.lat, activeRoute.destination.lng])
        for (const h of activeRoute.history) pts.push([h.lat, h.lng])
      }
      if (breadcrumb && d.activeRequestIds.includes(breadcrumb.requestId))
        for (const p of breadcrumb.points) pts.push([p.lat, p.lng])
      if (pts.length >= 2) {
        map.fitBounds(pts as L.LatLngBoundsLiteral, { padding: [50, 50] })
        return
      }
      map.setView([d.position.lat, d.position.lng], 14)
    } else if (highlight.kind === "commerce") {
      // Encuadre del comercio: ajustamos al rectángulo origen + destinos de
      // todos sus pedidos vigentes para que se vean todos los hilos en curso.
      const branchId = Number(highlight.id)
      if (!Number.isFinite(branchId)) return
      const reqs = [
        ...pending.filter((r) => r.branchId === branchId),
        ...delayed.filter((r) => r.branchId === branchId),
        ...active.filter((r) => r.branchId === branchId),
      ]
      const pts: [number, number][] = []
      const seen = new Set<string>()
      for (const r of reqs) {
        if (r.origin) {
          const k = `o:${r.origin.lat},${r.origin.lng}`
          if (!seen.has(k)) {
            seen.add(k)
            pts.push([r.origin.lat, r.origin.lng])
          }
        }
        if (r.destination) {
          const k = `d:${r.destination.lat},${r.destination.lng}`
          if (!seen.has(k)) {
            seen.add(k)
            pts.push([r.destination.lat, r.destination.lng])
          }
        }
      }
      if (pts.length >= 2) {
        map.fitBounds(pts as L.LatLngBoundsLiteral, { padding: [50, 50] })
      } else if (pts.length === 1) {
        map.setView(pts[0], 15)
      }
    } else if (highlight.kind === "request") {
      // Encuadre con todo lo disponible para el pedido: ruta (si cargó) + rastro
      // (aunque route-detail haya fallado) + origen como fallback.
      const pts: [number, number][] = []
      if (activeRoute && activeRoute.requestId === highlight.id) {
        if (activeRoute.origin)
          pts.push([activeRoute.origin.lat, activeRoute.origin.lng])
        if (activeRoute.destination)
          pts.push([activeRoute.destination.lat, activeRoute.destination.lng])
        for (const h of activeRoute.history) pts.push([h.lat, h.lng])
      }
      if (breadcrumb?.requestId === highlight.id)
        for (const p of breadcrumb.points) pts.push([p.lat, p.lng])
      if (pts.length >= 2) {
        map.fitBounds(pts as L.LatLngBoundsLiteral, { padding: [50, 50] })
        return
      }
      const r =
        pending.find((x) => x.requestId === highlight.id) ||
        delayed.find((x) => x.requestId === highlight.id) ||
        active.find((x) => x.requestId === highlight.id)
      if (r?.origin) map.setView([r.origin.lat, r.origin.lng], 15)
    }
  }, [highlight, zones, drivers, pending, delayed, active, activeRoute, breadcrumb, map])
  return null
}

// ============================================================================
// Main map
// ============================================================================

export default function LiveMapInternal(props: Props) {
  const {
    zones,
    drivers,
    pending,
    delayed,
    active,
    highlight,
    onHighlight,
    activeRoute,
    breadcrumb,
  } = props

  // Polilínea del recorrido real del driver (rastro fino minuto a minuto).
  const breadcrumbLine = useMemo<[number, number][] | null>(() => {
    if (!breadcrumb || breadcrumb.points.length < 2) return null
    return breadcrumb.points.map((p) => [p.lat, p.lng])
  }, [breadcrumb])

  const mapRef = useRef<L.Map | null>(null)

  // Mergeamos pending+delayed+active en una colección única (active gana sobre
  // delayed que gana sobre pending, así nos quedamos con el record más rico).
  const allRequests = useMemo(() => {
    const m = new Map<string, LiveRequest>()
    for (const r of pending) m.set(r.requestId, r)
    for (const r of delayed) m.set(r.requestId, r)
    for (const r of active) m.set(r.requestId, r)
    return [...m.values()]
  }, [pending, delayed, active])

  const delayedSet = useMemo(
    () => new Set(delayed.map((r) => r.requestId)),
    [delayed],
  )

  const ordersByDriver = useMemo(() => {
    const m = new Map<string, LiveRequest[]>()
    for (const r of allRequests) {
      if (!r.driverId) continue
      if (!m.has(r.driverId)) m.set(r.driverId, [])
      m.get(r.driverId)!.push(r)
    }
    return m
  }, [allRequests])

  // Agrupamos por comercio (branchId, fallback a coords con 5 decimales).
  const commerceGroups = useMemo<CommerceGroup[]>(() => {
    const map = new Map<string, CommerceGroup>()
    for (const r of allRequests) {
      if (!r.origin) continue
      const key =
        r.branchId != null
          ? `b:${r.branchId}`
          : `c:${r.origin.lat.toFixed(5)},${r.origin.lng.toFixed(5)}`
      const existing = map.get(key)
      if (existing) {
        existing.requests.push(r)
      } else {
        map.set(key, {
          key,
          origin: r.origin,
          branchId: r.branchId,
          requests: [r],
        })
      }
    }
    return [...map.values()]
  }, [allRequests])

  const driverIcons = useMemo(() => {
    const m = new Map<string, L.DivIcon>()
    for (const d of drivers) {
      const isHighlighted =
        highlight?.kind === "driver" && highlight.id === d.driverId
      const linkedToHighlight =
        highlight?.kind === "request" &&
        d.activeRequestIds.includes(highlight.id)
      m.set(
        d.driverId,
        driverIcon({
          zoneColor: d.zoneColor || "#9ca3af",
          hasActive: d.hasActive,
          available: d.available,
          activeCount: d.activeRequestIds.length,
          highlighted: isHighlighted,
          linkedToHighlight,
        }),
      )
    }
    return m
  }, [drivers, highlight])

  const commerceIcons = useMemo(() => {
    const m = new Map<string, L.DivIcon>()
    for (const g of commerceGroups) {
      const linkedToHighlight =
        highlight?.kind === "request" &&
        g.requests.some((r) => r.requestId === highlight.id)
      m.set(
        g.key,
        commercePinIcon({
          color: commercePinColor(g.requests, delayedSet),
          count: g.requests.length,
          highlighted: linkedToHighlight,
        }),
      )
    }
    return m
  }, [commerceGroups, delayedSet, highlight])

  // La API no devuelve polyline encoded; sólo `histories` que son cambios de
  // estado (acepta/llega/etc) en distintas posiciones — al unirlos da un
  // zigzag sin sentido. Nos quedamos con la línea limpia comercio → cliente
  // (dashed para indicar "trayecto del pedido", no "ruta por calle").
  const routePolyline = useMemo<[number, number][] | null>(() => {
    if (!activeRoute || !activeRoute.origin || !activeRoute.destination)
      return null
    return [
      [activeRoute.origin.lat, activeRoute.origin.lng],
      [activeRoute.destination.lat, activeRoute.destination.lng],
    ]
  }, [activeRoute])

  return (
    <MapContainer
      center={[LIVE_PANEL_CONFIG.mapCenter.lat, LIVE_PANEL_CONFIG.mapCenter.lng]}
      zoom={LIVE_PANEL_CONFIG.mapZoom}
      style={{ height: 520, width: "100%" }}
      ref={(m) => {
        mapRef.current = m as L.Map | null
      }}
      preferCanvas
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Polígonos de zonas */}
      {zones.map((z) => {
        if (!z.polygon || z.polygon.length === 0) return null
        const isHighlighted =
          highlight?.kind === "zone" && highlight.id === z.zoneId
        return (
          <Polygon
            key={z.zoneId}
            positions={z.polygon}
            pathOptions={{
              color: z.zoneColor || "#888",
              weight: isHighlighted ? 3 : 1.5,
              opacity: isHighlighted ? 1 : 0.7,
              fillColor: ZONE_FILL[z.warningKpi],
              fillOpacity: isHighlighted
                ? ZONE_OPACITY[z.warningKpi] + 0.1
                : ZONE_OPACITY[z.warningKpi],
            }}
            eventHandlers={{
              click: () =>
                onHighlight(
                  isHighlighted ? null : { kind: "zone", id: z.zoneId },
                ),
            }}
          >
            <Popup maxWidth={280} minWidth={220}>
              <ZonePopup zone={z} />
            </Popup>
          </Polygon>
        )
      })}

      {/* Drivers (moto coloreada por zona + indicador de pedido vigente) */}
      {drivers.map((d) => {
        if (!d.position) return null
        const icon = driverIcons.get(d.driverId)
        if (!icon) return null
        const isHighlighted =
          highlight?.kind === "driver" && highlight.id === d.driverId
        return (
          <Marker
            key={d.driverId}
            position={[d.position.lat, d.position.lng]}
            icon={icon}
            eventHandlers={{
              click: () =>
                onHighlight(
                  isHighlighted ? null : { kind: "driver", id: d.driverId },
                ),
            }}
          >
            <Popup maxWidth={240} minWidth={200}>
              <DriverPopup
                driver={d}
                orders={ordersByDriver.get(d.driverId) ?? []}
                delayedSet={delayedSet}
                onSelect={(rid) =>
                  onHighlight({ kind: "request", id: rid })
                }
              />
            </Popup>
          </Marker>
        )
      })}

      {/* Comercios agrupados (un pin por comercio con todas las órdenes vigentes) */}
      {commerceGroups.map((g) => {
        const icon = commerceIcons.get(g.key)
        if (!icon) return null
        return (
          <Marker
            key={g.key}
            position={[g.origin.lat, g.origin.lng]}
            icon={icon}
          >
            <Popup maxWidth={320} minWidth={260}>
              <CommercePopup
                group={g}
                delayedSet={delayedSet}
                onSelect={(rid) =>
                  onHighlight({ kind: "request", id: rid })
                }
              />
            </Popup>
          </Marker>
        )
      })}

      {/* Recorrido real del driver (rastro fino minuto a minuto). Va debajo de
          la ruta y los end-points para no taparlos. */}
      {breadcrumbLine && (
        <Polyline
          positions={breadcrumbLine}
          pathOptions={{
            color: "#6366f1",
            weight: 3,
            opacity: 0.85,
          }}
        />
      )}
      {breadcrumb?.points.map((p, i) => {
        const isLast = i === breadcrumb.points.length - 1
        return (
          <CircleMarker
            key={`${p.at}-${i}`}
            center={[p.lat, p.lng]}
            radius={isLast ? 5 : 3}
            pathOptions={{
              color: "#ffffff",
              weight: 1.5,
              fillColor: isLast ? "#4338ca" : "#6366f1",
              fillOpacity: 1,
            }}
          >
            <Tooltip>
              <div className="text-xs">
                <div className="font-semibold text-info">
                  {new Date(p.at).toLocaleTimeString("es-AR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {isLast ? " · última" : ""}
                </div>
                <div>{stateLabel(p.state)}</div>
              </div>
            </Tooltip>
          </CircleMarker>
        )
      })}

      {/* Ruta del pedido seleccionado */}
      {routePolyline && (
        <Polyline
          positions={routePolyline}
          pathOptions={{
            color: "#3b82f6",
            weight: 3,
            opacity: 0.75,
            dashArray: "6 6",
          }}
        />
      )}
      {activeRoute?.origin && (
        <Marker
          position={[activeRoute.origin.lat, activeRoute.origin.lng]}
          icon={ROUTE_ORIGIN_ICON}
        >
          <Tooltip>
            <div className="text-xs">
              <div className="font-semibold text-success">Comercio</div>
              <div>{activeRoute.origin.name}</div>
            </div>
          </Tooltip>
        </Marker>
      )}
      {activeRoute?.destination && (
        <Marker
          position={[activeRoute.destination.lat, activeRoute.destination.lng]}
          icon={ROUTE_DESTINATION_ICON}
        >
          <Tooltip>
            <div className="text-xs">
              <div className="font-semibold text-destructive">Destino</div>
              <div>{activeRoute.destination.name}</div>
            </div>
          </Tooltip>
        </Marker>
      )}

      <HighlightFocus {...props} />
    </MapContainer>
  )
}

// ============================================================================
// Popup de comercio: lista todas las órdenes vigentes con foco en pre-delivery
// ============================================================================

function CommercePopup({
  group,
  delayedSet,
  onSelect,
}: {
  group: CommerceGroup
  delayedSet: Set<string>
  onSelect: (requestId: string) => void
}) {
  const sorted = useMemo(() => {
    return [...group.requests].sort((a, b) => {
      const bucket = (r: LiveRequest) => {
        if (r.isDelayed || delayedSet.has(r.requestId)) return 0
        if (r.state === "PENDING") return 1
        if (isPreDelivery(r.state)) return 2
        return 3
      }
      const ab = bucket(a)
      const bb = bucket(b)
      if (ab !== bb) return ab - bb
      const at = a.currentStateSince
        ? new Date(a.currentStateSince).getTime()
        : Number.POSITIVE_INFINITY
      const bt = b.currentStateSince
        ? new Date(b.currentStateSince).getTime()
        : Number.POSITIVE_INFINITY
      return at - bt
    })
  }, [group.requests, delayedSet])

  const totalCount = group.requests.length
  const preDeliveryCount = group.requests.filter((r) =>
    isPreDelivery(r.state),
  ).length
  const inDeliveryCount = totalCount - preDeliveryCount

  return (
    <div className="space-y-2" style={{ minWidth: 260, maxWidth: 320 }}>
      <div>
        <div className="text-[13px] font-semibold leading-tight">
          {group.origin.name}
        </div>
        {group.origin.address && (
          <div className="mt-0.5 line-clamp-2 text-[10px] leading-tight text-muted-foreground">
            {group.origin.address}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1">
        {preDeliveryCount > 0 && (
          <span className="rounded bg-warning-soft px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-warning">
            {preDeliveryCount} en comercio
          </span>
        )}
        {inDeliveryCount > 0 && (
          <span className="rounded bg-info-soft px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-info">
            {inDeliveryCount} en camino
          </span>
        )}
      </div>

      <div className="max-h-[260px] space-y-1 overflow-y-auto pr-0.5">
        {sorted.map((r) => (
          <CommerceOrderRow
            key={r.requestId}
            r={r}
            isDelayed={r.isDelayed || delayedSet.has(r.requestId)}
            onClick={() => onSelect(r.requestId)}
          />
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// Popup de zona: card con KPIs (sólo se muestra al click, no al hover)
// ============================================================================

function ZonePopup({ zone }: { zone: LiveZone }) {
  const total = zone.totalDrivers || 0
  const available = zone.availableDrivers || 0
  const pct = total > 0 ? Math.round((available / total) * 100) : 0

  const statusText =
    zone.warningKpi === "red"
      ? "Crítico"
      : zone.warningKpi === "yellow"
        ? "Atención"
        : "OK"
  const statusToneClass =
    zone.warningKpi === "red"
      ? "text-destructive"
      : zone.warningKpi === "yellow"
        ? "text-warning"
        : "text-success"
  const statusDotClass =
    zone.warningKpi === "red"
      ? "bg-destructive"
      : zone.warningKpi === "yellow"
        ? "bg-warning"
        : "bg-success"

  const barFillClass =
    zone.warningDriversConnections === "red"
      ? "bg-destructive"
      : zone.warningDriversConnections === "yellow"
        ? "bg-warning"
        : "bg-success"

  return (
    <div style={{ minWidth: 220, maxWidth: 280 }}>
      <div
        className="-mx-3 -mt-3 mb-2 h-1 rounded-t"
        style={{ backgroundColor: zone.zoneColor }}
      />
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-[13px] font-semibold leading-tight">
          {zone.zoneName}
        </h3>
        <span
          className={`inline-flex shrink-0 items-center gap-1 text-[10px] font-medium ${statusToneClass}`}
        >
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${statusDotClass}`}
          />
          {statusText}
        </span>
      </div>

      <div className="mb-2">
        <div className="mb-1 flex items-baseline justify-between gap-1">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Drivers disponibles
          </span>
          <span className="font-mono text-[12px] font-bold leading-none tabular-nums text-foreground">
            {available}/{total}
          </span>
        </div>
        <div className="relative h-2 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full ${barFillClass}`}
            style={{ width: total === 0 ? "0%" : `${pct}%` }}
          />
        </div>
        <div className="mt-0.5 text-right text-[9px] tabular-nums text-muted-foreground">
          {total === 0 ? "sin drivers" : `${pct}% libres`}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1 border-t pt-2">
        <ZoneStat
          label="S/D"
          value={zone.orderWithoutDriver}
          tone={zone.orderWithoutDriver > 0 ? "warning" : "neutral"}
        />
        <ZoneStat
          label="DEM"
          value={zone.requestsDelayed}
          tone={zone.requestsDelayed > 0 ? "danger" : "neutral"}
        />
        <ZoneStat label="CRS" value={zone.activeRequests} tone="neutral" />
      </div>
    </div>
  )
}

function ZoneStat({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: "neutral" | "warning" | "danger"
}) {
  const valueClass =
    tone === "danger"
      ? "text-destructive"
      : tone === "warning"
        ? "text-warning"
        : "text-foreground"
  return (
    <div className="flex flex-col items-center justify-center text-center">
      <span
        className={`text-base font-bold leading-none tabular-nums ${valueClass}`}
      >
        {value}
      </span>
      <span className="mt-0.5 text-[9px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
    </div>
  )
}

// ============================================================================
// Popup de driver: lista los pedidos que está llevando (similar al de comercio)
// ============================================================================

function DriverPopup({
  driver,
  orders,
  delayedSet,
  onSelect,
}: {
  driver: LiveDriver
  orders: LiveRequest[]
  delayedSet: Set<string>
  onSelect: (requestId: string) => void
}) {
  const sorted = useMemo(() => {
    return [...orders].sort((a, b) => {
      const at = a.currentStateSince
        ? new Date(a.currentStateSince).getTime()
        : Number.POSITIVE_INFINITY
      const bt = b.currentStateSince
        ? new Date(b.currentStateSince).getTime()
        : Number.POSITIVE_INFINITY
      return at - bt
    })
  }, [orders])

  const statusLabel = driver.hasActive
    ? `Con ${driver.activeRequestIds.length} pedido${driver.activeRequestIds.length === 1 ? "" : "s"}`
    : driver.available
      ? "Libre"
      : "No disponible"
  const statusToneClass = driver.hasActive
    ? "text-info"
    : driver.available
      ? "text-success"
      : "text-muted-foreground"

  return (
    <div className="space-y-1.5" style={{ minWidth: 200, maxWidth: 240 }}>
      <div className="flex items-start gap-1.5">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12px] font-semibold leading-tight">
            {driver.fullName}
          </div>
          <div
            className={`flex flex-wrap items-center gap-x-1.5 gap-y-0 text-[10px] leading-tight ${statusToneClass}`}
          >
            <span>{statusLabel}</span>
            {driver.zoneName && (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <span>·</span>
                {driver.zoneColor && (
                  <span
                    className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: driver.zoneColor }}
                  />
                )}
                <span className="truncate">{driver.zoneName}</span>
              </span>
            )}
          </div>
        </div>
        {driver.phone && (
          <a
            href={`https://wa.me/${driver.phone.replace(/\D/g, "")}`}
            target="_blank"
            rel="noreferrer"
            title="WhatsApp"
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border bg-success-soft text-success hover:bg-success-soft"
          >
            <Phone className="h-3 w-3" />
          </a>
        )}
      </div>

      {sorted.length > 0 ? (
        <div className="max-h-[240px] space-y-1 overflow-y-auto border-t pt-1.5 pr-0.5">
          {sorted.map((r) => (
            <CommerceOrderRow
              key={r.requestId}
              r={r}
              isDelayed={r.isDelayed || delayedSet.has(r.requestId)}
              onClick={() => onSelect(r.requestId)}
              dimPost={false}
            />
          ))}
        </div>
      ) : null}

      {driver.pendingRequestIds.length > 0 && (
        <div className="rounded bg-warning-soft px-1.5 py-0.5 text-[9px] font-medium text-warning">
          +{driver.pendingRequestIds.length} oferta
          {driver.pendingRequestIds.length === 1 ? "" : "s"} sin aceptar
        </div>
      )}
    </div>
  )
}

function CommerceOrderRow({
  r,
  isDelayed,
  onClick,
  dimPost = true,
}: {
  r: LiveRequest
  isDelayed: boolean
  onClick: () => void
  dimPost?: boolean
}) {
  const stateMin = elapsedMinutesSince(r.currentStateSince || r.createdAt)
  const tone = bucketTone(stateMin)
  const isPre = isPreDelivery(r.state)

  const stateBadge = r.state
    ? STATE_BADGE_BG[r.state] ?? "bg-muted text-foreground/70"
    : "bg-muted text-foreground/70"
  const toneBadge = TONE_CLASS[tone]

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-1.5 rounded border bg-card px-2 py-1.5 text-left transition hover:bg-muted/40 ${
        dimPost && !isPre ? "opacity-60" : ""
      } ${isDelayed ? "border-l-2 border-l-destructive" : ""}`}
    >
      <span className="shrink-0 font-mono text-[11px] font-bold tabular-nums">
        #{r.externalOrderId || "?"}
      </span>
      <span
        className={`shrink-0 rounded px-1 py-px text-[9px] font-semibold uppercase tracking-wide ${stateBadge}`}
      >
        {stateLabel(r.state)}
      </span>
      {isDelayed && (
        <Timer className="h-3 w-3 shrink-0 text-destructive" />
      )}
      <span
        className={`ml-auto inline-flex shrink-0 items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${toneBadge}`}
      >
        {formatElapsed(stateMin)}
      </span>
    </button>
  )
}
