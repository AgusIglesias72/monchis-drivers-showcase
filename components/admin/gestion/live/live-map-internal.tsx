"use client"

import "leaflet/dist/leaflet.css"

import { useEffect, useMemo, useRef } from "react"
import L from "leaflet"
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
  highlight: { kind: "request" | "driver" | "zone"; id: string } | null
  onHighlight: (
    h: { kind: "request" | "driver" | "zone"; id: string } | null,
  ) => void
  activeRoute: LiveRoute | null
  routeLoading: boolean
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

function pinIcon(color: string, size = 28) {
  const html = `
    <svg width="${size}" height="${size + 4}" viewBox="0 0 24 28" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0C5.4 0 0 5.4 0 12c0 8 12 16 12 16s12-8 12-16c0-6.6-5.4-12-12-12z" fill="${color}" stroke="#fff" stroke-width="1.5"/>
      <circle cx="12" cy="12" r="4" fill="#fff"/>
    </svg>
  `
  return L.divIcon({
    html,
    className: "live-map-pin",
    iconSize: [size, size + 4],
    iconAnchor: [size / 2, size + 2],
    popupAnchor: [0, -size],
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

const PENDING_ICON = pinIcon("#f59e0b")
const DELAYED_ICON = pinIcon("#ef4444", 32)
const ROUTE_ORIGIN_ICON = squareIcon("#10b981", "C") // Comercio
const ROUTE_DESTINATION_ICON = squareIcon("#ef4444", "D") // Destino

// Centra el mapa cuando cambia el highlight a algo con coords.
function HighlightFocus({
  highlight,
  zones,
  drivers,
  pending,
  delayed,
  active,
  activeRoute,
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
      if (d?.position) map.setView([d.position.lat, d.position.lng], 14)
    } else if (highlight.kind === "request") {
      // Si tenemos la ruta cargada, hacemos fitBounds con toda la traza.
      if (activeRoute && activeRoute.requestId === highlight.id) {
        const pts: [number, number][] = []
        if (activeRoute.origin)
          pts.push([activeRoute.origin.lat, activeRoute.origin.lng])
        if (activeRoute.destination)
          pts.push([activeRoute.destination.lat, activeRoute.destination.lng])
        for (const h of activeRoute.history) pts.push([h.lat, h.lng])
        if (pts.length >= 2) {
          map.fitBounds(pts as L.LatLngBoundsLiteral, { padding: [50, 50] })
          return
        }
      }
      // Fallback: centrar en origen del pedido en el snapshot.
      const r =
        pending.find((x) => x.requestId === highlight.id) ||
        delayed.find((x) => x.requestId === highlight.id) ||
        active.find((x) => x.requestId === highlight.id)
      if (r?.origin) map.setView([r.origin.lat, r.origin.lng], 15)
    }
  }, [highlight, zones, drivers, pending, delayed, active, activeRoute, map])
  return null
}

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
  } = props

  // El mapa arranca centrado en Asunción (config.mapCenter/mapZoom). No
  // auto-fit a polígonos: la API mezcla zonas de Encarnación/Loma Pyta y el
  // fitBounds zoomea afuera. Quien quiera ver todo, usa el botón de zoom.
  const mapRef = useRef<L.Map | null>(null)

  // Polyline de la ruta del pedido seleccionado.
  const routePolyline = useMemo<[number, number][] | null>(() => {
    if (!activeRoute) return null
    const pts: [number, number][] = []
    // Si hay history, ese ES el recorrido del driver en orden cronológico.
    // Si no, hacemos un fallback simple origen → destino.
    if (activeRoute.history.length > 0) {
      for (const h of activeRoute.history) pts.push([h.lat, h.lng])
    } else if (activeRoute.origin && activeRoute.destination) {
      pts.push([activeRoute.origin.lat, activeRoute.origin.lng])
      pts.push([activeRoute.destination.lat, activeRoute.destination.lng])
    }
    return pts.length >= 2 ? pts : null
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
            <Tooltip sticky>
              <div className="text-xs">
                <div className="font-semibold">{z.zoneName}</div>
                <div>
                  {z.availableDrivers}/{z.totalDrivers} drivers libres
                </div>
                <div>{z.activeRequests} activos</div>
                {z.requestsDelayed > 0 && (
                  <div className="font-semibold text-red-600">
                    {z.requestsDelayed} demorados
                  </div>
                )}
                {z.orderWithoutDriver > 0 && (
                  <div className="text-amber-700">
                    {z.orderWithoutDriver} sin driver
                  </div>
                )}
              </div>
            </Tooltip>
          </Polygon>
        )
      })}

      {/* Drivers */}
      {drivers.map((d) => {
        if (!d.position) return null
        const fill = d.hasActive
          ? "#3b82f6"
          : d.available
            ? "#10b981"
            : "#9ca3af"
        const isHighlighted =
          highlight?.kind === "driver" && highlight.id === d.driverId
        // Si el driver tiene un active_request que está siendo highlighted,
        // resaltamos también al driver para conectar visualmente.
        const isLinkedToHighlight =
          highlight?.kind === "request" &&
          d.activeRequestIds.includes(highlight.id)
        return (
          <CircleMarker
            key={d.driverId}
            center={[d.position.lat, d.position.lng]}
            radius={isHighlighted || isLinkedToHighlight ? 9 : 6}
            pathOptions={{
              color: isLinkedToHighlight ? "#1e40af" : "#fff",
              weight: 2,
              fillColor: fill,
              fillOpacity: 0.95,
            }}
            eventHandlers={{
              click: () =>
                onHighlight(
                  isHighlighted ? null : { kind: "driver", id: d.driverId },
                ),
            }}
          >
            <Tooltip>
              <div className="text-xs">
                <div className="font-semibold">{d.fullName}</div>
                <div>
                  {d.hasActive
                    ? `Con ${d.activeRequestIds.length} pedido(s)`
                    : d.available
                      ? "Libre"
                      : "No disponible"}
                </div>
                {d.zoneName && (
                  <div className="text-muted-foreground">{d.zoneName}</div>
                )}
              </div>
            </Tooltip>
          </CircleMarker>
        )
      })}

      {/* Pedidos pendientes (sin driver) */}
      {pending.map((r) => {
        if (!r.origin) return null
        const isHighlighted =
          highlight?.kind === "request" && highlight.id === r.requestId
        return (
          <Marker
            key={`p-${r.requestId}`}
            position={[r.origin.lat, r.origin.lng]}
            icon={PENDING_ICON}
            eventHandlers={{
              click: () =>
                onHighlight(
                  isHighlighted
                    ? null
                    : { kind: "request", id: r.requestId },
                ),
            }}
          >
            <Popup>
              <RequestPopup r={r} kind="pending" />
            </Popup>
          </Marker>
        )
      })}

      {/* Pedidos demorados */}
      {delayed.map((r) => {
        if (!r.origin) return null
        const isHighlighted =
          highlight?.kind === "request" && highlight.id === r.requestId
        return (
          <Marker
            key={`d-${r.requestId}`}
            position={[r.origin.lat, r.origin.lng]}
            icon={DELAYED_ICON}
            eventHandlers={{
              click: () =>
                onHighlight(
                  isHighlighted
                    ? null
                    : { kind: "request", id: r.requestId },
                ),
            }}
          >
            <Popup>
              <RequestPopup r={r} kind="delayed" />
            </Popup>
          </Marker>
        )
      })}

      {/* Ruta del pedido seleccionado */}
      {routePolyline && (
        <Polyline
          positions={routePolyline}
          pathOptions={{
            color: "#3b82f6",
            weight: 4,
            opacity: 0.85,
            dashArray: activeRoute?.history.length === 0 ? "6 6" : undefined,
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
              <div className="font-semibold text-emerald-700">Comercio</div>
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
              <div className="font-semibold text-red-700">Destino</div>
              <div>{activeRoute.destination.name}</div>
            </div>
          </Tooltip>
        </Marker>
      )}

      <HighlightFocus {...props} />
    </MapContainer>
  )
}

function RequestPopup({
  r,
  kind,
}: {
  r: LiveRequest
  kind: "pending" | "delayed"
}) {
  return (
    <div className="text-xs space-y-1 min-w-[220px]">
      <div className="flex items-center gap-2">
        <span
          className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
            kind === "delayed"
              ? "bg-red-100 text-red-800"
              : "bg-amber-100 text-amber-900"
          }`}
        >
          {kind === "delayed" ? "Demorado" : "Sin driver"}
        </span>
        <span className="font-mono">#{r.externalOrderId || "?"}</span>
        {r.timeStatus !== null && (
          <span className="ml-auto font-semibold tabular-nums">
            {r.timeStatus} min
          </span>
        )}
      </div>
      <div className="font-medium">{r.origin?.name}</div>
      {r.destination?.address && (
        <div className="text-muted-foreground">→ {r.destination.address}</div>
      )}
      <a
        href={`/admin/gestion/pedidos/${r.requestId}`}
        target="_blank"
        rel="noreferrer"
        className="block pt-1 text-[11px] font-semibold text-blue-600 hover:underline"
      >
        Ver detalle →
      </a>
    </div>
  )
}
