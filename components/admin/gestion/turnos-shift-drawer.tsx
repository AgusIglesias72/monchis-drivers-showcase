"use client"

import { useEffect, useMemo, useState } from "react"
import {
  AlertCircle,
  Clock,
  Loader2,
  MapPin,
  Percent,
  UserRound,
  Users,
} from "lucide-react"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
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
import {
  getDriversToReview,
  type DriverToReview,
} from "@/app/admin/gestion/turnos/actions"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  zone: string | null
  hour: number | null
  baseDateIso: string
  shifts: FlattenedShift[]
  allDayShifts: FlattenedShift[]
}

function formatHourDecimal(h: number | null): string {
  if (h === null) return "—"
  const hh = Math.floor(h)
  const mm = Math.round((h - hh) * 60)
  return `${hh.toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")}`
}

function formatHourCompact(h: number | null): string {
  if (h === null) return "—"
  const hh = Math.floor(h)
  const mm = Math.round((h - hh) * 60)
  if (mm === 0) return String(hh)
  return `${hh}:${mm.toString().padStart(2, "0")}`
}

function normalizeName(s: string): string {
  return s.trim().toLowerCase()
}

function paymentLabel(t: FlattenedShift["paymentType"]): {
  label: string
  className: string
} {
  if (t === "guaranteed")
    return { label: "Garantizado", className: "bg-success-soft text-success hover:bg-success-soft" }
  return { label: "Por pedido", className: "bg-warning-soft text-warning hover:bg-warning-soft" }
}

interface ReviewState {
  status: "idle" | "loading" | "ready" | "error"
  drivers: DriverToReview[]
  totalWeeks: number
  weekDates: string[]
  error?: string
}

const INITIAL_REVIEW: ReviewState = {
  status: "idle",
  drivers: [],
  totalWeeks: 4,
  weekDates: [],
}

function formatDayEs(dayIso: string): string {
  const [y, m, d] = dayIso.split("-").map(Number)
  if (!y || !m || !d) return dayIso
  const dt = new Date(Date.UTC(y, m - 1, d))
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  }).format(dt)
}

function formatTimeEs(iso: string): string {
  const dt = new Date(iso)
  if (isNaN(dt.getTime())) return "—"
  // Las attendances vienen UTC con wall-clock PY. Mostramos getUTC* para preservar.
  const hh = dt.getUTCHours().toString().padStart(2, "0")
  const mm = dt.getUTCMinutes().toString().padStart(2, "0")
  return `${hh}:${mm}`
}

export function TurnosShiftDrawer({
  open,
  onOpenChange,
  zone,
  hour,
  baseDateIso,
  shifts,
  allDayShifts,
}: Props) {
  const totalAssigned = shifts.reduce((a, s) => a + s.driversAssigned, 0)
  const totalMax = shifts.reduce((a, s) => a + s.maxDrivers, 0)
  const occupancy = totalMax > 0 ? Math.round((totalAssigned / totalMax) * 100) : 0

  // name (normalizado) -> turnos del mismo día asignados a ese driver
  const shiftsByDriver = useMemo(() => {
    const map = new Map<string, FlattenedShift[]>()
    for (const s of allDayShifts) {
      for (const name of s.driverNames) {
        const key = normalizeName(name)
        if (!key) continue
        const arr = map.get(key) || []
        arr.push(s)
        map.set(key, arr)
      }
    }
    return map
  }, [allDayShifts])

  // driverId -> turnos del mismo día (para mostrar en "Drivers a revisar"
  // si un habitual está tomando otro turno hoy o no).
  const dayShiftsByDriverId = useMemo(() => {
    const map = new Map<string, FlattenedShift[]>()
    for (const s of allDayShifts) {
      for (const id of s.driverIds) {
        if (!id) continue
        const arr = map.get(id) || []
        arr.push(s)
        map.set(id, arr)
      }
    }
    return map
  }, [allDayShifts])

  // Drivers ya asignados en CUALQUIER turno actual de este slot — los excluimos
  // del listado de "a revisar" porque sí se conectaron en una variante similar.
  // Usamos string como dep stable para evitar refetch cada render.
  const currentDriverIdsKey = useMemo(() => {
    const set = new Set<string>()
    for (const s of shifts) for (const id of s.driverIds) set.add(id)
    return [...set].sort().join(",")
  }, [shifts])

  const [review, setReview] = useState<ReviewState>(INITIAL_REVIEW)

  useEffect(() => {
    if (!open || !zone || hour === null || !baseDateIso) {
      setReview(INITIAL_REVIEW)
      return
    }
    let cancelled = false
    setReview((prev) => ({ ...prev, status: "loading" }))
    getDriversToReview({
      zoneName: zone,
      hour,
      baseDateIso,
      currentDriverIds: currentDriverIdsKey ? currentDriverIdsKey.split(",") : [],
    })
      .then((res) => {
        if (cancelled) return
        if (!res.ok) {
          setReview({
            status: "error",
            drivers: [],
            totalWeeks: res.totalWeeks,
            weekDates: res.weekDates,
            error: res.error,
          })
          return
        }
        setReview({
          status: "ready",
          drivers: res.drivers,
          totalWeeks: res.totalWeeks,
          weekDates: res.weekDates,
        })
      })
      .catch((err) => {
        if (cancelled) return
        setReview({
          status: "error",
          drivers: [],
          totalWeeks: 4,
          weekDates: [],
          error: err instanceof Error ? err.message : "Error desconocido",
        })
      })
    return () => {
      cancelled = true
    }
  }, [open, zone, hour, baseDateIso, currentDriverIdsKey])

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
                          {s.driverNames.map((name, i) => {
                            const others = (
                              shiftsByDriver.get(normalizeName(name)) || []
                            ).filter((o) => o.shiftId !== s.shiftId)
                            return (
                              <li
                                key={i}
                                className="text-xs flex items-start gap-1.5 flex-wrap"
                              >
                                <UserRound className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
                                <span>{name}</span>
                                {others.map((o) => (
                                  <span
                                    key={o.shiftId}
                                    className="inline-flex items-center rounded border px-1.5 py-0 text-[10px] text-muted-foreground bg-muted/40"
                                    title={`También en ${o.zoneName} ${formatHourDecimal(o.fromHour)}–${formatHourDecimal(o.toHour)}`}
                                  >
                                    {formatHourCompact(o.fromHour)}-
                                    {formatHourCompact(o.toHour)} {o.zoneName}
                                  </span>
                                ))}
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {shifts.length > 0 && (
            <ReviewSection
              review={review}
              hour={hour}
              zone={zone}
              dayShiftsByDriverId={dayShiftsByDriverId}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function ReviewSection({
  review,
  hour,
  zone,
  dayShiftsByDriverId,
}: {
  review: ReviewState
  hour: number | null
  zone: string | null
  dayShiftsByDriverId: Map<string, FlattenedShift[]>
}) {
  // Mostramos primero los "sin turno hoy" — son la señal más fuerte. Dentro
  // de cada grupo respetamos el orden que vino del action (weeksTaken desc).
  const sortedDrivers = useMemo(() => {
    return [...review.drivers].sort((a, b) => {
      const aHas = (dayShiftsByDriverId.get(a.driverId) || []).length > 0
      const bHas = (dayShiftsByDriverId.get(b.driverId) || []).length > 0
      if (aHas !== bHas) return aHas ? 1 : -1
      return 0
    })
  }, [review.drivers, dayShiftsByDriverId])

  return (
    <div className="rounded-lg border border-warning bg-warning-soft/40 p-3 space-y-2">
      <div className="flex items-center gap-1.5">
        <AlertCircle className="h-4 w-4 text-warning" />
        <h3 className="text-sm font-semibold text-warning">
          Drivers a revisar
        </h3>
        {review.status === "ready" && review.drivers.length > 0 && (
          <Badge
            variant="secondary"
            className="bg-warning-soft text-warning hover:bg-warning-soft text-[10px]"
          >
            {review.drivers.length}
          </Badge>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground leading-snug">
        Tomaron este slot ({zone}, {hour !== null ? `${hour}-${hour + 1}h` : "—"})
        en ≥2 de las últimas {review.totalWeeks} semanas (mismo día), pero no
        están en los turnos de hoy.
      </p>

      {review.status === "loading" && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Calculando…
        </div>
      )}

      {review.status === "error" && (
        <p className="text-xs text-destructive">
          {review.error || "Error al cargar"}
        </p>
      )}

      {review.status === "ready" && review.drivers.length === 0 && (
        <p className="text-xs text-muted-foreground italic">
          Ningún driver habitual quedó afuera. ✓
        </p>
      )}

      {review.status === "ready" && review.drivers.length > 0 && (
        <Accordion type="multiple" className="-mx-1">
          {sortedDrivers.map((d) => {
            const todayShifts = dayShiftsByDriverId.get(d.driverId) || []
            return (
            <AccordionItem
              key={d.driverId}
              value={d.driverId}
              className="border-warning/60"
            >
              <AccordionTrigger className="py-2 px-1 hover:no-underline hover:bg-warning-soft/40 rounded">
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <UserRound className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-xs font-medium truncate">
                      {d.fullName}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[10px] tabular-nums shrink-0"
                    >
                      {d.weeksTaken}/{d.totalWeeks}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap pl-5">
                    {todayShifts.length === 0 ? (
                      <span className="inline-flex items-center rounded border border-destructive bg-danger-soft px-1.5 py-0 text-[10px] text-destructive">
                        Sin turno
                      </span>
                    ) : (
                      todayShifts.map((s) => (
                        <span
                          key={s.shiftId}
                          className="inline-flex items-center rounded border border-success bg-success-soft px-1.5 py-0 text-[10px] text-success"
                          title={`Hoy en ${s.zoneName} ${formatHourDecimal(s.fromHour)}–${formatHourDecimal(s.toHour)}`}
                        >
                          {formatHourCompact(s.fromHour)}-
                          {formatHourCompact(s.toHour)} {s.zoneName}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-1 pb-2">
                <ul className="space-y-1">
                  {d.attendances.map((a) => (
                    <li
                      key={a.day}
                      className="text-[11px] flex items-start gap-1.5 text-muted-foreground"
                    >
                      <Clock className="h-3 w-3 mt-0.5 shrink-0" />
                      <span className="tabular-nums shrink-0">
                        {formatDayEs(a.day)}
                      </span>
                      <span className="tabular-nums shrink-0">
                        {formatTimeEs(a.entryAt)}–{formatTimeEs(a.exitAt)}
                      </span>
                      <span className="truncate">{a.turn}</span>
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          )
          })}
        </Accordion>
      )}
    </div>
  )
}
