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
}

interface Props {
  points: MapPoint[]
}

const ORIGIN_HEX = "#10b981"
const DESTINATION_HEX = "#ef4444"

function styleForPoint(p: MapPoint): StateStyle | null {
  if (p.kind !== "history" || !p.state) return null
  return styleForState(p.state, p.hasDriver !== false)
}

function colorFor(p: MapPoint): string {
  if (p.kind === "origin") return ORIGIN_HEX
  if (p.kind === "destination") return DESTINATION_HEX
  if (p.adminChangedState) {
    // Marcador fuchsia distintivo si fue cambio admin
    return "#c026d3"
  }
  return styleForPoint(p)?.hex || "#3b82f6"
}

function symbolFor(p: MapPoint): google.maps.Symbol {
  if (p.kind === "origin" || p.kind === "destination") {
    return {
      path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
      scale: 11,
      fillColor: colorFor(p),
      fillOpacity: 1,
      strokeColor: "#fff",
      strokeWeight: 3,
    }
  }
  return {
    path: google.maps.SymbolPath.CIRCLE,
    scale: 14,
    fillColor: colorFor(p),
    fillOpacity: 0.95,
    strokeColor: "#fff",
    strokeWeight: 2.5,
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

export default function PedidoMapInternal({ points }: Props) {
  const mapRef = useRef<google.maps.Map | null>(null)
  const [activeIdx, setActiveIdx] = useState<number | null>(null)

  const polyline = useMemo(
    () =>
      points
        .filter((p) => p.kind === "history")
        .map((p) => ({ lat: p.lat, lng: p.lng })),
    [points],
  )

  useEffect(() => {
    if (!mapRef.current || points.length === 0) return
    const bounds = new google.maps.LatLngBounds()
    points.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }))
    mapRef.current.fitBounds(bounds, 64)
  }, [points])

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
      {polyline.length > 1 && (
        <PolylineF
          path={polyline}
          options={{
            strokeColor: "#3b82f6",
            strokeOpacity: 0.6,
            strokeWeight: 3,
            geodesic: true,
          }}
        />
      )}

      {points.map((p, idx) => (
        <MarkerF
          key={`${p.kind}-${idx}`}
          position={{ lat: p.lat, lng: p.lng }}
          icon={symbolFor(p)}
          label={
            p.kind === "history"
              ? {
                  text: String(p.index ?? idx),
                  color: "#fff",
                  fontSize: "13px",
                  fontWeight: "700",
                }
              : undefined
          }
          onClick={() => setActiveIdx(idx)}
          zIndex={p.adminChangedState ? 1000 : undefined}
        >
          {activeIdx === idx && (
            <InfoWindowF
              position={{ lat: p.lat, lng: p.lng }}
              onCloseClick={() => setActiveIdx(null)}
              options={{ pixelOffset: new google.maps.Size(0, -6) }}
            >
              <PointInfo point={p} />
            </InfoWindowF>
          )}
        </MarkerF>
      ))}
    </GoogleMap>
  )
}

function PointInfo({ point }: { point: MapPoint }) {
  if (point.kind === "origin" || point.kind === "destination") {
    const isOrigin = point.kind === "origin"
    return (
      <div className="w-[260px] overflow-hidden rounded-md">
        <div
          className="flex items-center gap-2 px-3 py-2 text-white"
          style={{ backgroundColor: isOrigin ? ORIGIN_HEX : DESTINATION_HEX }}
        >
          <MapPin className="h-4 w-4" />
          <span className="text-sm font-semibold">
            {isOrigin ? "Comercio" : "Cliente"}
          </span>
        </div>
        <div className="px-3 py-2 space-y-1 text-xs text-gray-700">
          <div className="font-medium text-sm text-gray-900">{point.label}</div>
          <div className="font-mono text-[10px] text-gray-400">
            {point.lat.toFixed(6)}, {point.lng.toFixed(6)}
          </div>
        </div>
      </div>
    )
  }

  const style = styleForPoint(point)
  const Icon = style?.icon
  const friendlyLabel = style?.label || point.state || "Evento"
  const parsedDate = parseOrderInstant(point.date || null)
  const delta = point.prevDate && point.date ? diffStr(point.prevDate, point.date) : null

  return (
    <div className="w-[280px] overflow-hidden rounded-md">
      {/* Header con color del estado */}
      <div
        className="flex items-center gap-2 px-3 py-2 text-white"
        style={{ backgroundColor: style?.hex || "#3b82f6" }}
      >
        {Icon && <Icon className="h-4 w-4" />}
        <span className="text-sm font-semibold">{friendlyLabel}</span>
        {point.index !== undefined && (
          <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white/25 px-1.5 text-[11px] font-bold tabular-nums">
            {point.index}
          </span>
        )}
      </div>

      <div className="px-3 py-2.5 space-y-1.5">
        {/* Estado raw */}
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-gray-500 font-mono">
          {point.state}
        </div>

        {/* Hora + delta */}
        <div className="flex items-center gap-2 text-xs text-gray-700">
          <Clock className="h-3 w-3 text-gray-400" />
          <span className="font-medium tabular-nums">
            {parsedDate ? format(parsedDate, "HH:mm:ss", { locale: es }) : "—"}
          </span>
          {delta && (
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-gray-700">
              {delta}
            </span>
          )}
        </div>

        {/* Driver */}
        {point.driverNames && point.driverNames.length > 0 && (
          <div className="flex items-start gap-2 text-xs text-gray-700">
            <User className="h-3 w-3 text-gray-400 mt-0.5 shrink-0" />
            <span>{point.driverNames.join(", ")}</span>
          </div>
        )}

        {/* Cambio admin destacado */}
        {point.adminChangedState && (
          <div className="mt-1 flex items-center gap-1.5 rounded-md bg-fuchsia-50 px-2 py-1.5 text-fuchsia-900">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
            <div className="text-[11px] leading-tight">
              <div className="font-semibold uppercase tracking-wide">Cambio admin</div>
              <div className="text-fuchsia-700/80 font-mono text-[10px]">
                {point.adminChangedState}
              </div>
            </div>
          </div>
        )}

        {/* Coords */}
        <div className="border-t pt-1.5 font-mono text-[10px] text-gray-400">
          {point.lat.toFixed(6)}, {point.lng.toFixed(6)}
        </div>
      </div>
    </div>
  )
}
