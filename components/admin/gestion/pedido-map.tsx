"use client"

import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"

import type { MapPoint } from "@/lib/types/pedidos.types"

const Internal = dynamic(() => import("./pedido-map-internal"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[440px] items-center justify-center bg-muted/20">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  ),
})

interface Props {
  points: MapPoint[]
  focusedHistoryIdx?: number | null
  onMarkerClick?: (historyIdx: number) => void
}

export function PedidoMap({ points, focusedHistoryIdx, onMarkerClick }: Props) {
  return (
    <div className="pedido-map-wrapper overflow-hidden rounded-lg border">
      <Internal
        points={points}
        focusedHistoryIdx={focusedHistoryIdx}
        onMarkerClick={onMarkerClick}
      />
      <div className="flex flex-wrap gap-3 border-t bg-card px-4 py-2 text-xs text-muted-foreground">
        <Legend color="#10b981" label="Comercio" />
        <Legend color="#ef4444" label="Cliente" />
        <Legend color="#94a3b8" label="Oferta enviada" />
        <Legend color="#f59e0b" label="Aceptado" />
        <Legend color="#c026d3" label="Cambio admin" />
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
