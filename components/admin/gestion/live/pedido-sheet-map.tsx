"use client"

import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"

const Internal = dynamic(() => import("./pedido-sheet-map-internal"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[260px] items-center justify-center rounded-lg border bg-muted/20">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  ),
})

export interface SheetMapPoint {
  lat: number
  lng: number
  name?: string
}

export interface PedidoSheetMapProps {
  state: string | null
  driverPosition: { lat: number; lng: number } | null
  driverName: string | null
  origin: SheetMapPoint | null
  destination: SheetMapPoint | null
  // Recorrido real del driver (rastro fino minuto a minuto) para este pedido.
  trail?: { lat: number; lng: number }[] | null
}

export function PedidoSheetMap(props: PedidoSheetMapProps) {
  const { driverPosition, origin, destination, trail } = props
  // Si no hay nada que mostrar, fallback amigable.
  if (!driverPosition && !origin && !destination && !trail?.length) {
    return (
      <div className="flex h-[260px] items-center justify-center rounded-lg border bg-muted/20 text-sm text-muted-foreground">
        Sin datos de ubicación
      </div>
    )
  }
  return (
    <div className="overflow-hidden rounded-lg border">
      <Internal {...props} />
    </div>
  )
}
