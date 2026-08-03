"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  GoogleMap,
  InfoWindowF,
  MarkerF,
  PolylineF,
} from "@react-google-maps/api"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Clock, MapPin, ShieldCheck, User } from "lucide-react"

import {
  styleForState,
  type StateStyle,
} from "@/lib/services/pedidos-states"
import type { MapPoint } from "@/lib/types/pedidos.types"
import { parseOrderInstant } from "@/lib/utils/pedidos-time"

const containerStyle = { width: "100%", height: "440px" }

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: true,
  gestureHandling: "greedy",
  // Ocultar POIs (supermercados, shoppings, etc.) y transit para reducir ruido
  // visual. Dejamos roads/labels para identificar calles y barrios.
  styles: [
    { featureType: "poi", stylers: [{ visibility: "off" }] },
    { featureType: "transit", stylers: [{ visibility: "off" }] },
  ],
}

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
// arriba-derecha. Devuelto como data URL para `google.maps.Icon.url`.
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

function iconFor(p: MapPoint, offerNumber?: number): google.maps.Icon {
  return {
    url: buildIconUrl(lookFor(p, offerNumber)),
    scaledSize: new google.maps.Size(30, 30),
    anchor: new google.maps.Point(15, 15),
  }
}

// Si el marker está en el cuarto superior del viewport, abajo del marker queda
// más espacio; mostrar el InfoWindow debajo. Si no, encima (default).
// Asumimos altura del InfoWindow ~120px; cuando no hay bounds devolvemos arriba.
const INFO_ABOVE = new google.maps.Size(0, -16)
function pickInfoOffset(
  map: google.maps.Map | null,
  point: { lat: number; lng: number },
  _idx: number,
): google.maps.Size {
  if (!map) return INFO_ABOVE
  const bounds = map.getBounds()
  if (!bounds) return INFO_ABOVE
  const ne = bounds.getNorthEast()
  const sw = bounds.getSouthWest()
  const latRange = ne.lat() - sw.lat()
  if (latRange <= 0) return INFO_ABOVE
  // 0 = top of viewport, 1 = bottom
  const fromTop = (ne.lat() - point.lat) / latRange
  if (fromTop < 0.25) {
    // marker arriba → tooltip abajo
    return new google.maps.Size(0, 36)
  }
  return INFO_ABOVE
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

export default function PedidoMapInternal({
  points,
  focusedHistoryIdx,
  onMarkerClick,
}: Props) {
  const mapRef = useRef<google.maps.Map | null>(null)
  const [activeIdx, setActiveIdx] = useState<number | null>(null)
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

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

  const polylineAcceptToOrigin = useMemo(() => {
    if (!acceptedPoint || !originPoint) return null
    return [
      { lat: acceptedPoint.lat, lng: acceptedPoint.lng },
      { lat: originPoint.lat, lng: originPoint.lng },
    ]
  }, [acceptedPoint, originPoint])

  const polylineOriginToDestination = useMemo(() => {
    if (!originPoint || !destinationPoint) return null
    return [
      { lat: originPoint.lat, lng: originPoint.lng },
      { lat: destinationPoint.lat, lng: destinationPoint.lng },
    ]
  }, [originPoint, destinationPoint])

  // Fit a todos los puntos al cargar / cambiar set.
  useEffect(() => {
    if (!mapRef.current || points.length === 0) return
    const bounds = new google.maps.LatLngBounds()
    points.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }))
    mapRef.current.fitBounds(bounds, 64)
  }, [points])

  // Pan + zoom cuando el timeline pide foco en un evento.
  useEffect(() => {
    if (focusedHistoryIdx == null || !mapRef.current) return
    const target = points.find(
      (p) => p.kind === "history" && p.index === focusedHistoryIdx + 1,
    )
    if (!target) return
    const idx = points.indexOf(target)
    setActiveIdx(idx)
    mapRef.current.panTo({ lat: target.lat, lng: target.lng })
    if ((mapRef.current.getZoom() ?? 14) < 16) {
      mapRef.current.setZoom(16)
    }
  }, [focusedHistoryIdx, points])

  if (points.length === 0) {
    return (
      <div className="flex h-[440px] items-center justify-center rounded-lg border bg-muted/20 text-sm text-muted-foreground">
        No hay coordenadas para mostrar.
      </div>
    )
  }

  const center = { lat: points[0].lat, lng: points[0].lng }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={14}
      options={mapOptions}
      onLoad={(m) => {
        mapRef.current = m
      }}
    >
      {polylineAcceptToOrigin && (
        <PolylineF
          path={polylineAcceptToOrigin}
          options={{
            strokeColor: "#3b82f6",
            strokeOpacity: 0.7,
            strokeWeight: 3,
            geodesic: true,
            icons: [
              {
                icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 3 },
                offset: "0",
                repeat: "12px",
              },
            ],
          }}
        />
      )}
      {polylineOriginToDestination && (
        <PolylineF
          path={polylineOriginToDestination}
          options={{
            strokeColor: "#10b981",
            strokeOpacity: 0.6,
            strokeWeight: 3,
            geodesic: true,
            icons: [
              {
                icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 3 },
                offset: "0",
                repeat: "12px",
              },
            ],
          }}
        />
      )}

      {points.map((p, idx) => {
        const showInfo = activeIdx === idx || (activeIdx === null && hoveredIdx === idx)
        return (
          <MarkerF
            key={`${p.kind}-${idx}`}
            position={{ lat: p.lat, lng: p.lng }}
            icon={iconFor(p, offerNumbers.get(idx))}
            onClick={() => {
              setActiveIdx(idx)
              if (p.kind === "history" && p.index !== undefined && onMarkerClick) {
                onMarkerClick(p.index - 1)
              }
            }}
            onMouseOver={() => setHoveredIdx(idx)}
            onMouseOut={() => setHoveredIdx((prev) => (prev === idx ? null : prev))}
            zIndex={zIndexFor(p)}
          >
            {showInfo && (
              <InfoWindowF
                position={{ lat: p.lat, lng: p.lng }}
                onCloseClick={() => {
                  setActiveIdx(null)
                  setHoveredIdx(null)
                }}
                options={{
                  // Flip arriba/abajo según la posición del marker. Si el
                  // marker está cerca del top del viewport (cuarto superior),
                  // mostramos el tooltip debajo; si no, encima (default).
                  pixelOffset: pickInfoOffset(mapRef.current, p, idx),
                  disableAutoPan: activeIdx !== idx,
                }}
              >
                <PointInfo point={p} offerNumber={offerNumbers.get(idx)} />
              </InfoWindowF>
            )}
          </MarkerF>
        )
      })}
    </GoogleMap>
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
        <div className="px-2.5 py-1.5 text-xs text-gray-900 font-medium leading-tight">
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
        <div className="px-2.5 py-1.5 text-xs text-gray-700 leading-tight">
          {lastDriver ? (
            <span className="inline-flex items-start gap-1.5">
              <User className="h-3 w-3 text-gray-400 mt-0.5 shrink-0" />
              {lastDriver}
            </span>
          ) : (
            <span className="text-gray-400">Sin driver</span>
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

      <div className="px-2.5 py-1.5 space-y-1 text-xs text-gray-700">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3 w-3 text-gray-400" />
          <span className="font-medium tabular-nums">
            {parsedDate ? format(parsedDate, "HH:mm", { locale: es }) : "—"}
          </span>
          {delta && (
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-gray-700">
              {delta}
            </span>
          )}
        </div>

        {lastDriver && (
          <div className="flex items-start gap-1.5">
            <User className="h-3 w-3 text-gray-400 mt-0.5 shrink-0" />
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
