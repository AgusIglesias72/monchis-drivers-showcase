"use client"

import "leaflet/dist/leaflet.css"

import { useEffect, useMemo, useRef } from "react"
import L from "leaflet"
import { MapContainer, Marker, Polyline, TileLayer, Tooltip } from "react-leaflet"

import type { PedidoSheetMapProps } from "./pedido-sheet-map"
import {
  formatDistance,
  haversineMeters,
} from "@/lib/utils/geo"

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
    className: "live-sheet-square",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

// Driver: círculo azul con SVG de bici. Usa la misma estética que el mapa
// principal pero más chico, para no robar protagonismo a los end-points.
function driverIcon(size = 28) {
  const inner = size - 8
  const html = `
    <div style="
      position:relative;
      width:${size}px;
      height:${size}px;
      border-radius:50%;
      background:#2563eb;
      border:2px solid #fff;
      box-shadow:0 1px 4px rgba(0,0,0,.4);
      display:flex;
      align-items:center;
      justify-content:center;
    ">
      <svg width="${inner}" height="${inner}" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="18.5" cy="17.5" r="3.5"/>
        <circle cx="5.5" cy="17.5" r="3.5"/>
        <path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 3h2"/>
      </svg>
    </div>
  `
  return L.divIcon({
    html,
    className: "live-sheet-driver",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

const ORIGIN_ICON = squareIcon("#10b981", "C")
const DESTINATION_ICON = squareIcon("#ef4444", "D")
const DRIVER_ICON = driverIcon()

const TARGET_BY_STATE: Record<string, "origin" | "destination"> = {
  ACCEPTED: "origin",
  WAITING_ORDER: "destination",
  DELIVERY: "destination",
  OUTSIDE: "destination",
}

function legendForLeg(
  state: string | null,
  leg: "origin" | "destination" | null,
): string {
  if (!leg) return ""
  if (leg === "origin") return "Driver al comercio"
  if (state === "WAITING_ORDER") return "Próximo: al cliente"
  return "Driver al cliente"
}

export default function PedidoSheetMapInternal({
  state,
  driverPosition,
  driverName,
  origin,
  destination,
}: PedidoSheetMapProps) {
  const mapRef = useRef<L.Map | null>(null)

  // Tramo activo (línea sólida). Si no hay driver o estado no mapeado, no
  // dibujamos línea sólida — solo los markers + una línea tenue origin↔dest
  // como referencia.
  const targetLeg: "origin" | "destination" | null = state
    ? TARGET_BY_STATE[state] ?? null
    : null
  const activeLine = useMemo<[number, number][] | null>(() => {
    if (!driverPosition || !targetLeg) return null
    const target = targetLeg === "origin" ? origin : destination
    if (!target) return null
    return [
      [driverPosition.lat, driverPosition.lng],
      [target.lat, target.lng],
    ]
  }, [driverPosition, targetLeg, origin, destination])

  // Línea de referencia origen↔destino (gris, tenue).
  const referenceLine = useMemo<[number, number][] | null>(() => {
    if (!origin || !destination) return null
    return [
      [origin.lat, origin.lng],
      [destination.lat, destination.lng],
    ]
  }, [origin, destination])

  const bounds = useMemo<L.LatLngBoundsLiteral | null>(() => {
    const pts: [number, number][] = []
    if (driverPosition) pts.push([driverPosition.lat, driverPosition.lng])
    if (origin) pts.push([origin.lat, origin.lng])
    if (destination) pts.push([destination.lat, destination.lng])
    if (pts.length === 0) return null
    if (pts.length === 1) {
      const [lat, lng] = pts[0]
      return [
        [lat - 0.005, lng - 0.005],
        [lat + 0.005, lng + 0.005],
      ]
    }
    const lats = pts.map((p) => p[0])
    const lngs = pts.map((p) => p[1])
    return [
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)],
    ]
  }, [driverPosition, origin, destination])

  useEffect(() => {
    if (!mapRef.current || !bounds) return
    mapRef.current.fitBounds(bounds, { padding: [30, 30] })
  }, [bounds])

  const center: [number, number] = driverPosition
    ? [driverPosition.lat, driverPosition.lng]
    : origin
      ? [origin.lat, origin.lng]
      : destination
        ? [destination.lat, destination.lng]
        : [-25.2867, -57.6477]

  // Distancia restante para mostrar en el footer del mapa.
  const remainingMeters = useMemo(() => {
    if (!activeLine) return null
    return haversineMeters(
      activeLine[0][0],
      activeLine[0][1],
      activeLine[1][0],
      activeLine[1][1],
    )
  }, [activeLine])

  return (
    <div>
      <MapContainer
        center={center}
        zoom={14}
        style={{ height: 260, width: "100%" }}
        ref={(m) => {
          mapRef.current = m as L.Map | null
        }}
        preferCanvas
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Línea de referencia (gris, dashed) origen ↔ destino */}
        {referenceLine && (
          <Polyline
            positions={referenceLine}
            pathOptions={{
              color: "#9ca3af",
              weight: 2,
              opacity: 0.6,
              dashArray: "4 6",
            }}
          />
        )}

        {/* Tramo activo (sólido, azul) driver → target */}
        {activeLine && (
          <Polyline
            positions={activeLine}
            pathOptions={{
              color: "#2563eb",
              weight: 4,
              opacity: 0.9,
            }}
          />
        )}

        {origin && (
          <Marker position={[origin.lat, origin.lng]} icon={ORIGIN_ICON}>
            <Tooltip>
              <div className="text-xs">
                <div className="font-semibold text-emerald-700">Comercio</div>
                {origin.name && <div>{origin.name}</div>}
              </div>
            </Tooltip>
          </Marker>
        )}
        {destination && (
          <Marker
            position={[destination.lat, destination.lng]}
            icon={DESTINATION_ICON}
          >
            <Tooltip>
              <div className="text-xs">
                <div className="font-semibold text-red-700">Cliente</div>
                {destination.name && <div>{destination.name}</div>}
              </div>
            </Tooltip>
          </Marker>
        )}
        {driverPosition && (
          <Marker
            position={[driverPosition.lat, driverPosition.lng]}
            icon={DRIVER_ICON}
            zIndexOffset={1000}
          >
            <Tooltip>
              <div className="text-xs">
                <div className="font-semibold text-blue-700">Driver</div>
                {driverName && <div>{driverName}</div>}
              </div>
            </Tooltip>
          </Marker>
        )}
      </MapContainer>

      {/* Footer con la leyenda del tramo activo */}
      <div className="flex items-center justify-between border-t bg-muted/30 px-3 py-1.5 text-[11px]">
        <span className="font-medium text-foreground/85">
          {targetLeg ? (
            legendForLeg(state, targetLeg)
          ) : !driverPosition ? (
            <span className="text-muted-foreground">Sin posición del driver</span>
          ) : (
            <span className="text-muted-foreground">
              Tramo no aplicable al estado actual
            </span>
          )}
        </span>
        {remainingMeters !== null && (
          <span className="tabular-nums text-muted-foreground">
            ≈ {formatDistance(remainingMeters)}
          </span>
        )}
      </div>
    </div>
  )
}
