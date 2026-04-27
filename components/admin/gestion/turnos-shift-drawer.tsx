"use client"

import { Clock, MapPin, Percent, UserRound, Users } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import type { FlattenedShift } from "@/lib/types/turnos.types"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  zone: string | null
  hour: number | null
  shifts: FlattenedShift[]
}

function formatHourDecimal(h: number | null): string {
  if (h === null) return "—"
  const hh = Math.floor(h)
  const mm = Math.round((h - hh) * 60)
  return `${hh.toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")}`
}

function paymentLabel(t: FlattenedShift["paymentType"]): {
  label: string
  className: string
} {
  if (t === "guaranteed")
    return { label: "Garantizado", className: "bg-emerald-100 text-emerald-900 hover:bg-emerald-100" }
  return { label: "Por pedido", className: "bg-orange-100 text-orange-900 hover:bg-orange-100" }
}

export function TurnosShiftDrawer({ open, onOpenChange, zone, hour, shifts }: Props) {
  const totalAssigned = shifts.reduce((a, s) => a + s.driversAssigned, 0)
  const totalMax = shifts.reduce((a, s) => a + s.maxDrivers, 0)
  const occupancy = totalMax > 0 ? Math.round((totalAssigned / totalMax) * 100) : 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            {zone || "Zona"}
          </SheetTitle>
          <SheetDescription className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {hour !== null ? `${hour}:00 – ${hour + 1}:00 hs` : "—"}
          </SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-6 space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-md border p-3">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Asignados
              </div>
              <div className="text-lg font-semibold tabular-nums">
                {totalAssigned}/{totalMax}
              </div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Ocupación
              </div>
              <div className="text-lg font-semibold tabular-nums">{occupancy}%</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Turnos
              </div>
              <div className="text-lg font-semibold tabular-nums">{shifts.length}</div>
            </div>
          </div>

          <Separator />

          {shifts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay turnos cubriendo este horario.
            </p>
          ) : (
            <div className="space-y-3">
              {shifts.map((s) => {
                const payment = paymentLabel(s.paymentType)
                const shiftOcc =
                  s.maxDrivers > 0
                    ? Math.round((s.driversAssigned / s.maxDrivers) * 100)
                    : 0
                return (
                  <div key={s.shiftId} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-medium text-sm">
                          {s.shiftName || "Turno sin nombre"}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatHourDecimal(s.fromHour)} – {formatHourDecimal(s.toHour)}
                        </div>
                      </div>
                      <Badge variant="secondary" className={payment.className}>
                        {payment.label}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 text-xs">
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="tabular-nums">
                          {s.driversAssigned}/{s.maxDrivers}
                        </span>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Percent className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="tabular-nums">{shiftOcc}%</span>
                      </span>
                      {!s.enabled && (
                        <Badge variant="outline" className="text-[10px]">
                          Deshabilitado
                        </Badge>
                      )}
                    </div>

                    {s.driverNames.length > 0 && (
                      <div className="pt-1 border-t">
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">
                          Drivers asignados
                        </div>
                        <ul className="space-y-1">
                          {s.driverNames.map((name, i) => (
                            <li
                              key={i}
                              className="text-xs flex items-center gap-1.5"
                            >
                              <UserRound className="h-3 w-3 text-muted-foreground" />
                              {name}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
