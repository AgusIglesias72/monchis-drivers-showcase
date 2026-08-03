"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { AdminHeader } from "@/components/admin/admin-header"
import { TurnosFilters } from "@/components/admin/gestion/turnos-filters"
import { TurnosKpis } from "@/components/admin/gestion/turnos-kpis"
import { TurnosHeatmap } from "@/components/admin/gestion/turnos-heatmap"
import { TurnosHourlyChart } from "@/components/admin/gestion/turnos-hourly-chart"
import { TurnosShiftDrawer } from "@/components/admin/gestion/turnos-shift-drawer"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { loadComparison, refreshTurnos } from "@/app/admin/gestion/turnos/actions"
import { TURNOS_CONFIG, TURNOS_HOURS } from "@/lib/config/turnos.config"
import {
  computeKpis,
  coversSlot,
  shiftsForDate,
  uniqueDates,
} from "@/lib/services/turnos-aggregate"
import type {
  CompareMode,
  ComparisonData,
  FlattenedShift,
  Metric,
} from "@/lib/types/turnos.types"
import { todayInPyIso } from "@/lib/utils/turnos-dates"
import { AlertTriangle } from "lucide-react"

interface Props {
  initialShifts: FlattenedShift[]
  fetchedAtIso: string
  errors: { zoneId: string; message: string }[]
  availableWeeks: number[]
}

function shiftDateInPyIso(offsetDays: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + offsetDays)
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TURNOS_CONFIG.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d)
}

export function TurnosDashboard({ initialShifts, fetchedAtIso, errors, availableWeeks }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // La API mezcla turnos huérfanos en fechas extrañas (Ene/Feb 2029 vimos):
  // probablemente plantillas/test data. Recortamos al rango operativo: ayer
  // hasta +7 días.
  const minDate = shiftDateInPyIso(-1)
  const maxDate = shiftDateInPyIso(7)
  const relevantShifts = useMemo(
    () => initialShifts.filter((s) => s.dateIso >= minDate && s.dateIso <= maxDate),
    [initialShifts, minDate, maxDate],
  )

  const dates = useMemo(() => uniqueDates(relevantShifts), [relevantShifts])
  const today = todayInPyIso()
  const defaultDate = dates.includes(today) ? today : dates[0] || today

  const [selectedDate, setSelectedDate] = useState<string>(defaultDate)
  const [metric, setMetric] = useState<Metric>("drivers")
  const [drawerCell, setDrawerCell] = useState<{ zone: string; hour: number } | null>(
    null,
  )
  // Comparación con W-N. null = sin comparación; el modo decide qué representa
  // el X/Y gris debajo de cada celda (Final = foto de esa hora; Run rate = foto
  // tomada al mismo punto del ciclo).
  const [compareWeeksBack, setCompareWeeksBack] = useState<number | null>(null)
  const [compareMode, setCompareMode] = useState<CompareMode>("runrate")
  const [comparison, setComparison] = useState<ComparisonData | null>(null)
  const [comparisonLoading, setComparisonLoading] = useState(false)

  // Run rate sólo tiene sentido para turnos a futuro (incluyendo hoy): para
  // días pasados el lead-time es negativo y termina leyendo data post-shift.
  const runRateAllowed = selectedDate >= today

  useEffect(() => {
    if (!runRateAllowed && compareMode === "runrate") {
      setCompareMode("final")
    }
  }, [runRateAllowed, compareMode])

  useEffect(() => {
    if (compareWeeksBack === null) {
      setComparison(null)
      return
    }
    let cancelled = false
    setComparisonLoading(true)
    loadComparison({
      mode: compareMode,
      weeksBack: compareWeeksBack,
      selectedDate,
    })
      .then((res) => {
        if (cancelled) return
        if (res.ok && res.data) setComparison(res.data)
        else {
          setComparison(null)
          if (res.error) toast.error(res.error)
        }
      })
      .finally(() => {
        if (!cancelled) setComparisonLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [compareWeeksBack, compareMode, selectedDate])

  const dayShifts = useMemo(
    () => shiftsForDate(relevantShifts, selectedDate),
    [relevantShifts, selectedDate],
  )
  const kpis = useMemo(() => computeKpis(dayShifts), [dayShifts])

  const drawerShifts = useMemo(() => {
    if (!drawerCell) return []
    return dayShifts.filter(
      (s) => s.zoneName === drawerCell.zone && coversSlot(s, drawerCell.hour),
    )
  }, [drawerCell, dayShifts])

  const handleRefresh = () => {
    startTransition(async () => {
      const res = await refreshTurnos()
      if (!res.ok) {
        toast.error(res.error || "No se pudo actualizar")
        return
      }
      router.refresh()
      toast.success("Datos actualizados")
    })
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader
        breadcrumbs={[
          { label: "Gestión Admin" },
          { label: "Turnos", href: "/admin/gestion/turnos" },
        ]}
      />

      <div className="w-full p-4 sm:p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Turnos</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Panel en vivo de turnos por zona y franja horaria.
          </p>
        </div>

        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Datos parciales</AlertTitle>
            <AlertDescription>
              No se pudo traer datos de {errors.length} zona{errors.length > 1 ? "s" : ""}. La vista
              puede estar incompleta.
            </AlertDescription>
          </Alert>
        )}

        <TurnosFilters
          dates={dates}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          metric={metric}
          onMetricChange={setMetric}
          fetchedAtIso={fetchedAtIso}
          isRefreshing={isPending}
          onRefresh={handleRefresh}
          availableWeeks={availableWeeks}
          compareWeeksBack={compareWeeksBack}
          onCompareWeeksBackChange={setCompareWeeksBack}
          compareMode={compareMode}
          onCompareModeChange={setCompareMode}
          comparisonLoading={comparisonLoading}
          runRateAllowed={runRateAllowed}
        />

        <TurnosKpis
          kpis={kpis}
          comparison={comparison}
          comparisonLoading={comparisonLoading}
          compareMode={compareMode}
          compareWeeksBack={compareWeeksBack}
        />

        {dayShifts.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            No hay turnos para {selectedDate}.
          </div>
        ) : (
          <>
            <TurnosHeatmap
              shifts={dayShifts}
              hours={TURNOS_HOURS}
              metric={metric}
              onCellClick={(zone, hour) => setDrawerCell({ zone, hour })}
              comparison={comparison}
              comparisonLoading={comparisonLoading}
            />
            <TurnosHourlyChart
              shifts={dayShifts}
              hours={TURNOS_HOURS}
              selectedDate={selectedDate}
              availableWeeks={availableWeeks}
            />
          </>
        )}
      </div>

      <TurnosShiftDrawer
        open={drawerCell !== null}
        onOpenChange={(v) => {
          if (!v) setDrawerCell(null)
        }}
        zone={drawerCell?.zone ?? null}
        hour={drawerCell?.hour ?? null}
        baseDateIso={selectedDate}
        shifts={drawerShifts}
        allDayShifts={dayShifts}
      />
    </div>
  )
}
