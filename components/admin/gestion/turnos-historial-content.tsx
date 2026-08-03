"use client"

import { useMemo, useState, useTransition } from "react"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "sonner"

import { AdminHeader } from "@/components/admin/admin-header"
import { TurnosKpis } from "@/components/admin/gestion/turnos-kpis"
import { TurnosHeatmap } from "@/components/admin/gestion/turnos-heatmap"
import { TurnosHourlyChart } from "@/components/admin/gestion/turnos-hourly-chart"
import { TurnosShiftDrawer } from "@/components/admin/gestion/turnos-shift-drawer"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { loadSnapshotDetail } from "@/app/admin/gestion/turnos/historial/actions"
import { TURNOS_HOURS } from "@/lib/config/turnos.config"
import {
  computeKpis,
  coversSlot,
  shiftsForDate,
  uniqueDates,
} from "@/lib/services/turnos-aggregate"
import type {
  SnapshotDetail,
  SnapshotListItem,
} from "@/lib/services/turnos-snapshot-read.service"
import { METRIC_LABELS, type Metric } from "@/lib/types/turnos.types"
import { addDaysIso, formatDatePill, todayInPyIso } from "@/lib/utils/turnos-dates"
import { cn } from "@/lib/utils"

interface Props {
  snapshots: SnapshotListItem[]
  initialDetail: SnapshotDetail | null
}

function shortDay(iso: string): string {
  try {
    return format(parseISO(iso), "EEE d MMM", { locale: es })
  } catch {
    return iso
  }
}

function fmtH(h: number | null): string {
  if (h === null) return "—"
  const hh = Math.floor(h)
  const mm = Math.round((h - hh) * 60)
  return mm === 0 ? `${hh}` : `${hh}:${mm.toString().padStart(2, "0")}`
}

function prevPhrase(detail: SnapshotDetail, capturedAt: Date): string {
  if (!detail.hasPrev) return "primera foto registrada — sin comparación."
  if (!detail.prevCapturedAtIso) return "respecto a la foto anterior."
  const prev = format(parseISO(detail.prevCapturedAtIso), "HH:mm", { locale: es })
  return `entre la foto de las ${prev} y las ${format(capturedAt, "HH:mm", { locale: es })}.`
}

const PILL_BASE =
  "rounded-md border transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring"
const PILL_ON =
  "border-foreground bg-foreground text-background hover:bg-foreground hover:text-background"
const PILL_OFF =
  "border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground"

function DayPills({
  days,
  selected,
  onSelect,
  disabled,
}: {
  days: string[]
  selected: string
  onSelect: (day: string) => void
  disabled?: boolean
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {days.map((d) => {
        const { primary, secondary } = formatDatePill(d)
        const on = d === selected
        return (
          <button
            key={d}
            type="button"
            onClick={() => onSelect(d)}
            disabled={disabled}
            className={cn(
              PILL_BASE,
              "flex flex-col items-center justify-center px-4 py-2 text-sm",
              on ? PILL_ON : PILL_OFF,
            )}
          >
            <span className="font-medium leading-none capitalize">{primary}</span>
            {secondary && (
              <span
                className={cn(
                  "mt-0.5 text-xs leading-none",
                  on ? "text-background/70" : "text-muted-foreground",
                )}
              >
                {secondary}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export function TurnosHistorialContent({ snapshots, initialDetail }: Props) {
  const [detail, setDetail] = useState<SnapshotDetail | null>(initialDetail)
  const [isPending, startTransition] = useTransition()
  const [metric, setMetric] = useState<Metric>("drivers")
  const [zoneFilter, setZoneFilter] = useState<string>("all")
  const [shiftDay, setShiftDay] = useState<string>("")
  const [drawerCell, setDrawerCell] = useState<{
    zone: string
    hour: number
  } | null>(null)

  // Eje 1: la foto (cuándo se capturó). día -> hora -> snapshotId (la más reciente).
  const byDay = useMemo(() => {
    const m = new Map<string, Map<number, string>>()
    for (const s of snapshots) {
      let hm = m.get(s.localDate)
      if (!hm) {
        hm = new Map()
        m.set(s.localDate, hm)
      }
      if (!hm.has(s.localHour)) hm.set(s.localHour, s.id)
    }
    return m
  }, [snapshots])

  const captureDays = useMemo(() => [...byDay.keys()].sort(), [byDay])
  const selectedCaptureDay = detail?.localDate ?? captureDays[captureDays.length - 1] ?? ""
  const selectedCaptureHour = detail?.localHour ?? null
  const captureHours = useMemo(() => {
    const hm = byDay.get(selectedCaptureDay)
    return hm ? [...hm.keys()].sort((a, b) => a - b) : []
  }, [byDay, selectedCaptureDay])

  const selectSnapshot = (day: string, hour: number) => {
    const id = byDay.get(day)?.get(hour)
    if (!id || id === detail?.id) return
    startTransition(async () => {
      const res = await loadSnapshotDetail(id)
      if (!res.ok || !res.detail) {
        toast.error(res.error || "No se pudo cargar la foto")
        return
      }
      setDetail(res.detail)
      setDrawerCell(null)
    })
  }

  const handleCaptureDayChange = (day: string) => {
    const hm = byDay.get(day)
    if (!hm) return
    const hours = [...hm.keys()].sort((a, b) => a - b)
    const hour =
      selectedCaptureHour !== null && hm.has(selectedCaptureHour)
        ? selectedCaptureHour
        : hours[hours.length - 1]
    selectSnapshot(day, hour)
  }

  // Eje 2: el día del turno dentro de la foto (mismos filtros que Turnos). La foto
  // trae ayer..+7 relativo a su día de captura; recortamos a ese rango.
  const { shiftDates, effectiveShiftDay, relevantShifts } = useMemo(() => {
    if (!detail)
      return { shiftDates: [] as string[], effectiveShiftDay: "", relevantShifts: [] }
    const minD = addDaysIso(detail.localDate, -1)
    const maxD = addDaysIso(detail.localDate, 7)
    const rel = detail.shifts.filter((s) => s.dateIso >= minD && s.dateIso <= maxD)
    const ds = uniqueDates(rel)
    const today = todayInPyIso()
    const def = ds.includes(today)
      ? today
      : ds.includes(detail.localDate)
        ? detail.localDate
        : ds[0] || ""
    const eff = shiftDay && ds.includes(shiftDay) ? shiftDay : def
    return { shiftDates: ds, effectiveShiftDay: eff, relevantShifts: rel }
  }, [detail, shiftDay])

  const dayShifts = useMemo(
    () => shiftsForDate(relevantShifts, effectiveShiftDay),
    [relevantShifts, effectiveShiftDay],
  )
  const kpis = useMemo(() => computeKpis(dayShifts), [dayShifts])
  const drawerShifts = useMemo(() => {
    if (!drawerCell) return []
    return dayShifts.filter(
      (s) => s.zoneName === drawerCell.zone && coversSlot(s, drawerCell.hour),
    )
  }, [drawerCell, dayShifts])

  // Diff (vs hora anterior) acotado al día de turno que estás mirando.
  const diffsForDay = useMemo(
    () => (detail ? detail.diffs.filter((d) => d.dateIso === effectiveShiftDay) : []),
    [detail, effectiveShiftDay],
  )
  const diffZones = useMemo(
    () =>
      [...new Set(diffsForDay.map((d) => d.zoneName))].sort((a, b) =>
        a.localeCompare(b, "es"),
      ),
    [diffsForDay],
  )
  const visibleDiffs = useMemo(
    () =>
      zoneFilter === "all"
        ? diffsForDay
        : diffsForDay.filter((d) => d.zoneName === zoneFilter),
    [diffsForDay, zoneFilter],
  )

  const header = (
    <AdminHeader
      breadcrumbs={[
        { label: "Gestión Admin" },
        { label: "Turnos", href: "/admin/gestion/turnos" },
        { label: "Histórico" },
      ]}
    />
  )

  const titleBlock = (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
        Turnos · Histórico
      </h1>
      <p className="text-muted-foreground mt-1 text-sm sm:text-base">
        Cada foto (tomada automáticamente a la hora en punto) guarda las reservas
        de toda la semana. Elegí una foto y un día de turno para ver cuánto había
        reservado en ese momento y cómo varió respecto a la hora anterior.
      </p>
    </div>
  )

  if (!detail || captureDays.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        {header}
        <div className="w-full p-4 sm:p-6 lg:p-8 space-y-6">
          {titleBlock}
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            Todavía no hay fotos registradas. El cron las toma cada hora en
            punto; en cuanto corra la primera, vas a poder navegarlas acá.
          </div>
        </div>
      </div>
    )
  }

  const capturedAt = parseISO(detail.capturedAtIso)

  return (
    <div className="min-h-screen bg-background">
      {header}

      <div className="w-full p-4 sm:p-6 lg:p-8 space-y-6">
        {titleBlock}

        {/* Eje 1: foto registrada */}
        <div className="space-y-3 rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Foto registrada</h2>
            <span className="text-xs text-muted-foreground">
              {format(capturedAt, "d MMM HH:mm", { locale: es })} ·{" "}
              {detail.shiftCount} turnos {isPending && "· cargando…"}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-muted-foreground">Día</label>
            <DayPills
              days={captureDays}
              selected={selectedCaptureDay}
              onSelect={handleCaptureDayChange}
              disabled={isPending}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-muted-foreground">Hora</label>
            <div className="flex flex-wrap gap-1.5">
              {captureHours.map((h) => {
                const on = h === selectedCaptureHour
                return (
                  <button
                    key={h}
                    type="button"
                    onClick={() => selectSnapshot(selectedCaptureDay, h)}
                    disabled={isPending}
                    className={cn(
                      PILL_BASE,
                      "px-3 py-1.5 text-sm tabular-nums",
                      on ? PILL_ON : PILL_OFF,
                    )}
                  >
                    {h.toString().padStart(2, "0")}:00
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Eje 2: día del turno + métrica (mismos filtros que Turnos) */}
        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-muted-foreground">
              Día del turno
            </label>
            <DayPills
              days={shiftDates}
              selected={effectiveShiftDay}
              onSelect={setShiftDay}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Métrica</label>
            <Select value={metric} onValueChange={(v) => setMetric(v as Metric)}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(METRIC_LABELS) as [Metric, string][]).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <TurnosKpis kpis={kpis} />

        {dayShifts.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            Esta foto no tiene turnos para {effectiveShiftDay}.
          </div>
        ) : (
          <>
            <TurnosHeatmap
              shifts={dayShifts}
              hours={TURNOS_HOURS}
              metric={metric}
              onCellClick={(zone, hour) => setDrawerCell({ zone, hour })}
            />
            <TurnosHourlyChart shifts={dayShifts} hours={TURNOS_HOURS} />
          </>
        )}

        {/* Diff vs la hora anterior, para el día de turno elegido */}
        <section className="space-y-3 rounded-lg border bg-card p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold">
                Cambios vs la hora anterior
              </h2>
              <p className="text-xs text-muted-foreground">
                <span className="capitalize">{shortDay(effectiveShiftDay)}</span>
                {" — "}
                {prevPhrase(detail, capturedAt)}
              </p>
            </div>
            {diffZones.length > 0 && (
              <Select value={zoneFilter} onValueChange={setZoneFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las zonas</SelectItem>
                  {diffZones.map((z) => (
                    <SelectItem key={z} value={z}>
                      {z}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {!detail.hasPrev ? null : visibleDiffs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sin cambios en los turnos de este día respecto a la foto anterior.
            </p>
          ) : (
            <ul className="divide-y">
              {visibleDiffs.map((d) => (
                <li
                  key={d.shiftId}
                  className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-baseline sm:justify-between"
                >
                  <div className="min-w-0">
                    <span className="text-sm font-medium">
                      {fmtH(d.fromHour)}–{fmtH(d.toHour)}h
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {" · "}
                      {d.zoneName}
                    </span>
                    {(d.joined.length > 0 || d.left.length > 0) && (
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {d.joined.length > 0 && (
                          <span className="text-success">
                            altas:{" "}
                            {d.joined.map((j) => j.driverName || j.driverId).join(", ")}
                          </span>
                        )}
                        {d.joined.length > 0 && d.left.length > 0 && " · "}
                        {d.left.length > 0 && (
                          <span className="text-destructive">
                            bajas:{" "}
                            {d.left.map((l) => l.driverName || l.driverId).join(", ")}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <span className="shrink-0 text-sm font-medium tabular-nums">
                    {d.joined.length > 0 && (
                      <span className="text-success">+{d.joined.length}</span>
                    )}
                    {d.joined.length > 0 && d.left.length > 0 && " / "}
                    {d.left.length > 0 && (
                      <span className="text-destructive">−{d.left.length}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <TurnosShiftDrawer
        open={drawerCell !== null}
        onOpenChange={(v) => {
          if (!v) setDrawerCell(null)
        }}
        zone={drawerCell?.zone ?? null}
        hour={drawerCell?.hour ?? null}
        baseDateIso={effectiveShiftDay}
        shifts={drawerShifts}
        allDayShifts={dayShifts}
      />
    </div>
  )
}
