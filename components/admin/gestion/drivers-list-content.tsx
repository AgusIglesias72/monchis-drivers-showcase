"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group"
import { format, formatDistanceToNow, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Bike,
  CalendarDays,
  Check,
  ChevronRight,
  Clock,
  IdCard,
  Mail,
  Package,
  Phone,
  Search,
  ShieldCheck,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
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
  sort: string
  order: "asc" | "desc"
}

const FILTER_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "true", label: "Habilitados" },
  { value: "false", label: "Deshabilitados" },
]

const SORT_OPTIONS = [
  { value: "orders", label: "Pedidos 30d" },
  { value: "accepted", label: "Aceptados 30d" },
  { value: "sessions", label: "Sesiones 30d" },
  { value: "hours", label: "Horas 30d" },
  { value: "days", label: "Días activos 30d" },
  { value: "name", label: "Nombre" },
  { value: "enabled", label: "Estado" },
]

const SORT_DEFAULT_ORDER: Record<string, "asc" | "desc"> = {
  orders: "desc",
  accepted: "desc",
  sessions: "desc",
  hours: "desc",
  days: "desc",
  enabled: "desc",
  name: "asc",
}

function displayNameOf(d: DriverRow): string {
  return (
    d.fullName ||
    `${d.firstName || ""} ${d.lastName || ""}`.trim() ||
    "—"
  )
}

function initialsOf(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "—"
}

function acceptedPct(d: DriverRow): number {
  if (!d.ordersCount30d) return 0
  return d.acceptedOrders30d / d.ordersCount30d
}

function pctTone(pct: number): string {
  return pct >= 0.7 ? "text-success" : pct >= 0.4 ? "text-warning" : "text-destructive"
}

// Chip neutro para métricas (mono) o etiquetas.
function Chip({
  children,
  mono,
  icon: Icon,
  tone,
}: {
  children: React.ReactNode
  mono?: boolean
  icon?: typeof Clock
  tone?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px]",
        mono ? "font-[family-name:var(--font-mono)]" : "",
        tone ?? (mono ? "text-foreground" : "text-muted-foreground"),
      )}
    >
      {Icon && <Icon className="size-3 text-ink-subtle" />}
      {children}
    </span>
  )
}

function StatusPill({ enabled }: { enabled: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
        enabled ? "bg-success-soft text-success" : "bg-muted text-muted-foreground",
      )}
    >
      {enabled ? "Habilitado" : "Deshabilitado"}
    </span>
  )
}

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
  sort,
  order,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [inputValue, setInputValue] = useState(query)
  const [createdFromInput, setCreatedFromInput] = useState(createdFrom)
  const [createdToInput, setCreatedToInput] = useState(createdTo)
  const [selected, setSelected] = useState<DriverRow | null>(null)

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

  const handleSortClick = (value: string) => {
    if (value === sort) {
      const next = order === "desc" ? "asc" : "desc"
      const defaultOrder = SORT_DEFAULT_ORDER[value]
      updateParams({ sort: value, order: next === defaultOrder ? null : next })
    } else {
      updateParams({ sort: value, order: null })
    }
  }

  const lastSync = lastSyncAtIso
    ? formatDistanceToNow(parseISO(lastSyncAtIso), { addSuffix: true, locale: es })
    : null

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Encabezado */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-[var(--ls-tight)] sm:text-3xl">
            Drivers
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Catálogo completo de drivers de Monchis. Click en uno para ver su
            actividad de los últimos 30 días.
          </p>
        </div>
        {lastSync && (
          <div className="font-[family-name:var(--font-mono)] text-xs text-muted-foreground">
            Sync {lastSync}
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard label="Total" value={enabledCount + disabledCount} />
        <KpiCard label="Habilitados" value={enabledCount} tone="success" />
        <KpiCard label="Deshabilitados" value={disabledCount} tone="danger" />
      </div>

      {/* Filtros */}
      <div className="space-y-4 rounded-[var(--radius-xl)] border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
        <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-[var(--ls-label)] text-muted-foreground">
              Buscar
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" />
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
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-[var(--ls-label)] text-muted-foreground">
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
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-[var(--ls-label)] text-muted-foreground">
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
        </form>

        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
          {/* Estado — segmented STUDIO */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium uppercase tracking-[var(--ls-label)] text-muted-foreground">
              Estado
            </span>
            <RadioGroupPrimitive.Root
              value={enabledFilter}
              onValueChange={(v) => updateParams({ enabled: v === "all" ? null : v })}
              className="inline-flex items-center gap-1 rounded-full bg-muted p-1"
            >
              {FILTER_OPTIONS.map((opt) => {
                const isSelected = enabledFilter === opt.value
                return (
                  <RadioGroupPrimitive.Item
                    key={opt.value}
                    value={opt.value}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/40",
                      isSelected
                        ? "bg-card text-primary shadow-[var(--shadow-soft)]"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {opt.label}
                  </RadioGroupPrimitive.Item>
                )
              })}
            </RadioGroupPrimitive.Root>
          </div>

          {/* Orden — pills STUDIO con dirección */}
          <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
            <span className="text-[11px] font-medium uppercase tracking-[var(--ls-label)] text-muted-foreground">
              Ordenar
            </span>
            <div className="inline-flex flex-wrap items-center gap-1 rounded-full bg-muted p-1">
              {SORT_OPTIONS.map((opt) => {
                const isSelected = sort === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSortClick(opt.value)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/40",
                      isSelected
                        ? "bg-card text-primary shadow-[var(--shadow-soft)]"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {opt.label}
                    {isSelected &&
                      (order === "desc" ? (
                        <ArrowDown className="size-3" />
                      ) : (
                        <ArrowUp className="size-3" />
                      ))}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Conteo */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">
          {total.toLocaleString("es-AR")} drivers
        </h2>
        {isPending && (
          <span className="text-xs text-muted-foreground">Aplicando...</span>
        )}
      </div>

      {/* Lista de cards */}
      {drivers.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-border bg-card/40 p-10 text-center text-sm text-muted-foreground">
          Sin resultados con la búsqueda/filtros aplicados.
        </div>
      ) : (
        <div className="grid gap-2.5">
          {drivers.map((d) => (
            <DriverCard key={d.driverId} driver={d} onOpen={() => setSelected(d)} />
          ))}
        </div>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between rounded-[var(--radius-lg)] border border-border bg-card px-4 py-2.5 text-xs text-muted-foreground shadow-[var(--shadow-soft)]">
          <span>
            Página {page} de {totalPages} · {total.toLocaleString("es-AR")}{" "}
            resultados
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

      {/* Drawer de detalle */}
      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
          {selected && <DriverDetail driver={selected} />}
        </SheetContent>
      </Sheet>
    </div>
  )
}

function DriverCard({ driver: d, onOpen }: { driver: DriverRow; onOpen: () => void }) {
  const name = displayNameOf(d)
  const pct = acceptedPct(d)
  const hasStats = d.attendanceLastProcessedAt !== null

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group w-full rounded-[var(--radius-lg)] border border-border bg-card p-3.5 text-left shadow-[var(--shadow-soft)] transition-[transform,box-shadow,border-color] duration-150 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-[var(--shadow-1)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30 sm:p-4"
    >
      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft font-[family-name:var(--font-display)] text-sm font-bold text-primary">
          {initialsOf(name)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-semibold leading-tight">{name}</span>
            <StatusPill enabled={d.enabled} />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {hasStats ? (
              <>
                <Chip mono icon={Package}>
                  {d.ordersCount30d} ped
                </Chip>
                {d.ordersCount30d > 0 && (
                  <Chip mono icon={Check} tone={pctTone(pct)}>
                    {Math.round(pct * 100)}% acept
                  </Chip>
                )}
                {d.hoursWorked30d > 0 && (
                  <Chip mono icon={Clock}>
                    {Math.round(d.hoursWorked30d)}h
                  </Chip>
                )}
              </>
            ) : (
              <span className="text-[11px] text-ink-subtle">Sin actividad procesada</span>
            )}
            {d.primaryZone30d && <Chip>{d.primaryZone30d}</Chip>}
            {d.phone && (
              <Chip mono icon={Phone}>
                {d.phone}
              </Chip>
            )}
          </div>
        </div>

        <ChevronRight className="size-4 shrink-0 text-ink-subtle transition-colors group-hover:text-primary" />
      </div>
    </button>
  )
}

function DriverDetail({ driver: d }: { driver: DriverRow }) {
  const name = displayNameOf(d)
  const pct = acceptedPct(d)
  const hasStats = d.attendanceLastProcessedAt !== null

  return (
    <div className="flex h-full flex-col">
      <SheetHeader className="border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-soft font-[family-name:var(--font-display)] text-base font-bold text-primary">
            {initialsOf(name)}
          </div>
          <div className="min-w-0">
            <SheetTitle className="flex items-center gap-2 text-base leading-tight">
              <span className="truncate">{name}</span>
            </SheetTitle>
            <SheetDescription className="font-[family-name:var(--font-mono)] text-xs">
              {d.driverId}
            </SheetDescription>
          </div>
          <div className="ml-auto">
            <StatusPill enabled={d.enabled} />
          </div>
        </div>
      </SheetHeader>

      <ScrollArea className="flex-1">
        <div className="space-y-5 p-4">
          <Section title="Datos personales">
            <Field icon={<IdCard className="size-3.5" />} label="Cédula" mono>
              {d.documentNumber || "—"}
            </Field>
            <Field icon={<Phone className="size-3.5" />} label="Teléfono">
              {d.phone ? (
                <a href={`tel:${d.phone}`} className="text-primary hover:underline">
                  {d.phone}
                </a>
              ) : (
                "—"
              )}
            </Field>
            <Field icon={<Mail className="size-3.5" />} label="Email">
              {d.email ? (
                <a
                  href={`mailto:${d.email}`}
                  className="truncate text-primary hover:underline"
                >
                  {d.email}
                </a>
              ) : (
                "—"
              )}
            </Field>
            <Field icon={<CalendarDays className="size-3.5" />} label="Update remoto">
              {d.updatedAtRemote
                ? format(parseISO(d.updatedAtRemote), "d MMM yyyy", { locale: es })
                : "—"}
            </Field>
            <Field icon={<ShieldCheck className="size-3.5" />} label="Estado">
              {d.enabled ? (
                <span className="font-medium text-success">Habilitado</span>
              ) : (
                <span className="text-muted-foreground">Deshabilitado</span>
              )}
            </Field>
          </Section>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-[11px] font-semibold uppercase tracking-[var(--ls-label)] text-ink-subtle">
                Performance · últimos 30 días
              </h3>
              {d.attendanceLastProcessedAt && (
                <span className="text-[10px] text-muted-foreground">
                  {formatDistanceToNow(parseISO(d.attendanceLastProcessedAt), {
                    addSuffix: true,
                    locale: es,
                  })}
                </span>
              )}
            </div>
            {!hasStats ? (
              <div className="rounded-[var(--radius-md)] border border-dashed border-border bg-surface-3/40 px-3 py-3 text-xs text-muted-foreground">
                Aún no procesamos actividad para este driver. El cron horario lo
                va a tomar en su próxima rotación.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                <StatCell label="Pedidos" value={d.ordersCount30d} />
                <StatCell
                  label="Aceptación"
                  value={d.ordersCount30d > 0 ? `${Math.round(pct * 100)}%` : "—"}
                  sub={`${d.acceptedOrders30d}/${d.ordersCount30d}`}
                  tone={d.ordersCount30d > 0 ? pctTone(pct) : undefined}
                />
                <StatCell
                  label="Sesiones"
                  value={d.sessions30d}
                  sub={`${d.daysWithActivity30d} días activos`}
                />
                <StatCell
                  label="Horas"
                  value={d.hoursWorked30d > 0 ? `${Math.round(d.hoursWorked30d)}h` : "—"}
                />
                <StatCell label="Zona principal" value={d.primaryZone30d || "—"} />
                <StatCell label="Turno principal" value={d.primaryTurn30d || "—"} />
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      <SheetFooter className="border-t border-border">
        <Button asChild className="w-full">
          <Link href={`/admin/gestion/drivers/${d.driverId}`}>
            Ver actividad y procesar
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </SheetFooter>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-[var(--ls-label)] text-ink-subtle">
        {title}
      </h3>
      <div className="divide-y divide-border rounded-[var(--radius-md)] border border-border bg-surface-3/40 px-3">
        {children}
      </div>
    </div>
  )
}

function Field({
  icon,
  label,
  children,
  mono,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
  mono?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
        <span className="text-ink-subtle">{icon}</span>
        {label}
      </span>
      <span
        className={cn(
          "truncate text-right text-sm",
          mono && "font-[family-name:var(--font-mono)]",
        )}
      >
        {children}
      </span>
    </div>
  )
}

function StatCell({
  label,
  value,
  sub,
  tone,
}: {
  label: string
  value: number | string
  sub?: string
  tone?: string
}) {
  return (
    <div className="rounded-[var(--radius-md)] border border-border bg-card p-2.5">
      <div className="text-[10px] uppercase tracking-[var(--ls-label)] text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          "truncate font-[family-name:var(--font-mono)] text-base font-semibold",
          tone,
        )}
      >
        {value}
      </div>
      {sub && (
        <div className="font-[family-name:var(--font-mono)] text-[10px] text-muted-foreground">
          {sub}
        </div>
      )}
    </div>
  )
}

function KpiCard({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone?: "success" | "danger"
}) {
  const toneCls =
    tone === "success"
      ? "border-success/40 bg-success-soft"
      : tone === "danger"
        ? "border-destructive/40 bg-danger-soft"
        : "border-border bg-card"
  const valueTone =
    tone === "success" ? "text-success" : tone === "danger" ? "text-destructive" : "text-foreground"
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border p-3 shadow-[var(--shadow-soft)]",
        toneCls,
      )}
    >
      <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[var(--ls-label)] text-muted-foreground">
        <Bike className="size-3" />
        {label}
      </div>
      <div
        className={cn(
          "mt-0.5 font-[family-name:var(--font-display)] text-2xl font-bold",
          valueTone,
        )}
      >
        {value.toLocaleString("es-AR")}
      </div>
    </div>
  )
}
