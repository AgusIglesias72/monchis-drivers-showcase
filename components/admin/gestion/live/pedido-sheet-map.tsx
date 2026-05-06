"use client"

import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"

import type { LiveRoute } from "@/lib/types/live-panel.types"

const Internal = dynamic(() => import("./pedido-sheet-map-internal"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[280px] items-center justify-center rounded-lg border bg-muted/20">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  ),
})

interface Props {
  route: LiveRoute | null
  loading: boolean
}

export function PedidoSheetMap({ route, loading }: Props) {
  if (!route) {
    return (
      <div className="flex h-[280px] items-center justify-center rounded-lg border bg-muted/20 text-sm text-muted-foreground">
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando trayecto…
          </span>
        ) : (
          "Sin datos de trayecto"
        )}
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <Internal route={route} />
    </div>
  )
}
