"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { format, formatDistanceToNow, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import {
  Activity,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  Filter,
  IdCard,
  Loader2,
  Mail,
  MapPin,
  Phone,
  PlayCircle,
  TimerOff,
  X,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"

import { AdminHeader } from "@/components/admin/admin-header"
import { DriverHoursHeatmap } from "@/components/admin/gestion/driver-hours-heatmap"
import { DriverOrdersByDayChart } from "@/components/admin/gestion/driver-orders-by-day-chart"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { processDriverDays } from "@/app/admin/gestion/drivers/[driverId]/actions"
import type { DriverStats } from "@/lib/types/driver-stats.types"

interface DriverInfo {
  driverId: string
  firstName: string | null
  lastName: string | null
  fullName: string | null
  documentNumber: string | null
  email: string | null
  phone: string | null
  phoneValidatedAtIso: string | null
  birthDateIso: string | null
  enabled: boolean
  createdAtRemoteIso: string | null
  updatedAtRemoteIso: string | null
  syncedAtIso: string
}

interface ProcessedInfo {
  processed: number
  total: number
  lastProcessedAtIso: string | null
}

interface Props {
  driverId: string
  driver: DriverInfo | null
  days: number
  stats?: DriverStats
  processed?: ProcessedInfo
}

const DAY_OPTIONS = [7, 15, 30, 60, 90]

export function DriverDetailContent({
  driverId,
  driver,
  days,
  stats,
  processed,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [isFilterPending, startFilterTransition] = useTransition()
  const [forceRefresh, setForceRefresh] = useState(false)
  const [processingMessage, setProcessingMessage] = useState<string | null>(null)

  if (!driver) {
    return (
      <div className="min-h-screen bg-background">
        <AdminHeader
          breadcrumbs={[
            { label: "Gestión Admin" },
            { label: "Drivers", href: "/admin/gestion/drivers" },
            { label: driverId.slice(0, 8) },
          ]}
        />
        <div className="w-full p-4 sm:p-6 lg:p-8 space-y-4">
          <Link
            href="/admin/gestion/drivers"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Volver
          </Link>
          <Alert variant="destructive">
            <AlertTitle>Driver no encontrado en cache</AlertTitle>
            <AlertDescription>
              Este driver no está en nuestra base de datos. Reintentá después del
              próximo sync diario, o forzá uno desde el cron.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  const handleProcess = () => {
    setProcessingMessage(
      forceRefresh
        ? `Reprocesando ${days} días desde la API de Monchis...`
        : `Trayendo días faltantes de los últimos ${days} días...`,
    )
    startTransition(async () => {
      const res = await processDriverDays(driverId, days, { forceRefresh })
      if (!res.ok) {
        setProcessingMessage(null)
        toast.error(res.error || "Error al procesar")
        return
      }
      router.refresh()
      const summary = `${res.fetched} días procesados${
        res.skipped ? ` · ${res.skipped} ya estaban` : ""
      }${res.errors ? ` · ${res.errors} con error` : ""}`
      toast.success(summary)
      // Limpiar el mensaje después de un tick — router.refresh() todavía
      // está pendiente.
      setTimeout(() => setProcessingMessage(null), 600)
    })
  }

  const updateParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") params.delete(key)
      else params.set(key, value)
    }
    startFilterTransition(() => {
      router.push(`/admin/gestion/drivers/${driverId}?${params.toString()}`)
    })
  }

  const handleDaysChange = (v: string) => {
    // Cambiar el periodo limpia los filtros (porque availableZones/Turns cambian)
    const params = new URLSearchParams()
    params.set("days", v)
    startFilterTransition(() => {
      router.push(`/admin/gestion/drivers/${driverId}?${params.toString()}`)
    })
  }

  const activeZone = stats?.appliedFilters?.zone
  const activeTurn = stats?.appliedFilters?.turn
  const hasActiveFilters = !!(activeZone || activeTurn)

  const displayName = driver.fullName || `${driver.firstName || ""} ${driver.lastName || ""}`.trim() || "Driver"
  const lastProcessed = processed?.lastProcessedAtIso
    ? formatDistanceToNow(parseISO(processed.lastProcessedAtIso), { addSuffix: true, locale: es })
    : null

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader
        breadcrumbs={[
          { label: "Gestión Admin" },
          { label: "Drivers", href: "/admin/gestion/drivers" },
          { label: displayName },
        ]}
      />

      <div className="w-full p-4 sm:p-6 lg:p-8 space-y-6">
        <Link
          href="/admin/gestion/drivers"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Volver al listado
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                {displayName}
              </h1>
              {driver.enabled ? (
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-900 hover:bg-emerald-100">
                  Habilitado
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-muted text-muted-foreground hover:bg-muted">
                  Deshabilitado
                </Badge>
              )}
            </div>
            <p className="text-xs font-mono text-muted-foreground">{driver.driverId}</p>
          </div>

        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div
                  className={
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-semibold " +
                    (driver.enabled
                      ? "bg-emerald-100 text-emerald-900"
                      : "bg-muted text-muted-foreground")
                  }
                >
                  {getInitials(displayName)}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Datos personales
                  </div>
                  <div className="text-sm font-medium truncate">{displayName}</div>
                </div>
              </div>

              <dl className="grid gap-2 text-sm">
                <DataRow icon={<IdCard className="h-3.5 w-3.5" />} label="Cédula">
                  <span className="tabular-nums">{driver.documentNumber || "—"}</span>
                </DataRow>
                <DataRow icon={<Phone className="h-3.5 w-3.5" />} label="Teléfono">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {driver.phone ? (
                      <a
                        href={`tel:${driver.phone}`}
                        className="text-primary hover:underline truncate"
                      >
                        {driver.phone}
                      </a>
                    ) : (
                      "—"
                    )}
                    {driver.phoneValidatedAtIso && (
                      <span
                        title={`Validado ${format(parseISO(driver.phoneValidatedAtIso), "d MMM yyyy", { locale: es })}`}
                        className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                </DataRow>
                <DataRow icon={<Mail className="h-3.5 w-3.5" />} label="Email">
                  {driver.email ? (
                    <a
                      href={`mailto:${driver.email}`}
                      className="text-primary hover:underline truncate inline-block max-w-full"
                    >
                      {driver.email}
                    </a>
                  ) : (
                    "—"
                  )}
                </DataRow>
                {driver.birthDateIso && (
                  <DataRow
                    icon={<CalendarDays className="h-3.5 w-3.5" />}
                    label="Nacimiento"
                  >
                    {format(parseISO(driver.birthDateIso), "d MMM yyyy", { locale: es })}
                  </DataRow>
                )}
                {driver.createdAtRemoteIso && (
                  <DataRow
                    icon={<CalendarDays className="h-3.5 w-3.5" />}
                    label="Driver desde"
                  >
                    {format(parseISO(driver.createdAtRemoteIso), "d MMM yyyy", { locale: es })}
                  </DataRow>
                )}
              </dl>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between gap-2 text-base">
                <span className="inline-flex items-center gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  Procesamiento de actividad
                </span>
                {lastProcessed && (
                  <span className="text-xs font-normal text-muted-foreground">
                    Última vez: {lastProcessed}
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                Trae los turnos y pedidos del driver desde la API de Monchis y los
                guarda en nuestra DB para analizar.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Periodo
                  </label>
                  <Select value={String(days)} onValueChange={handleDaysChange}>
                    <SelectTrigger className="w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAY_OPTIONS.map((d) => (
                        <SelectItem key={d} value={String(d)}>
                          Últimos {d} días
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <label className="inline-flex items-center gap-2 text-xs text-muted-foreground pb-2">
                  <input
                    type="checkbox"
                    checked={forceRefresh}
                    onChange={(e) => setForceRefresh(e.target.checked)}
                    className="rounded"
                  />
                  Reprocesar días ya guardados
                </label>

                <Button
                  onClick={handleProcess}
                  disabled={isPending}
                  className="gap-2 ml-auto"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <PlayCircle className="h-4 w-4" />
                  )}
                  {isPending ? "Procesando..." : `Procesar ${days} días`}
                </Button>
              </div>

              {processed && (
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground tabular-nums">
                    {processed.processed}
                  </span>{" "}
                  de {processed.total} días con datos guardados.
                  {processed.processed === 0 && !isPending && (
                    <span className="ml-2 text-amber-700">
                      Apretá "Procesar" para traer los datos.
                    </span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {isPending && processingMessage ? (
          <ProcessingPanel message={processingMessage} days={days} />
        ) : stats ? (
          <>
            {(stats.availableZones.length > 0 || hasActiveFilters) && (
              <FiltersBar
                stats={stats}
                isPending={isFilterPending}
                onZoneChange={(z) => updateParams({ zone: z })}
                onTurnChange={(t) => updateParams({ turn: t })}
                onClear={() => updateParams({ zone: null, turn: null })}
              />
            )}
            <StatsSection stats={stats} days={days} processed={processed?.processed ?? 0} />
          </>
        ) : null}
      </div>
    </div>
  )
}

function DataRow({
  icon,
  label,
  children,
}: {
  icon?: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-baseline gap-2 border-b border-border/50 pb-1.5 last:border-0 last:pb-0">
      {icon && <span className="text-muted-foreground shrink-0">{icon}</span>}
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground w-24 shrink-0">
        {label}
      </dt>
      <dd className="font-medium truncate min-w-0 flex-1 text-right">{children}</dd>
    </div>
  )
}

function getInitials(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return "—"
  const parts = trimmed.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function StatsSection({
  stats,
  days,
  processed,
}: {
  stats: DriverStats
  days: number
  processed: number
}) {
  const noData = processed === 0

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Insights · últimos {days} días</h2>
        {noData && (
          <p className="text-xs text-muted-foreground">
            Aún no procesamos datos para este periodo. Los KPIs van a estar en cero.
          </p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={<Activity className="h-4 w-4" />}
          label="Pedidos totales"
          value={stats.totalRequests.toLocaleString("es-AR")}
          description={`${stats.daysWithActivity} día${stats.daysWithActivity === 1 ? "" : "s"} con actividad`}
        />
        <KpiCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Aceptados"
          value={`${stats.acceptedRequests} (${formatPct(stats.acceptedPct)})`}
          description={`${stats.finalizedRequests} finalizados`}
          variant="emerald"
        />
        <KpiCard
          icon={<XCircle className="h-4 w-4" />}
          label="No tomados"
          value={`${stats.notTakenRequests} (${formatPct(stats.notTakenPct)})`}
          variant={stats.notTakenPct > 0.3 ? "rose" : undefined}
        />
        <KpiCard
          icon={<TimerOff className="h-4 w-4" />}
          label="Sesiones de turno"
          value={String(stats.totalSessions)}
          description={`${(stats.totalSessions / Math.max(1, stats.daysWithActivity)).toFixed(1)} por día`}
        />
      </div>

      <DriverOrdersByDayChart data={stats.ordersByDay} />

      <WeekdaysCard stats={stats} />

      <DriverHoursHeatmap heatmap={stats.hourlyHeatmap} hours={stats.heatmapHours} />

      <div className="grid gap-4 lg:grid-cols-2">
        <BreakdownCard
          icon={<MapPin className="h-4 w-4" />}
          title="Zonas donde toma turnos"
          highlight={stats.primaryZone?.name}
          items={stats.zoneBreakdown}
          totalSessions={stats.totalSessions}
        />
        <BreakdownCard
          icon={<Clock className="h-4 w-4" />}
          title="Turnos que suele tomar"
          highlight={stats.primaryTurn?.name}
          items={stats.turnBreakdown}
          totalSessions={stats.totalSessions}
        />
      </div>
    </div>
  )
}

function FiltersBar({
  stats,
  isPending,
  onZoneChange,
  onTurnChange,
  onClear,
}: {
  stats: DriverStats
  isPending: boolean
  onZoneChange: (zone: string | null) => void
  onTurnChange: (turn: string | null) => void
  onClear: () => void
}) {
  const activeZone = stats.appliedFilters.zone
  const activeTurn = stats.appliedFilters.turn
  const hasActive = !!(activeZone || activeTurn)

  return (
    <div className="rounded-lg border bg-card px-3 py-2.5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="inline-flex items-center gap-1.5 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
          Filtros
        </div>

        <div className="space-y-1">
          <label className="block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Zona
          </label>
          <Select
            value={activeZone ?? "__all"}
            onValueChange={(v) => onZoneChange(v === "__all" ? null : v)}
          >
            <SelectTrigger className="h-8 w-[200px]" disabled={isPending}>
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Todas</SelectItem>
              {stats.availableZones.map((z) => (
                <SelectItem key={z} value={z}>
                  {z}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Turno
          </label>
          <Select
            value={activeTurn ?? "__all"}
            onValueChange={(v) => onTurnChange(v === "__all" ? null : v)}
          >
            <SelectTrigger className="h-8 w-[260px]" disabled={isPending}>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Todos</SelectItem>
              {stats.availableTurns.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {hasActive && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            disabled={isPending}
            className="gap-1 text-xs h-8"
          >
            <X className="h-3.5 w-3.5" />
            Limpiar
          </Button>
        )}

        {isPending && (
          <span className="inline-flex items-center gap-1.5 pb-2 text-xs text-muted-foreground ml-auto">
            <Loader2 className="h-3 w-3 animate-spin" />
            Aplicando...
          </span>
        )}
      </div>
    </div>
  )
}

function ProcessingPanel({ message, days }: { message: string; days: number }) {
  return (
    <Card className="border-dashed">
      <CardContent className="py-10 flex flex-col items-center justify-center gap-3 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <div className="space-y-1">
          <p className="font-medium">{message}</p>
          <p className="text-xs text-muted-foreground">
            Cada día son ~1-2s contra la API. Esto puede tardar entre {Math.ceil(days * 0.3)}s y {Math.ceil(days * 0.6)}s.
          </p>
        </div>
        <div className="grid gap-2 w-full max-w-md mt-2">
          <SkeletonStrip />
          <SkeletonStrip />
          <SkeletonStrip />
        </div>
      </CardContent>
    </Card>
  )
}

function SkeletonStrip() {
  return <div className="h-3 rounded-full bg-muted animate-pulse" />
}

function WeekdaysCard({ stats }: { stats: DriverStats }) {
  const maxSessions = Math.max(1, ...stats.weekdayBreakdown.map((w) => w.sessions))
  const totalSessions = stats.weekdayBreakdown.reduce((a, w) => a + w.sessions, 0)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          Días en los que toma turnos
        </CardTitle>
        <CardDescription>
          {stats.primaryWeekday ? (
            <>
              Día principal:{" "}
              <strong className="text-foreground">{stats.primaryWeekday.label}</strong>{" "}
              ({stats.primaryWeekday.sessions} sesión
              {stats.primaryWeekday.sessions === 1 ? "" : "es"})
            </>
          ) : (
            "Sin actividad en el periodo."
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2">
          {stats.weekdayBreakdown.map((w) => {
            const intensity = w.sessions / maxSessions
            const isPrimary = stats.primaryWeekday?.iso === w.iso && w.sessions > 0
            return (
              <div
                key={w.iso}
                className={
                  "rounded-md border p-2 text-center " +
                  (isPrimary ? "border-foreground bg-foreground text-background" : "")
                }
                style={{
                  backgroundColor: !isPrimary && w.sessions > 0
                    ? `hsl(212, 75%, ${92 - intensity * 36}%)`
                    : undefined,
                }}
              >
                <div className="text-[10px] uppercase tracking-wide opacity-70">
                  {w.label}
                </div>
                <div className="text-lg font-bold tabular-nums leading-tight">
                  {w.sessions}
                </div>
                <div className="text-[10px] opacity-70 tabular-nums">
                  {w.hoursWorked > 0 ? `${w.hoursWorked}h` : "—"}
                </div>
                <div className="text-[10px] opacity-70 tabular-nums">
                  {w.ordersCount > 0 ? `${w.ordersCount} ped.` : ""}
                </div>
              </div>
            )
          })}
        </div>
        {totalSessions === 0 && (
          <p className="mt-3 text-xs text-muted-foreground">
            Procesá días primero para ver actividad por jornada.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function formatPct(p: number): string {
  if (!p && p !== 0) return "—"
  return `${Math.round(p * 100)}%`
}

function KpiCard({
  icon,
  label,
  value,
  description,
  variant,
}: {
  icon: React.ReactNode
  label: string
  value: string
  description?: string
  variant?: "emerald" | "rose"
}) {
  const cardClass =
    variant === "emerald"
      ? "border-emerald-200 bg-emerald-50/40"
      : variant === "rose"
        ? "border-rose-200 bg-rose-50/40"
        : ""
  return (
    <Card className={cardClass}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5">
        <CardTitle className="text-xs font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <span className="text-muted-foreground">{icon}</span>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        {description && (
          <CardDescription className="mt-0.5 text-[11px]">
            {description}
          </CardDescription>
        )}
      </CardContent>
    </Card>
  )
}

function BreakdownCard({
  icon,
  title,
  highlight,
  items,
  totalSessions,
}: {
  icon: React.ReactNode
  title: string
  highlight?: string
  items: { name: string; sessions: number }[]
  totalSessions: number
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
        </CardTitle>
        {highlight ? (
          <CardDescription>
            Principal: <strong className="text-foreground">{highlight}</strong>
          </CardDescription>
        ) : (
          <CardDescription>Sin datos en el periodo.</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {items.length === 0 ? null : (
          <ul className="space-y-1.5">
            {items.slice(0, 6).map((it) => {
              const pct = totalSessions > 0 ? it.sessions / totalSessions : 0
              return (
                <li key={it.name} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate">{it.name}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {it.sessions} · {Math.round(pct * 100)}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.max(2, pct * 100)}%` }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
