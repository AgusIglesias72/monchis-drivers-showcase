"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group"
import { format, formatDistanceToNow, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import {
  ArrowRight,
  Bike,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  IdCard,
  Mail,
  Phone,
  Search,
  ShieldCheck,
  X,
} from "lucide-react"

import { AdminHeader } from "@/components/admin/admin-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface DriverRow {
  driverId: string
  firstName: string | null
  lastName: string | null
  fullName: string | null
  documentNumber: string | null
  email: string | null
  phone: string | null
  enabled: boolean
  updatedAtRemote: string | null
  syncedAt: string
  attendanceLastProcessedAt: string | null
  ordersCount30d: number
  acceptedOrders30d: number
  sessions30d: number
  daysWithActivity30d: number
  hoursWorked30d: number
  primaryZone30d: string | null
  primaryTurn30d: string | null
}

interface Props {
  drivers: DriverRow[]
  total: number
  page: number
  pageSize: number
  query: string
  enabledFilter: string // "all" | "true" | "false"
  lastSyncAtIso: string | null
  enabledCount: number
  disabledCount: number
  createdFrom: string
  createdTo: string
}

const FILTER_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "true", label: "Habilitados" },
  { value: "false", label: "Deshabilitados" },
]

export function DriversListContent({
  drivers,
  total,
  page,
  pageSize,
  query,
  enabledFilter,
  lastSyncAtIso,
  enabledCount,
  disabledCount,
  createdFrom,
  createdTo,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [inputValue, setInputValue] = useState(query)
  const [createdFromInput, setCreatedFromInput] = useState(createdFrom)
  const [createdToInput, setCreatedToInput] = useState(createdTo)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const updateParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") params.delete(key)
      else params.set(key, value)
    }
    if (!("page" in updates)) params.delete("page")
    startTransition(() => {
      router.push(`/admin/gestion/drivers?${params.toString()}`)
    })
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    updateParams({
      q: inputValue.trim() || null,
      createdFrom: createdFromInput || null,
      createdTo: createdToInput || null,
    })
  }

  const hasDateFilter = createdFrom || createdTo

  const toggleExpanded = (driverId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(driverId)) next.delete(driverId)
      else next.add(driverId)
      return next
    })
  }

  const lastSync = lastSyncAtIso
    ? formatDistanceToNow(parseISO(lastSyncAtIso), { addSuffix: true, locale: es })
    : null

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader
        breadcrumbs={[
          { label: "Gestión Admin" },
          { label: "Drivers", href: "/admin/gestion/drivers" },
        ]}
      />

      <div className="w-full p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Drivers</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Catálogo completo de drivers de Monchis. Click en uno para ver su
              actividad y procesar sus últimos N días.
            </p>
          </div>
          {lastSync && (
            <div className="text-xs text-muted-foreground">
              Sync de drivers {lastSync}
            </div>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <KpiPill label="Total" value={enabledCount + disabledCount} />
          <KpiPill label="Habilitados" value={enabledCount} variant="emerald" />
          <KpiPill label="Deshabilitados" value={disabledCount} variant="rose" />
        </div>

        <Card>
          <CardContent className="p-4 space-y-4">
            <form onSubmit={handleSearch} className="space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1 block">
                    Buscar
                  </label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder="Nombre, cédula, teléfono o email"
                      className="pl-8"
                    />
                    {inputValue && (
                      <button
                        type="button"
                        onClick={() => {
                          setInputValue("")
                          updateParams({ q: null })
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1 block">
                    Driver desde
                  </label>
                  <Input
                    type="date"
                    value={createdFromInput}
                    onChange={(e) => setCreatedFromInput(e.target.value)}
                    className="w-[150px]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1 block">
                    Hasta
                  </label>
                  <Input
                    type="date"
                    value={createdToInput}
                    onChange={(e) => setCreatedToInput(e.target.value)}
                    className="w-[150px]"
                  />
                </div>

                <Button type="submit" disabled={isPending}>
                  Aplicar
                </Button>
                {hasDateFilter && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setCreatedFromInput("")
                      setCreatedToInput("")
                      updateParams({ createdFrom: null, createdTo: null })
                    }}
                    disabled={isPending}
                  >
                    Limpiar fechas
                  </Button>
                )}
              </div>
            </form>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground block">
                Estado
              </label>
              <RadioGroupPrimitive.Root
                value={enabledFilter}
                onValueChange={(v) =>
                  updateParams({ enabled: v === "all" ? null : v })
                }
                className="flex flex-wrap gap-2"
              >
                {FILTER_OPTIONS.map((opt) => {
                  const isSelected = enabledFilter === opt.value
                  return (
                    <RadioGroupPrimitive.Item
                      key={opt.value}
                      value={opt.value}
                      className={cn(
                        "rounded-md border px-3.5 py-1.5 text-sm transition-colors outline-none",
                        "hover:bg-accent hover:text-accent-foreground",
                        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        isSelected
                          ? "border-foreground bg-foreground text-background hover:bg-foreground hover:text-background"
                          : "border-border bg-background text-foreground",
                      )}
                    >
                      {opt.label}
                    </RadioGroupPrimitive.Item>
                  )
                })}
              </RadioGroupPrimitive.Root>
            </div>
          </CardContent>
        </Card>

        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="px-2 py-2 w-10"></th>
                  <th className="px-4 py-2 font-medium">Nombre</th>
                  <th className="px-4 py-2 font-medium">Cédula</th>
                  <th className="px-4 py-2 font-medium">Teléfono</th>
                  <th className="px-4 py-2 font-medium">Pedidos 30d</th>
                  <th className="px-4 py-2 font-medium">Aceptación</th>
                  <th className="px-4 py-2 font-medium">Estado</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {drivers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-8 text-center text-sm text-muted-foreground"
                    >
                      Sin resultados.
                    </td>
                  </tr>
                ) : (
                  drivers.map((d) => {
                    const isExpanded = expanded.has(d.driverId)
                    const displayName =
                      d.fullName ||
                      `${d.firstName || ""} ${d.lastName || ""}`.trim() ||
                      "—"
                    return (
                      <DriverRowFragment
                        key={d.driverId}
                        driver={d}
                        displayName={displayName}
                        isExpanded={isExpanded}
                        onToggle={() => toggleExpanded(d.driverId)}
                      />
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t bg-muted/30 px-4 py-2 text-xs">
              <span>
                Página {page} de {totalPages} · {total} resultados
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1 || isPending}
                  onClick={() => updateParams({ page: String(page - 1) })}
                >
                  Anterior
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages || isPending}
                  onClick={() => updateParams({ page: String(page + 1) })}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function acceptedPct(d: DriverRow): number {
  if (!d.ordersCount30d) return 0
  return d.acceptedOrders30d / d.ordersCount30d
}

function DriverRowFragment({
  driver: d,
  displayName,
  isExpanded,
  onToggle,
}: {
  driver: DriverRow
  displayName: string
  isExpanded: boolean
  onToggle: () => void
}) {
  const pct = acceptedPct(d)
  const hasStats = d.attendanceLastProcessedAt !== null

  return (
    <>
      <tr
        className={cn(
          "border-t cursor-pointer hover:bg-muted/30",
          isExpanded && "bg-muted/30",
        )}
        onClick={onToggle}
      >
        <td className="px-2 py-2.5 w-10">
          <button
            type="button"
            aria-label={isExpanded ? "Colapsar" : "Expandir"}
            className="text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation()
              onToggle()
            }}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        </td>
        <td className="px-4 py-2.5">
          <div className="font-medium">{displayName}</div>
          <div className="text-[10px] text-muted-foreground font-mono">
            {d.driverId}
          </div>
        </td>
        <td className="px-4 py-2.5 tabular-nums">{d.documentNumber || "—"}</td>
        <td className="px-4 py-2.5">{d.phone || "—"}</td>
        <td className="px-4 py-2.5 tabular-nums">
          {hasStats ? (
            d.ordersCount30d
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </td>
        <td className="px-4 py-2.5 tabular-nums">
          {hasStats && d.ordersCount30d > 0 ? (
            <span
              className={cn(
                "font-medium",
                pct >= 0.7
                  ? "text-emerald-700"
                  : pct >= 0.4
                    ? "text-amber-700"
                    : "text-rose-700",
              )}
            >
              {Math.round(pct * 100)}%
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </td>
        <td className="px-4 py-2.5">
          {d.enabled ? (
            <Badge
              variant="secondary"
              className="bg-emerald-100 text-emerald-900 hover:bg-emerald-100"
            >
              Habilitado
            </Badge>
          ) : (
            <Badge
              variant="secondary"
              className="bg-muted text-muted-foreground hover:bg-muted"
            >
              Deshabilitado
            </Badge>
          )}
        </td>
        <td className="px-4 py-2.5">
          <Link
            href={`/admin/gestion/drivers/${d.driverId}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-primary hover:underline whitespace-nowrap"
          >
            Ver
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </td>
      </tr>

      {isExpanded && (
        <tr className="border-t bg-muted/10">
          <td colSpan={8} className="px-6 py-4 space-y-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Datos personales
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <ExpandedField icon={<IdCard className="h-3.5 w-3.5" />} label="Cédula">
                  <span className="tabular-nums">{d.documentNumber || "—"}</span>
                </ExpandedField>
                <ExpandedField icon={<Phone className="h-3.5 w-3.5" />} label="Teléfono">
                  {d.phone ? (
                    <a
                      href={`tel:${d.phone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-primary hover:underline"
                    >
                      {d.phone}
                    </a>
                  ) : (
                    "—"
                  )}
                </ExpandedField>
                <ExpandedField icon={<Mail className="h-3.5 w-3.5" />} label="Email">
                  {d.email ? (
                    <a
                      href={`mailto:${d.email}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-primary hover:underline truncate inline-block max-w-full"
                    >
                      {d.email}
                    </a>
                  ) : (
                    "—"
                  )}
                </ExpandedField>
                <ExpandedField
                  icon={<CalendarDays className="h-3.5 w-3.5" />}
                  label="Update remoto"
                >
                  {d.updatedAtRemote
                    ? format(parseISO(d.updatedAtRemote), "d MMM yyyy", { locale: es })
                    : "—"}
                </ExpandedField>
                <ExpandedField
                  icon={<ShieldCheck className="h-3.5 w-3.5" />}
                  label="Estado"
                >
                  {d.enabled ? (
                    <span className="text-emerald-700 font-medium">Habilitado</span>
                  ) : (
                    <span className="text-muted-foreground">Deshabilitado</span>
                  )}
                </ExpandedField>
                <ExpandedField icon={<Bike className="h-3.5 w-3.5" />} label="ID Monchis">
                  <span className="font-mono text-[10px] break-all">{d.driverId}</span>
                </ExpandedField>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Performance últimos 30 días
                </div>
                {d.attendanceLastProcessedAt && (
                  <div className="text-[10px] text-muted-foreground">
                    Procesado{" "}
                    {formatDistanceToNow(parseISO(d.attendanceLastProcessedAt), {
                      addSuffix: true,
                      locale: es,
                    })}
                  </div>
                )}
              </div>
              {!hasStats ? (
                <div className="rounded-md border border-dashed bg-muted/20 px-3 py-3 text-xs text-muted-foreground">
                  Aún no procesamos actividad para este driver. El cron horario lo
                  va a tomar en su próxima rotación, o podés procesarlo manualmente
                  desde su detalle.
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-4">
                  <StatCell label="Pedidos" value={d.ordersCount30d} />
                  <StatCell
                    label="Aceptación"
                    value={
                      d.ordersCount30d > 0 ? `${Math.round(pct * 100)}%` : "—"
                    }
                    sub={`${d.acceptedOrders30d}/${d.ordersCount30d}`}
                  />
                  <StatCell
                    label="Sesiones"
                    value={d.sessions30d}
                    sub={`${d.daysWithActivity30d} días con actividad`}
                  />
                  <StatCell
                    label="Horas"
                    value={d.hoursWorked30d > 0 ? `${Math.round(d.hoursWorked30d)}h` : "—"}
                  />
                  <StatCell
                    label="Zona principal"
                    value={d.primaryZone30d || "—"}
                    span2
                  />
                  <StatCell
                    label="Turno principal"
                    value={d.primaryTurn30d || "—"}
                    span2
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Link
                href={`/admin/gestion/drivers/${d.driverId}`}
                onClick={(e) => e.stopPropagation()}
              >
                <Button size="sm" variant="default" className="gap-2">
                  Ver actividad y procesar
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function StatCell({
  label,
  value,
  sub,
  span2,
}: {
  label: string
  value: number | string
  sub?: string
  span2?: boolean
}) {
  return (
    <div
      className={cn(
        "rounded-md border bg-card p-2.5 space-y-0.5",
        span2 && "md:col-span-2",
      )}
    >
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="text-base font-semibold tabular-nums truncate">
        {value}
      </div>
      {sub && (
        <div className="text-[10px] text-muted-foreground tabular-nums">
          {sub}
        </div>
      )}
    </div>
  )
}

function ExpandedField({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-md border bg-card p-2.5 space-y-1">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="text-sm font-medium truncate">{children}</div>
    </div>
  )
}

function KpiPill({
  label,
  value,
  variant,
}: {
  label: string
  value: number
  variant?: "emerald" | "rose"
}) {
  const colors =
    variant === "emerald"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : variant === "rose"
        ? "border-rose-200 bg-rose-50 text-rose-900"
        : "border-border bg-card"
  return (
    <div className={`rounded-lg border p-3 ${colors}`}>
      <div className="text-[10px] uppercase tracking-wide font-medium opacity-70">
        <Bike className="inline h-3 w-3 mr-1" />
        {label}
      </div>
      <div className="text-2xl font-bold tabular-nums mt-0.5">
        {value.toLocaleString("es-AR")}
      </div>
    </div>
  )
}
