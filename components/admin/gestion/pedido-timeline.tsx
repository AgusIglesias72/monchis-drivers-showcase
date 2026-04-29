"use client"

import { format } from "date-fns"
import { es } from "date-fns/locale"
import { MapPin, ShieldCheck, User, UserMinus } from "lucide-react"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  CONFIRMED_STYLE,
  type StateStyle,
  styleForHistory,
} from "@/lib/services/pedidos-states"
import { parseOrderInstant } from "@/lib/utils/pedidos-time"
import { cn } from "@/lib/utils"
import type { RawHistoryEntry } from "@/lib/types/pedidos.types"

interface Props {
  histories: RawHistoryEntry[]
  confirmedAt?: string | null
}

type Step =
  | { kind: "synthetic"; date: string; style: StateStyle; rawState: string }
  | { kind: "history"; entry: RawHistoryEntry; style: StateStyle }

function formatTime(d: string): string {
  const parsed = parseOrderInstant(d)
  return parsed ? format(parsed, "HH:mm:ss", { locale: es }) : d
}

function formatDateLine(d: string): string {
  const parsed = parseOrderInstant(d)
  return parsed ? format(parsed, "EEEE d 'de' MMMM yyyy", { locale: es }) : ""
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

export function PedidoTimeline({ histories, confirmedAt }: Props) {
  if (!histories.length) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          Sin historial de eventos.
        </CardContent>
      </Card>
    )
  }

  const steps: Step[] = []
  if (confirmedAt) {
    steps.push({
      kind: "synthetic",
      date: confirmedAt,
      style: CONFIRMED_STYLE,
      rawState: "CONFIRMED",
    })
  }
  for (const h of histories) {
    steps.push({ kind: "history", entry: h, style: styleForHistory(h) })
  }

  const dateLine = formatDateLine(
    steps[0].kind === "synthetic" ? steps[0].date : steps[0].entry.date,
  )

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Recorrido del pedido</CardTitle>
        <p className="text-xs text-muted-foreground capitalize">{dateLine}</p>
      </CardHeader>
      <CardContent>
        <ol className="relative space-y-5">
          {steps.map((step, idx) => {
            const isHistory = step.kind === "history"
            const date = isHistory ? step.entry.date : step.date
            const Icon = step.style.icon
            const delta =
              idx > 0
                ? diffStr(
                    steps[idx - 1].kind === "synthetic"
                      ? (steps[idx - 1] as Extract<Step, { kind: "synthetic" }>).date
                      : (steps[idx - 1] as Extract<Step, { kind: "history" }>).entry.date,
                    date,
                  )
                : null

            const drivers = isHistory ? step.entry.drivers_by_name || [] : []
            const noDriver =
              isHistory &&
              step.entry.request_state === "PENDING" &&
              (step.entry.drivers_by_id || []).length === 0
            const adminChanged = isHistory ? step.entry.admin_changed_state : null
            const lat = isHistory ? step.entry.latitude : null
            const lng = isHistory ? step.entry.longitude : null
            const rawState = isHistory ? step.entry.request_state : step.rawState
            const isLast = idx === steps.length - 1

            return (
              <li key={idx} className="flex gap-4 min-h-[3.25rem]">
                {/* Columna del icono + línea conectora centrada */}
                <div className="relative w-10 shrink-0">
                  <span
                    className={cn(
                      "relative z-10 flex h-10 w-10 items-center justify-center rounded-full text-white shadow-md ring-4 ring-background",
                      step.style.bgClass,
                      adminChanged ? "ring-fuchsia-100" : "",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {adminChanged ? (
                      <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-background bg-fuchsia-600 text-background">
                        <ShieldCheck className="h-2.5 w-2.5" strokeWidth={3} />
                      </span>
                    ) : (
                      <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-background bg-foreground text-[9px] font-bold text-background">
                        {idx + 1}
                      </span>
                    )}
                  </span>
                  {!isLast && (
                    <span
                      aria-hidden
                      className="absolute left-1/2 top-10 -bottom-5 -ml-px border-l-2 border-dashed border-border"
                    />
                  )}
                </div>

                {/* Contenido */}
                <div className="flex-1 pt-1.5">
                  <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                    <span className="text-sm font-semibold">{step.style.label}</span>
                    <span className="text-[11px] uppercase tracking-wide text-muted-foreground/80 font-mono">
                      {rawState}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {formatTime(date)}
                    </span>
                    {delta && (
                      <span className="rounded bg-foreground/5 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-foreground/80">
                        {delta}
                      </span>
                    )}
                  </div>

                  {adminChanged && (
                    <div className="mt-1 inline-flex items-center gap-1 rounded bg-fuchsia-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-fuchsia-900">
                      <ShieldCheck className="h-3 w-3" />
                      Cambio admin
                    </div>
                  )}

                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    {drivers.length > 0 ? (
                      <span className="inline-flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {drivers.join(", ")}
                      </span>
                    ) : noDriver ? (
                      <span className="inline-flex items-center gap-1 text-amber-700">
                        <UserMinus className="h-3 w-3" />
                        Sin driver asignado
                      </span>
                    ) : null}
                    {typeof lat === "number" && typeof lng === "number" && (
                      <span className="inline-flex items-center gap-1 font-mono text-[10px]">
                        <MapPin className="h-3 w-3" />
                        {lat.toFixed(5)}, {lng.toFixed(5)}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      </CardContent>
    </Card>
  )
}
