"use client"

import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"
import { useLoadScript } from "@react-google-maps/api"

import type { MapPoint } from "@/lib/types/pedidos.types"

const Internal = dynamic(() => import("./pedido-map-internal"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] items-center justify-center rounded-lg border bg-muted/20">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  ),
})

interface Props {
  points: MapPoint[]
  apiKey: string
}

export function PedidoMap({ points, apiKey }: Props) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey,
  })

  if (!apiKey) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-lg border bg-muted/20 text-sm text-muted-foreground p-4 text-center">
        Falta <code className="mx-1 font-mono">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> en
        .env para mostrar el mapa.
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-lg border bg-muted/20 text-sm text-destructive">
        Error cargando Google Maps
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-lg border bg-muted/20">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="pedido-map-wrapper overflow-hidden rounded-lg border">
      <Internal points={points} />
      <div className="flex flex-wrap gap-3 border-t bg-card px-4 py-2 text-xs text-muted-foreground">
        <Legend color="#10b981" label="Comercio (origen)" />
        <Legend color="#ef4444" label="Cliente (destino)" />
        <Legend color="#3b82f6" label="Driver (eventos)" />
        <Legend color="#f59e0b" label="Oferta enviada (PENDING)" />
        <Legend color="#8b5cf6" label="Aceptado" />
        <Legend color="#c026d3" label="Cambio admin" />
        <span className="text-muted-foreground/60">— Polyline conecta el recorrido del driver en orden cronológico</span>
      </div>
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block h-3 w-3 rounded-full border border-white"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  )
}
