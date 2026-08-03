"use client"

import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Bike, Clock, Info, LogIn, LogOut } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { parseDriverInstant } from "@/lib/utils/pedidos-time"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type {
  AttendanceFetchResult,
  RawAttendance,
  RawAttendanceRequest,
} from "@/lib/types/pedidos.types"

interface Props {
  attendance: AttendanceFetchResult | null
  currentExternalOrderId: string | null
}

function fmtDriverTime(s: string | undefined): string {
  if (!s) return "—"
  const d = parseDriverInstant(s)
  return d ? format(d, "HH:mm:ss", { locale: es }) : s
}

function fmtDriverHHmm(s: string | undefined): string {
  if (!s) return "—"
  const d = parseDriverInstant(s)
  return d ? format(d, "HH:mm", { locale: es }) : s
}

function tsOf(s: string | undefined): number {
  if (!s) return 0
  const d = parseDriverInstant(s)
  return d ? d.getTime() : 0
}

function statusClass(state: string): string {
  switch (state) {
    case "FINALIZED":
      return "bg-success-soft text-success hover:bg-success-soft"
    case "CANCELLED":
      return "bg-danger-soft text-destructive hover:bg-danger-soft"
    default:
      return "bg-info-soft text-info hover:bg-info-soft"
  }
}

interface TurnGroup {
  key: string
  zone: string
  turn: string
  day: string
  turnEntryTime: string
  turnExitTime: string
  sessions: RawAttendance[]
  requests: RawAttendanceRequest[]
}

function groupByTurn(attendances: RawAttendance[]): TurnGroup[] {
  const map = new Map<string, TurnGroup>()
  for (const att of attendances) {
    const key = `${att.day}::${att.turn}`
    let group = map.get(key)
    if (!group) {
      group = {
        key,
        zone: att.zone,
        turn: att.turn,
        day: att.day,
        turnEntryTime: att.turn_entry_time,
        turnExitTime: att.turn_exit_time,
        sessions: [],
        requests: [],
      }
      map.set(key, group)
    }
    group.sessions.push(att)
    for (const r of att.requests || []) {
      group.requests.push(r)
    }
  }
  return Array.from(map.values()).map((g) => ({
    ...g,
    sessions: [...g.sessions].sort(
      (a, b) => tsOf(a.driver_entry_time) - tsOf(b.driver_entry_time),
    ),
    requests: [...g.requests].sort(
      (a, b) => tsOf(a.request_date_time) - tsOf(b.request_date_time),
    ),
  }))
}

export function PedidoDriverDay({ attendance, currentExternalOrderId }: Props) {
  if (!attendance) {
    return (
      <EmptyCard>No se pudo obtener el driver_id o la fecha del pedido.</EmptyCard>
    )
  }
  if (attendance.error) {
    return <EmptyCard error>Error: {attendance.error}</EmptyCard>
  }
  if (attendance.attendances.length === 0) {
    return (
      <EmptyCard>No hay registro de turnos del driver para esta fecha.</EmptyCard>
    )
  }

  const groups = groupByTurn(attendance.attendances)

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-4">
        {groups.map((group) => (
          <TurnCard
            key={group.key}
            group={group}
            currentExternalOrderId={currentExternalOrderId}
          />
        ))}
      </div>
    </TooltipProvider>
  )
}

function EmptyCard({
  children,
  error,
}: {
  children: React.ReactNode
  error?: boolean
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bike className="h-4 w-4 text-muted-foreground" />
          Otros pedidos del driver
        </CardTitle>
        <CardDescription className={error ? "text-destructive" : undefined}>
          {children}
        </CardDescription>
      </CardHeader>
    </Card>
  )
}

function TurnCard({
  group,
  currentExternalOrderId,
}: {
  group: TurnGroup
  currentExternalOrderId: string | null
}) {
  const inThisTurn = group.requests.some(
    (r) => r.external_order_id === currentExternalOrderId,
  )

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span className="inline-flex items-center gap-2">
            <Bike className="h-4 w-4 text-muted-foreground" />
            {group.zone}
          </span>
          {inThisTurn && (
            <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">
              Turno del pedido
            </Badge>
          )}
        </CardTitle>
        <CardDescription className="text-xs">
          {group.day} · {group.turn}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <Field label="Entrada planificada" value={group.turnEntryTime} />
          <Field label="Salida planificada" value={group.turnExitTime} />
        </div>

        <div className="border-t pt-2">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-medium">
              Sesiones {group.sessions.length > 1 && `(${group.sessions.length})`}
            </span>
            {group.sessions.length > 1 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center gap-1 rounded bg-warning-soft px-1.5 py-0.5 text-[10px] font-medium text-warning">
                    Conexión / desconexión
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-[240px]">
                  El driver entró y salió del turno varias veces durante este día.
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          <ul className="space-y-1.5">
            {group.sessions.map((s, i) => (
              <li
                key={i}
                className="flex flex-wrap items-center gap-x-3 gap-y-0.5 rounded-md bg-muted/30 px-2 py-1.5 text-xs tabular-nums"
              >
                {group.sessions.length > 1 && (
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    #{i + 1}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <LogIn className="h-3 w-3 text-success" />
                  {fmtDriverTime(s.driver_entry_time)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <LogOut className="h-3 w-3 text-destructive" />
                  {fmtDriverTime(s.driver_exit_time)}
                </span>
                {s.driver_exit_reason && (
                  <span className="text-[10px] text-muted-foreground basis-full">
                    Motivo: {s.driver_exit_reason}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t pt-2">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium">
              Pedidos del turno ({group.requests.length})
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[260px]">
                Estos pedidos vienen sólo con <code>external_order_id</code>. Para
                ver el detalle de uno necesitamos su <code>request_id</code> de
                Mongo, que la API no expone por este endpoint.
              </TooltipContent>
            </Tooltip>
          </div>

          {group.requests.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sin pedidos en el turno.</p>
          ) : (
            <ul className="space-y-1.5">
              {group.requests.map((r) => {
                const isCurrent = r.external_order_id === currentExternalOrderId
                return (
                  <li
                    key={r.external_order_id}
                    className={
                      "flex items-start justify-between gap-2 rounded-md px-2 py-1.5 text-xs " +
                      (isCurrent
                        ? "bg-primary/5 ring-1 ring-primary/30"
                        : "hover:bg-muted/30")
                    }
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">
                        #{r.external_order_id}
                        {isCurrent && (
                          <span className="ml-1.5 text-[10px] text-primary">
                            (este pedido)
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 truncate text-muted-foreground">
                        <Clock className="h-2.5 w-2.5" />
                        <span className="tabular-nums">
                          {fmtDriverHHmm(r.request_date_time)}
                        </span>
                        <span className="mx-1">·</span>
                        <span className="truncate">{r.branch}</span>
                      </div>
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="secondary" className={statusClass(r.request_state)}>
                          {r.request_state}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-xs space-y-0.5">
                          <div>{r.accepted}</div>
                          {r.reason && <div className="text-muted-foreground">{r.reason}</div>}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border bg-muted/20 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="font-medium tabular-nums">{value}</div>
    </div>
  )
}
