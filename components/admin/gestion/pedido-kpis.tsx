"use client"

import {
  CheckCircle2,
  ChefHat,
  Handshake,
  PackageCheck,
  Search,
  Timer,
  Truck,
  type LucideIcon,
} from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatDuration } from "@/lib/services/pedidos-kpis"
import type { OrderKpis } from "@/lib/types/pedidos.types"

interface Props {
  kpis: OrderKpis
}

const ICONS: Record<keyof OrderKpis, LucideIcon> = {
  endToEnd: Timer,
  prep: ChefHat,
  matching: Search,
  accepting: Handshake,
  toBranch: Truck,
  atBranch: PackageCheck,
  delivery: CheckCircle2,
}

const ORDER: (keyof OrderKpis)[] = [
  "endToEnd",
  "prep",
  "matching",
  "accepting",
  "toBranch",
  "atBranch",
  "delivery",
]

export function PedidoKpis({ kpis }: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
      {ORDER.map((k) => {
        const v = kpis[k]
        const Icon = ICONS[k]
        const isHero = k === "endToEnd"
        return (
          <Card key={k} className={isHero ? "bg-foreground/[0.02] border-foreground/15" : ""}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {v.label}
              </CardTitle>
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="pb-3">
              <div className={isHero ? "text-2xl font-bold tabular-nums" : "text-xl font-bold tabular-nums"}>
                {formatDuration(v.seconds)}
              </div>
              {v.description && (
                <CardDescription className="mt-0.5 text-[11px] leading-tight">
                  {v.description}
                </CardDescription>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
