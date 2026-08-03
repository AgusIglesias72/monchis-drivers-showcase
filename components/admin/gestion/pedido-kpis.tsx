"use client"

import {
  ChefHat,
  Handshake,
  Navigation,
  PackageCheck,
  Timer,
  Truck,
  Users,
  type LucideIcon,
} from "lucide-react"

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { formatDuration } from "@/lib/services/pedidos-kpis"
import type { OrderKpis } from "@/lib/types/pedidos.types"

interface Props {
  kpis: OrderKpis
  offersCount?: number
}

const ICONS: Record<keyof OrderKpis, LucideIcon> = {
  endToEnd: Timer,
  prep: ChefHat,
  accepting: Handshake,
  toBranch: Truck,
  atBranch: PackageCheck,
  delivery: Truck,
  outside: Navigation,
}

// Orden cronológico real del pedido. endToEnd va al final como total acumulado.
const ORDER: (keyof OrderKpis)[] = [
  "prep",
  "accepting",
  "toBranch",
  "atBranch",
  "delivery",
  "outside",
  "endToEnd",
]

export function PedidoKpis({ kpis, offersCount }: Props) {
  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex flex-wrap items-stretch gap-2 rounded-lg border bg-card p-2">
        {ORDER.map((k, i) => {
          const v = kpis[k]
          const Icon = ICONS[k]
          const isHero = k === "endToEnd"
          return (
            <div key={k} className="flex items-stretch">
              {i > 0 && (
                <span
                  aria-hidden
                  className={
                    isHero
                      ? "mx-1 self-stretch border-l border-border"
                      : "mx-0.5 self-center text-muted-foreground/40 text-xs"
                  }
                >
                  {isHero ? "" : "›"}
                </span>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={
                      isHero
                        ? "flex flex-col gap-0.5 rounded-md bg-foreground/[0.04] px-3 py-1.5 cursor-default"
                        : "flex flex-col gap-0.5 rounded-md px-2.5 py-1.5 hover:bg-muted/50 cursor-default"
                    }
                  >
                    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                      <Icon className="h-3 w-3" />
                      <span>{v.label}</span>
                    </div>
                    <div
                      className={
                        isHero
                          ? "text-base font-bold tabular-nums leading-none"
                          : "text-sm font-semibold tabular-nums leading-none"
                      }
                    >
                      {formatDuration(v.seconds)}
                    </div>
                  </div>
                </TooltipTrigger>
                {v.description && (
                  <TooltipContent side="bottom" className="max-w-[240px]">
                    <div className="text-xs space-y-1">
                      <div className="font-medium">{v.label}</div>
                      <div className="text-muted-foreground">
                        {v.description}
                      </div>
                    </div>
                  </TooltipContent>
                )}
              </Tooltip>
            </div>
          )
        })}

        {/* Pill aparte para "Drivers ofertados" — métrica de cantidad, no de tiempo. */}
        {typeof offersCount === "number" && (
          <>
            <span
              aria-hidden
              className="mx-1 self-stretch border-l border-border"
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex flex-col gap-0.5 rounded-md bg-amber-50 px-3 py-1.5 cursor-default ring-1 ring-amber-200">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-amber-800">
                    <Users className="h-3 w-3" />
                    <span>Drivers ofertados</span>
                  </div>
                  <div className="text-base font-bold tabular-nums leading-none text-amber-900">
                    {offersCount}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[240px]">
                <div className="text-xs space-y-1">
                  <div className="font-medium">Drivers ofertados</div>
                  <div className="text-muted-foreground">
                    Cantidad de drivers que vieron la oferta antes de que uno
                    aceptara
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </>
        )}

      </div>
    </TooltipProvider>
  )
}
