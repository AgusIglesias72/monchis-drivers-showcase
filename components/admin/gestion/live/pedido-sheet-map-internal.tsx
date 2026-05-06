"use client"

import "leaflet/dist/leaflet.css"

import { useEffect, useMemo, useRef } from "react"
import L from "leaflet"
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  Tooltip,
} from "react-leaflet"

import type { LiveRoute } from "@/lib/types/live-panel.types"

interface Props {
  route: LiveRoute
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

const ORIGIN_ICON = squareIcon("#10b981", "C")
const DESTINATION_ICON = squareIcon("#ef4444", "D")

export default function PedidoSheetMapInternal({ route }: Props) {
  const mapRef = useRef<L.Map | null>(null)

  const polyline = useMemo<[number, number][] | null>(() => {
    const pts: [number, number][] = []
    if (route.history.length > 0) {
      for (const h of route.history) pts.push([h.lat, h.lng])
    } else if (route.origin && route.destination) {
      pts.push([route.origin.lat, route.origin.lng])
      pts.push([route.destination.lat, route.destination.lng])
    }
    return pts.length >= 2 ? pts : null
  }, [route])

  const bounds = useMemo<L.LatLngBoundsLiteral | null>(() => {
    const pts: [number, number][] = []
    if (route.origin) pts.push([route.origin.lat, route.origin.lng])
    if (route.destination) pts.push([route.destination.lat, route.destination.lng])
    for (const h of route.history) pts.push([h.lat, h.lng])
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
  }, [route])

  useEffect(() => {
    if (!mapRef.current || !bounds) return
    mapRef.current.fitBounds(bounds, { padding: [30, 30] })
  }, [bounds])

  const center: [number, number] = route.origin
    ? [route.origin.lat, route.origin.lng]
    : route.destination
      ? [route.destination.lat, route.destination.lng]
      : [-25.2867, -57.6477]

  return (
    <MapContainer
      center={center}
      zoom={14}
      style={{ height: 280, width: "100%" }}
      ref={(m) => {
        mapRef.current = m as L.Map | null
      }}
      preferCanvas
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {polyline && (
        <Polyline
          positions={polyline}
          pathOptions={{
            color: "#3b82f6",
            weight: 4,
            opacity: 0.85,
            dashArray: route.history.length === 0 ? "6 6" : undefined,
          }}
        />
      )}

      {/* Markers de history (waypoints del driver) */}
      {route.history.map((h, idx) => {
        const isLast = idx === route.history.length - 1
        return (
          <CircleMarker
            key={idx}
            center={[h.lat, h.lng]}
            radius={isLast ? 6 : 4}
            pathOptions={{
              color: "#fff",
              weight: 2,
              fillColor: isLast ? "#3b82f6" : "#93c5fd",
              fillOpacity: 0.95,
            }}
          >
            <Tooltip>
              <div className="text-xs">
                <div className="font-mono">{h.state}</div>
                <div className="text-muted-foreground">#{h.index}</div>
              </div>
            </Tooltip>
          </CircleMarker>
        )
      })}

      {route.origin && (
        <Marker
          position={[route.origin.lat, route.origin.lng]}
          icon={ORIGIN_ICON}
        >
          <Tooltip>
            <div className="text-xs">
              <div className="font-semibold text-emerald-700">Comercio</div>
              <div>{route.origin.name}</div>
            </div>
          </Tooltip>
        </Marker>
      )}
      {route.destination && (
        <Marker
          position={[route.destination.lat, route.destination.lng]}
          icon={DESTINATION_ICON}
        >
          <Tooltip>
            <div className="text-xs">
              <div className="font-semibold text-red-700">Destino</div>
              <div>{route.destination.name}</div>
            </div>
          </Tooltip>
        </Marker>
      )}
    </MapContainer>
  )
}
