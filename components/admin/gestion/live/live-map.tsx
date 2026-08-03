"use client"

import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"

import type {
  LiveBreadcrumb,
  LiveDriver,
  LiveRequest,
  LiveRoute,
  LiveZone,
} from "@/lib/types/live-panel.types"

const Internal = dynamic(() => import("./live-map-internal"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[520px] items-center justify-center rounded-lg border bg-muted/20">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  ),
})

interface Props {
  zones: LiveZone[]
  drivers: LiveDriver[]
  pending: LiveRequest[]
  delayed: LiveRequest[]
  active: LiveRequest[]
  highlight: { kind: "request" | "driver" | "zone" | "commerce"; id: string } | null
  onHighlight: (
    h: { kind: "request" | "driver" | "zone" | "commerce"; id: string } | null,
  ) => void
  activeRoute: LiveRoute | null
  routeLoading: boolean
  breadcrumb: LiveBreadcrumb | null
}

export function LiveMap(props: Props) {
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="relative">
        <Internal {...props} />
        {props.routeLoading && (
          <div className="pointer-events-none absolute right-3 top-3 z-[1000] flex items-center gap-2 rounded-md border bg-background/95 px-2.5 py-1 text-[11px] shadow-sm backdrop-blur">
            <Loader2 className="h-3 w-3 animate-spin" />
            Cargando ruta…
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 border-t bg-card px-3 py-2 text-[10px] text-muted-foreground">
        <Legend color="#10b981" label="Driver libre" />
        <Legend color="#3b82f6" label="Driver con pedido" />
        <Legend color="#9ca3af" label="No disponible" />
        <Legend color="#f59e0b" label="Sin driver" shape="pin" />
        <Legend color="#ef4444" label="Demorado" shape="pin" />
        <Legend color="#6366f1" label="Recorrido del driver" shape="line" />
      </div>
    </div>
  )
}

function Legend({
  color,
  label,
  shape = "dot",
}: {
  color: string
  label: string
  shape?: "dot" | "pin" | "line"
}) {
  if (shape === "line") {
    return (
      <span className="inline-flex items-center gap-1">
        <span
          className="inline-block h-0.5 w-4 rounded-full"
          style={{ backgroundColor: color }}
        />
        {label}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className={`inline-block ${
          shape === "pin" ? "h-3 w-2.5 rounded-t-full" : "h-2.5 w-2.5 rounded-full"
        } border border-white shadow-sm`}
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  )
}
