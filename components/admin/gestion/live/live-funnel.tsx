"use client"

import {
  AlertCircle,
  Bike,
  ChefHat,
  Handshake,
  Navigation,
  Search,
  type LucideIcon,
} from "lucide-react"

import { Card } from "@/components/ui/card"
import type { PedidoFilter } from "@/components/admin/gestion/live/live-filters"
import type { LiveRequest } from "@/lib/types/live-panel.types"

interface Props {
  pending: LiveRequest[]
  active: LiveRequest[]
  delayed: LiveRequest[]
  filter: PedidoFilter
  onFilterChange: (f: PedidoFilter) => void
}

interface Stage {
  key: PedidoFilter
  label: string
  icon: LucideIcon
  color: string
  bg: string
  bgHover: string
  border: string
  borderActive: string
  iconBg: string
}

const STAGES: Stage[] = [
  {
    key: "PENDING",
    label: "Buscando driver",
    icon: Search,
    color: "text-amber-700 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    bgHover: "hover:bg-amber-100 dark:hover:bg-amber-950/50",
    border: "border-amber-200 dark:border-amber-900",
    borderActive: "border-amber-500 ring-2 ring-amber-500/30",
    iconBg: "bg-amber-100 text-amber-700 dark:bg-amber-900/50",
  },
  {
    key: "ACCEPTED",
    label: "Aceptado",
    icon: Handshake,
    color: "text-violet-700 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-950/30",
    bgHover: "hover:bg-violet-100 dark:hover:bg-violet-950/50",
    border: "border-violet-200 dark:border-violet-900",
    borderActive: "border-violet-500 ring-2 ring-violet-500/30",
    iconBg: "bg-violet-100 text-violet-700 dark:bg-violet-900/50",
  },
  {
    key: "WAITING_ORDER",
    label: "En el comercio",
    icon: ChefHat,
    color: "text-sky-700 dark:text-sky-400",
    bg: "bg-sky-50 dark:bg-sky-950/30",
    bgHover: "hover:bg-sky-100 dark:hover:bg-sky-950/50",
    border: "border-sky-200 dark:border-sky-900",
    borderActive: "border-sky-500 ring-2 ring-sky-500/30",
    iconBg: "bg-sky-100 text-sky-700 dark:bg-sky-900/50",
  },
  {
    key: "DELIVERY",
    label: "En camino",
    icon: Bike,
    color: "text-blue-700 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    bgHover: "hover:bg-blue-100 dark:hover:bg-blue-950/50",
    border: "border-blue-200 dark:border-blue-900",
    borderActive: "border-blue-500 ring-2 ring-blue-500/30",
    iconBg: "bg-blue-100 text-blue-700 dark:bg-blue-900/50",
  },
  {
    key: "OUTSIDE",
    label: "Afuera",
    icon: Navigation,
    color: "text-cyan-700 dark:text-cyan-400",
    bg: "bg-cyan-50 dark:bg-cyan-950/30",
    bgHover: "hover:bg-cyan-100 dark:hover:bg-cyan-950/50",
    border: "border-cyan-200 dark:border-cyan-900",
    borderActive: "border-cyan-500 ring-2 ring-cyan-500/30",
    iconBg: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50",
  },
]

const BUCKETS = [
  { key: "fresh", label: "0-3m", max: 3, fill: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-400" },
  { key: "warm", label: "3-7m", max: 7, fill: "bg-amber-500", text: "text-amber-700 dark:text-amber-400" },
  { key: "hot", label: "7-15m", max: 15, fill: "bg-orange-500", text: "text-orange-700 dark:text-orange-400" },
  { key: "critical", label: "15+m", max: Infinity, fill: "bg-red-500", text: "text-red-700 dark:text-red-400" },
] as const

type BucketKey = (typeof BUCKETS)[number]["key"]

// Tiempo en el estado actual: lo que importa operativamente (cuánto lleva
// "aceptado pero sin moverse", "esperando en el comercio", etc.). Más
// accionable que la antigüedad total del pedido.
function elapsedMinutes(r: LiveRequest): number | null {
  const iso = r.currentStateSince || r.createdAt
  if (!iso) return null
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 0) return null
  return Math.floor(ms / 60000)
}

export function bucketize(items: LiveRequest[]): Record<BucketKey, number> {
  const out: Record<BucketKey, number> = {
    fresh: 0,
    warm: 0,
    hot: 0,
    critical: 0,
  }
  for (const r of items) {
    const m = elapsedMinutes(r)
    if (m === null) continue
    for (const b of BUCKETS) {
      if (m < b.max) {
        out[b.key] += 1
        break
      }
    }
  }
  return out
}

export function LiveFunnel({
  pending,
  active,
  delayed,
  filter,
  onFilterChange,
}: Props) {
  // ASSIGNED / ASSIGNED_DELIVERY / ASSIGNED_PICKUP son estados adicionales que
  // la API legacy expone en paralelo a ACCEPTED. Operativamente significan lo
  // mismo (driver designado, todavía no fue al comercio) → los sumamos al
  // mismo bucket del embudo.
  const byStage = new Map<string, LiveRequest[]>()
  byStage.set("PENDING", pending)
  for (const r of active) {
    if (!r.state) continue
    const stageKey =
      r.state === "ASSIGNED" ||
      r.state === "ASSIGNED_DELIVERY" ||
      r.state === "ASSIGNED_PICKUP"
        ? "ACCEPTED"
        : r.state
    if (!byStage.has(stageKey)) byStage.set(stageKey, [])
    byStage.get(stageKey)!.push(r)
  }

  const total = pending.length + active.length

  return (
    <Card className="p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">Embudo de pedidos</h2>
          <p className="text-xs text-muted-foreground">
            {total} pedido{total === 1 ? "" : "s"} en el sistema
            {delayed.length > 0 && (
              <>
                {" · "}
                <button
                  type="button"
                  onClick={() =>
                    onFilterChange(filter === "delayed" ? "all" : "delayed")
                  }
                  className="font-semibold text-destructive underline-offset-2 hover:underline"
                >
                  {delayed.length} demorado{delayed.length === 1 ? "" : "s"}
                </button>
              </>
            )}
          </p>
        </div>
        <Legend />
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {STAGES.map((stage) => {
          const items = byStage.get(stage.key) || []
          const count = items.length
          const buckets = bucketize(items)
          const Icon = stage.icon
          const pct = total > 0 ? (count / total) * 100 : 0
          const critical = buckets.critical
          const isActive = filter === stage.key
          return (
            <button
              key={stage.key}
              type="button"
              onClick={() =>
                onFilterChange(filter === stage.key ? "all" : stage.key)
              }
              className={`flex w-full flex-col rounded-lg border ${stage.bg} ${stage.bgHover} p-3 text-left transition ${
                isActive ? stage.borderActive : stage.border
              }`}
            >
              <div className="flex items-start gap-2">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${stage.iconBg}`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-1.5">
                    <span
                      className={`text-2xl font-bold leading-none tabular-nums ${stage.color}`}
                    >
                      {count}
                    </span>
                    <span className="text-[10px] tabular-nums text-muted-foreground">
                      · {pct.toFixed(0)}%
                    </span>
                  </div>
                  <div
                    className={`mt-1 text-xs font-medium leading-tight ${stage.color}`}
                  >
                    {stage.label}
                  </div>
                </div>
              </div>

              <div className="mt-3 space-y-1.5">
                <StackedBar buckets={buckets} total={count} />
                <BucketCounts buckets={buckets} />
              </div>

              {critical > 0 && (
                <div className="mt-2 flex items-center gap-1.5 rounded-md bg-red-100 px-2 py-1 text-[11px] font-semibold text-red-800 dark:bg-red-950/50 dark:text-red-300">
                  <AlertCircle className="h-3 w-3" />
                  {critical} con más de 15 min
                </div>
              )}
            </button>
          )
        })}
      </div>

      {filter !== "all" && (
        <div className="mt-3 flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2 text-xs">
          <span>
            Sidebar filtrado por:{" "}
            <span className="font-semibold">
              {STAGES.find((s) => s.key === filter)?.label ||
                (filter === "delayed" ? "Demorados" : filter)}
            </span>
          </span>
          <button
            type="button"
            onClick={() => onFilterChange("all")}
            className="font-semibold text-foreground/70 hover:text-foreground"
          >
            Limpiar filtro
          </button>
        </div>
      )}
    </Card>
  )
}

function StackedBar({
  buckets,
  total,
}: {
  buckets: Record<BucketKey, number>
  total: number
}) {
  if (total === 0) {
    return <div className="h-1.5 w-full rounded-full bg-muted/60" />
  }
  return (
    <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted/40">
      {BUCKETS.map((b) => {
        const c = buckets[b.key]
        if (c === 0) return null
        const pct = (c / total) * 100
        return (
          <div
            key={b.key}
            className={b.fill}
            style={{ width: `${pct}%` }}
            title={`${b.label}: ${c}`}
          />
        )
      })}
    </div>
  )
}

function BucketCounts({ buckets }: { buckets: Record<BucketKey, number> }) {
  return (
    <div className="grid grid-cols-4 gap-1 text-[10px] tabular-nums">
      {BUCKETS.map((b) => {
        const c = buckets[b.key]
        return (
          <div
            key={b.key}
            className={`flex flex-col items-start ${
              c === 0 ? "opacity-40" : ""
            }`}
          >
            <span className="text-muted-foreground">{b.label}</span>
            <span className={`font-semibold ${c === 0 ? "" : b.text}`}>
              {c}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
      <span className="font-semibold uppercase tracking-wide">
        Tiempo en el estado:
      </span>
      {BUCKETS.map((b) => (
        <span key={b.key} className="inline-flex items-center gap-1">
          <span className={`inline-block h-2 w-2 rounded-full ${b.fill}`} />
          {b.label}
        </span>
      ))}
    </div>
  )
}
