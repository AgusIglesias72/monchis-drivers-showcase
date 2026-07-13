"use client"

import "leaflet/dist/leaflet.css"

import { useEffect, useMemo, useRef } from "react"
import L from "leaflet"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Clock, MapPin, ShieldCheck, User } from "lucide-react"
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet"

import {
  styleForState,
  type StateStyle,
} from "@/lib/services/pedidos-states"
import type { MapPoint } from "@/lib/types/pedidos.types"
import { parseOrderInstant } from "@/lib/utils/pedidos-time"

interface Props {
  points: MapPoint[]
  focusedHistoryIdx?: number | null
  onMarkerClick?: (historyIdx: number) => void
}

const ORIGIN_HEX = "#10b981"
const DESTINATION_HEX = "#ef4444"
const ADMIN_HEX = "#c026d3"

// SVG inner content (paths/circles/etc) extraído de lucide-react.
// Render con `viewBox="0 0 24 24"`, stroke white, fill none, strokeWidth 2.
const ICON_SVG: Record<string, string> = {
  store: `<path d="M15 21v-5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5"/><path d="M17.774 10.31a1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.451 0 1.12 1.12 0 0 0-1.548 0 2.5 2.5 0 0 1-3.452 0 1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.77-3.248l2.889-4.184A2 2 0 0 1 7 2h10a2 2 0 0 1 1.653.873l2.895 4.192a2.5 2.5 0 0 1-3.774 3.244"/><path d="M4 10.95V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8.05"/>`,
  user: `<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>`,
  bell: `<path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/>`,
  handshake: `<path d="m11 17 2 2a1 1 0 1 0 3-3"/><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4"/><path d="m21 3 1 11h-2"/><path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3"/><path d="M3 4h8"/>`,
  "chef-hat": `<path d="M17 21a1 1 0 0 0 1-1v-5.35c0-.457.316-.844.727-1.041a4 4 0 0 0-2.134-7.589 5 5 0 0 0-9.186 0 4 4 0 0 0-2.134 7.588c.411.198.727.585.727 1.041V20a1 1 0 0 0 1 1Z"/><path d="M6 17h12"/>`,
  bike: `<circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/>`,
  navigation: `<polygon points="3 11 22 2 13 21 11 13 3 11"/>`,
  check: `<path d="M21.801 10A10 10 0 1 1 17 3.335"/><path d="m9 11 3 3L22 4"/>`,
  x: `<path d="M18 6 6 18"/><path d="m6 6 12 12"/>`,
  shield: `<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>`,
}

interface MarkerLook {
  iconKey: keyof typeof ICON_SVG
  bg: string
  badge?: string // pequeño número/símbolo arriba-derecha
}

const ICON_BY_STATE: Record<string, keyof typeof ICON_SVG> = {
  PENDING: "bell",
  ACCEPTED: "handshake",
  WAITING_ORDER: "chef-hat",
  DELIVERY: "bike",
  OUTSIDE: "navigation",
  FINALIZED: "check",
  CANCELLED: "x",
}

function lookFor(p: MapPoint, offerNumber?: number): MarkerLook {
  if (p.kind === "origin") return { iconKey: "store", bg: ORIGIN_HEX }
  if (p.kind === "destination") return { iconKey: "user", bg: DESTINATION_HEX }
  // history
  if (p.adminChangedState) return { iconKey: "shield", bg: ADMIN_HEX }
  const style = styleForState(p.state || "", p.hasDriver !== false)
  const iconKey = (p.state && ICON_BY_STATE[p.state]) || "store"
  return {
    iconKey,
    bg: style.hex,
    badge:
      p.state === "PENDING" && offerNumber ? String(offerNumber) : undefined,
  }
}

function styleForPoint(p: MapPoint): StateStyle | null {
  if (p.kind !== "history" || !p.state) return null
  return styleForState(p.state, p.hasDriver !== false)
}

// Genera un SVG circular de 30×30 con el icono al centro y opcional badge
// arriba-derecha. Devuelto como data URL para `L.icon`.
function buildIconUrl(look: MarkerLook): string {
  const icon = ICON_SVG[look.iconKey]
  // Círculo cx=15 cy=15 r=13. Icono lucide es 24×24 → scale 0.5 = 12px,
  // centrado en (9, 9).
  const badgeSvg = look.badge
    ? `<g>
         <circle cx="24" cy="6" r="6" fill="#0f172a" stroke="#fff" stroke-width="1.25"/>
         <text x="24" y="8.5" text-anchor="middle" font-family="-apple-system,system-ui,sans-serif" font-size="7.5" font-weight="700" fill="#fff">${look.badge}</text>
       </g>`
    : ""
  // Icono lucide es 24×24 con contenido centrado en (12,12). Aplicando scale(0.5)
  // primero y translate(9,9) después, el punto (12,12) queda en (15,15) del SVG,
  // que es el centro del círculo. (En SVG transform list los transforms se
  // aplican right-to-left a los puntos.)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30">
    <circle cx="15" cy="15" r="13" fill="${look.bg}" stroke="#fff" stroke-width="2"/>
    <g transform="translate(9 9) scale(0.5)" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${icon}</g>
    ${badgeSvg}
  </svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function iconFor(p: MapPoint, offerNumber?: number): L.Icon {
  return L.icon({
    iconUrl: buildIconUrl(lookFor(p, offerNumber)),
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
    tooltipAnchor: [0, -16],
  })
}

// z-index prioridad para markers superpuestos. ACCEPTED es la marca clave
// del recorrido y debe verse por encima de las ofertas previas (PENDING)
// que típicamente están en la misma coordenada. Cambio admin gana siempre.
function zIndexFor(p: MapPoint): number {
  if (p.adminChangedState) return 1000
  if (p.kind === "origin" || p.kind === "destination") return 200
  switch (p.state) {
    case "FINALIZED":
    case "CANCELLED":
      return 700
    case "ACCEPTED":
      return 600
    case "OUTSIDE":
    case "DELIVERY":
    case "WAITING_ORDER":
      return 400
    case "PENDING":
      return 100
    default:
      return 300
  }
}

function diffStr(prev: string, curr: string): string | null {
  const a = parseOrderInstant(prev)?.getTime()
  const b = parseOrderInstant(curr)?.getTime()
  if (!a || !b || b <= a) return null
  const sec = Math.round((b - a) / 1000)
  if (sec < 60) return `+${sec}s`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  if (m < 60) return s > 0 ? `+${m}m ${s}s` : `+${m}m`
  const h = Math.floor(m / 60)
  return `+${h}h ${m % 60}m`
}

const DASHED = { weight: 3, dashArray: "6 6" }

// Fit a todos los puntos al cargar / cambiar set.
function FitToPoints({ points }: { points: MapPoint[] }) {
  const map = useMap()
  useEffect(() => {
    if (points.length === 0) return
    const bounds = L.latLngBounds(
      points.map((p) => [p.lat, p.lng] as [number, number]),
    )
    map.fitBounds(bounds, { padding: [64, 64], maxZoom: 16 })
  }, [points, map])
  return null
}

// Pan + zoom + popup cuando el timeline pide foco en un evento.
function FocusOnHistory({
  points,
  focusedHistoryIdx,
  markerRefs,
}: {
  points: MapPoint[]
  focusedHistoryIdx?: number | null
  markerRefs: React.RefObject<Map<number, L.Marker>>
}) {
  const map = useMap()
  useEffect(() => {
    if (focusedHistoryIdx == null) return
    const idx = points.findIndex(
      (p) => p.kind === "history" && p.index === focusedHistoryIdx + 1,
    )
    if (idx < 0) return
    const target = points[idx]
    const zoom = Math.max(map.getZoom() ?? 14, 16)
    map.setView([target.lat, target.lng], zoom, { animate: true })
    markerRefs.current?.get(idx)?.openPopup()
  }, [focusedHistoryIdx, points, map, markerRefs])
  return null
}

export default function PedidoMapInternal({
  points,
  focusedHistoryIdx,
  onMarkerClick,
}: Props) {
  const markerRefs = useRef(new Map<number, L.Marker>())

  // Numeración de ofertas: 1, 2, 3... contando solo PENDINGs en orden cronológico.
  const offerNumbers = useMemo(() => {
    const m = new Map<number, number>()
    let n = 0
    points.forEach((p, idx) => {
      if (p.kind === "history" && p.state === "PENDING") {
        n += 1
        m.set(idx, n)
      }
    })
    return m
  }, [points])

  const icons = useMemo(
    () => points.map((p, idx) => iconFor(p, offerNumbers.get(idx))),
    [points, offerNumbers],
  )

  // El driver acepta en el primer ACCEPTED del history. La línea va de ahí
  // al comercio (origen), y luego del comercio al cliente (destino).
  const acceptedPoint = useMemo(
    () =>
      points.find((p) => p.kind === "history" && p.state === "ACCEPTED") || null,
    [points],
  )
  const originPoint = useMemo(
    () => points.find((p) => p.kind === "origin") || null,
    [points],
  )
  const destinationPoint = useMemo(
    () => points.find((p) => p.kind === "destination") || null,
    [points],
  )

  const polylineAcceptToOrigin = useMemo<[number, number][] | null>(() => {
    if (!acceptedPoint || !originPoint) return null
    return [
      [acceptedPoint.lat, acceptedPoint.lng],
      [originPoint.lat, originPoint.lng],
    ]
  }, [acceptedPoint, originPoint])

  const polylineOriginToDestination = useMemo<[number, number][] | null>(() => {
    if (!originPoint || !destinationPoint) return null
    return [
      [originPoint.lat, originPoint.lng],
      [destinationPoint.lat, destinationPoint.lng],
    ]
  }, [originPoint, destinationPoint])

  if (points.length === 0) {
    return (
      <div className="flex h-[440px] items-center justify-center rounded-lg border bg-muted/20 text-sm text-muted-foreground">
        No hay coordenadas para mostrar.
      </div>
    )
  }

  return (
    <MapContainer
      center={[points[0].lat, points[0].lng]}
      zoom={14}
      style={{ height: 440, width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {polylineAcceptToOrigin && (
        <Polyline
          positions={polylineAcceptToOrigin}
          pathOptions={{ ...DASHED, color: "#3b82f6", opacity: 0.7 }}
        />
      )}
      {polylineOriginToDestination && (
        <Polyline
          positions={polylineOriginToDestination}
          pathOptions={{ ...DASHED, color: "#10b981", opacity: 0.6 }}
        />
      )}

      {points.map((p, idx) => (
        <Marker
          key={`${p.kind}-${idx}`}
          position={[p.lat, p.lng]}
          icon={icons[idx]}
          zIndexOffset={zIndexFor(p)}
          ref={(m) => {
            if (m) markerRefs.current.set(idx, m)
            else markerRefs.current.delete(idx)
          }}
          eventHandlers={{
            click: (e) => {
              ;(e.target as L.Marker).closeTooltip()
              if (p.kind === "history" && p.index !== undefined && onMarkerClick) {
                onMarkerClick(p.index - 1)
              }
            },
          }}
        >
          <Tooltip direction="top">
            <PointInfo point={p} offerNumber={offerNumbers.get(idx)} />
          </Tooltip>
          <Popup closeButton={false} maxWidth={320}>
            <PointInfo point={p} offerNumber={offerNumbers.get(idx)} />
          </Popup>
        </Marker>
      ))}

      <FitToPoints points={points} />
      <FocusOnHistory
        points={points}
        focusedHistoryIdx={focusedHistoryIdx}
        markerRefs={markerRefs}
      />
    </MapContainer>
  )
}

function PointInfo({
  point,
  offerNumber,
}: {
  point: MapPoint
  offerNumber?: number
}) {
  if (point.kind === "origin" || point.kind === "destination") {
    const isOrigin = point.kind === "origin"
    return (
      <div className="w-[200px] overflow-hidden rounded-md">
        <div
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-white"
          style={{ backgroundColor: isOrigin ? ORIGIN_HEX : DESTINATION_HEX }}
        >
          <MapPin className="h-3.5 w-3.5" />
          <span className="text-xs font-semibold">
            {isOrigin ? "Comercio" : "Cliente"}
          </span>
        </div>
        <div className="px-2.5 py-1.5 text-xs text-foreground font-medium leading-tight whitespace-normal">
          {point.label}
        </div>
      </div>
    )
  }

  const style = styleForPoint(point)
  const Icon = style?.icon
  const friendlyLabel = style?.label || point.state || "Evento"
  const headerBg = style?.hex || "#3b82f6"

  // PENDING: ultra-compacto. Solo header + último driver de la oferta.
  if (point.state === "PENDING" && !point.adminChangedState) {
    const lastDriver =
      point.driverNames && point.driverNames.length > 0
        ? point.driverNames[point.driverNames.length - 1]
        : null
    return (
      <div className="w-[220px] overflow-hidden rounded-md">
        <div
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-white"
          style={{ backgroundColor: headerBg }}
        >
          {Icon && <Icon className="h-3.5 w-3.5" />}
          <span className="text-xs font-semibold">
            Oferta {offerNumber ? `#${offerNumber}` : ""}
          </span>
        </div>
        <div className="px-2.5 py-1.5 text-xs text-muted-foreground leading-tight whitespace-normal">
          {lastDriver ? (
            <span className="inline-flex items-start gap-1.5">
              <User className="h-3 w-3 text-ink-subtle mt-0.5 shrink-0" />
              {lastDriver}
            </span>
          ) : (
            <span className="text-ink-subtle">Sin driver</span>
          )}
        </div>
      </div>
    )
  }

  // Otros estados: header + hora + delta + último driver (si hay).
  const parsedDate = parseOrderInstant(point.date || null)
  const delta = point.prevDate && point.date ? diffStr(point.prevDate, point.date) : null
  const lastDriver =
    point.driverNames && point.driverNames.length > 0
      ? point.driverNames[point.driverNames.length - 1]
      : null

  return (
    <div className="w-[230px] overflow-hidden rounded-md">
      <div
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-white"
        style={{ backgroundColor: headerBg }}
      >
        {Icon && <Icon className="h-3.5 w-3.5" />}
        <span className="text-xs font-semibold">{friendlyLabel}</span>
      </div>

      <div className="px-2.5 py-1.5 space-y-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3 w-3 text-ink-subtle" />
          <span className="font-medium tabular-nums">
            {parsedDate ? format(parsedDate, "HH:mm", { locale: es }) : "—"}
          </span>
          {delta && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
              {delta}
            </span>
          )}
        </div>

        {lastDriver && (
          <div className="flex items-start gap-1.5 whitespace-normal">
            <User className="h-3 w-3 text-ink-subtle mt-0.5 shrink-0" />
            <span className="leading-tight">{lastDriver}</span>
          </div>
        )}

        {point.adminChangedState && (
          <div className="mt-1 flex items-center gap-1.5 rounded-md bg-fuchsia-50 px-1.5 py-1 text-fuchsia-900">
            <ShieldCheck className="h-3 w-3 shrink-0" />
            <span className="text-[10px] font-semibold uppercase tracking-wide">
              Cambio admin: {point.adminChangedState}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
