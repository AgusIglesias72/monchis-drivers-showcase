"use client"

import { useMemo } from "react"

import { Card } from "@/components/ui/card"
import type { LiveDriver } from "@/lib/types/live-panel.types"

interface Props {
  drivers: LiveDriver[]
}

interface Buckets {
  total: number
  libres: number
  one: number
  two: number
  threePlus: number
  offline: number
}

export function LiveDriversLoad({ drivers }: Props) {
  const buckets = useMemo<Buckets>(() => {
    const out: Buckets = {
      total: drivers.length,
      libres: 0,
      one: 0,
      two: 0,
      threePlus: 0,
      offline: 0,
    }
    for (const d of drivers) {
      const n = d.activeRequestIds.length
      if (n === 0) {
        if (d.available) out.libres += 1
        else out.offline += 1
      } else if (n === 1) out.one += 1
      else if (n === 2) out.two += 1
      else out.threePlus += 1
    }
    return out
  }, [drivers])

  const total = buckets.total
  const occupied = buckets.one + buckets.two + buckets.threePlus
  const denom = total > 0 ? total : 1

  return (
    <Card className="px-3 py-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px]">
        <span
          className="font-semibold text-foreground"
          title="Distribución de drivers conectados según cantidad de pedidos vigentes"
        >
          Carga de drivers
        </span>
        <span className="text-muted-foreground">
          <span className="font-bold tabular-nums text-foreground">{total}</span>{" "}
          conectados
          {total > 0 && (
            <>
              {" · "}
              <span className="font-bold tabular-nums text-foreground">
                {occupied}
              </span>{" "}
              con pedido
            </>
          )}
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-x-2.5 gap-y-0.5 tabular-nums">
          <Pill
            value={buckets.libres}
            label="Libres"
            dot="bg-success"
            valueClass="text-success"
            title="Drivers conectados, disponibles y sin pedido vigente"
          />
          <Pill
            value={buckets.one}
            label="Con 1"
            dot="bg-info"
            valueClass="text-info"
            title="Drivers llevando 1 pedido"
          />
          <Pill
            value={buckets.two}
            label="Con 2"
            dot="bg-violet-500"
            valueClass="text-violet-700 dark:text-violet-400"
            title="Drivers llevando 2 pedidos en simultáneo"
          />
          <Pill
            value={buckets.threePlus}
            label="Con 3+"
            dot="bg-fuchsia-600"
            valueClass="text-fuchsia-700 dark:text-fuchsia-400"
            title="Drivers llevando 3 o más pedidos"
          />
          <Pill
            value={buckets.offline}
            label="No disp."
            dot="bg-muted-foreground/40"
            valueClass="text-muted-foreground"
            title="Drivers conectados pero marcados como no disponibles"
          />
        </div>
      </div>

      <div
        className="mt-1.5 flex h-1.5 w-full overflow-hidden rounded-full bg-muted"
        title="Distribución de carga"
      >
        <Segment
          value={buckets.libres}
          total={denom}
          className="bg-success"
        />
        <Segment value={buckets.one} total={denom} className="bg-info" />
        <Segment
          value={buckets.two}
          total={denom}
          className="bg-violet-500"
        />
        <Segment
          value={buckets.threePlus}
          total={denom}
          className="bg-fuchsia-600"
        />
        <Segment
          value={buckets.offline}
          total={denom}
          className="bg-muted-foreground/40"
        />
      </div>
    </Card>
  )
}

function Pill({
  value,
  label,
  dot,
  valueClass,
  title,
}: {
  value: number
  label: string
  dot: string
  valueClass: string
  title: string
}) {
  return (
    <span className="inline-flex items-center gap-1" title={title}>
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${dot}`} />
      <span className={`font-bold ${valueClass}`}>{value}</span>
      <span className="text-muted-foreground">{label}</span>
    </span>
  )
}

function Segment({
  value,
  total,
  className,
}: {
  value: number
  total: number
  className: string
}) {
  if (value <= 0) return null
  const pct = (value / total) * 100
  return <div className={className} style={{ width: `${pct}%` }} />
}
