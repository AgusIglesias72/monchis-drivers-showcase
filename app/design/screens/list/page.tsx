"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
  Bike,
  Clock,
  Download,
  MapPin,
  Phone,
  Search,
  Store,
  User,
  Wallet,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Chip,
  DateRangePicker,
  DetailDrawer,
  DrawerField,
  DrawerSection,
  DrawerStat,
  EntityCard,
  FilterBar,
  FilterLabel,
  Pagination,
  PageHeader,
  SegmentedControl,
  StatusPill,
  statusToneFrom,
  type DateRangeValue,
} from "@/components/ds"

// — Datos de muestra (inertes) —————————————————————————————————————————

interface Order {
  code: string
  state: "DELIVERED" | "DELIVERY" | "ACCEPTED" | "WAITING_ORDER" | "CANCELED"
  stateLabel: string
  group: "activos" | "cerrados"
  driver: string
  driverInitials: string
  zone: string
  store: string
  customer: string
  phone: string
  total: string
  eta: string
  createdAt: string
  distanceKm: string
  items: number
}

const ORDERS: Order[] = [
  {
    code: "MON-48210",
    state: "DELIVERY",
    stateLabel: "En reparto",
    group: "activos",
    driver: "Marcelo Giménez",
    driverInitials: "MG",
    zone: "Asunción",
    store: "La Herencia",
    customer: "Sofía Riquelme",
    phone: "+595 981 447 210",
    total: "Gs 148.000",
    eta: "12 min",
    createdAt: "01 jul · 20:14",
    distanceKm: "3,4 km",
    items: 4,
  },
  {
    code: "MON-48197",
    state: "ACCEPTED",
    stateLabel: "Aceptado",
    group: "activos",
    driver: "Rocío Benítez",
    driverInitials: "RB",
    zone: "Luque",
    store: "Bolsi",
    customer: "Nicolás Vera",
    phone: "+595 972 118 044",
    total: "Gs 96.500",
    eta: "24 min",
    createdAt: "01 jul · 20:09",
    distanceKm: "5,1 km",
    items: 2,
  },
  {
    code: "MON-48155",
    state: "WAITING_ORDER",
    stateLabel: "Esperando local",
    group: "activos",
    driver: "Diego Ferreira",
    driverInitials: "DF",
    zone: "Fdo de la Mora",
    store: "Lido Bar",
    customer: "Paula Ayala",
    phone: "+595 985 330 771",
    total: "Gs 212.000",
    eta: "31 min",
    createdAt: "01 jul · 19:58",
    distanceKm: "2,2 km",
    items: 6,
  },
  {
    code: "MON-48090",
    state: "DELIVERED",
    stateLabel: "Entregado",
    group: "cerrados",
    driver: "Camila Ortega",
    driverInitials: "CO",
    zone: "San Lorenzo",
    store: "McDonald's",
    customer: "Tomás Cabrera",
    phone: "+595 981 902 315",
    total: "Gs 74.000",
    eta: "—",
    createdAt: "01 jul · 19:31",
    distanceKm: "4,0 km",
    items: 3,
  },
  {
    code: "MON-48041",
    state: "DELIVERED",
    stateLabel: "Entregado",
    group: "cerrados",
    driver: "Marcelo Giménez",
    driverInitials: "MG",
    zone: "Asunción",
    store: "Paulista Grill",
    customer: "Lucía Meza",
    phone: "+595 971 556 908",
    total: "Gs 305.500",
    eta: "—",
    createdAt: "01 jul · 19:12",
    distanceKm: "1,8 km",
    items: 5,
  },
  {
    code: "MON-47998",
    state: "CANCELED",
    stateLabel: "Cancelado",
    group: "cerrados",
    driver: "Rocío Benítez",
    driverInitials: "RB",
    zone: "Lambaré",
    store: "Don Vito",
    customer: "Federico Duarte",
    phone: "+595 984 771 220",
    total: "Gs 58.000",
    eta: "—",
    createdAt: "01 jul · 18:47",
    distanceKm: "6,3 km",
    items: 1,
  },
]

const FILTERS = [
  { value: "todos", label: "Todos" },
  { value: "activos", label: "Activos" },
  { value: "cerrados", label: "Cerrados" },
]

export default function OrdersListScreen() {
  const [filter, setFilter] = useState("todos")
  const [range, setRange] = useState<DateRangeValue | undefined>()
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Order | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return ORDERS.filter((o) => {
      if (filter !== "todos" && o.group !== filter) return false
      if (!q) return true
      return (
        o.code.toLowerCase().includes(q) ||
        o.driver.toLowerCase().includes(q) ||
        o.zone.toLowerCase().includes(q) ||
        o.store.toLowerCase().includes(q)
      )
    })
  }, [filter, query])

  return (
    <div className="min-h-svh" style={{ backgroundImage: "var(--grad-page)" }}>
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 px-6 py-3 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <Link
            href="/design/screens"
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Pantallas
          </Link>
          <span className="h-4 w-px bg-border" />
          <span className="font-[family-name:var(--font-display)] text-sm font-bold leading-none">
            Pedidos
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-6 py-6">
        <PageHeader
          title="Pedidos"
          description="Listado de pedidos de la operación. Click en uno para ver el detalle."
        />

        {/* Filtros */}
        <FilterBar>
          <div className="flex items-center gap-2">
            <FilterLabel>Estado</FilterLabel>
            <SegmentedControl
              value={filter}
              onValueChange={(v) => {
                setFilter(v)
                setPage(1)
              }}
              options={FILTERS}
              aria-label="Filtrar por estado"
            />
          </div>

          <DateRangePicker value={range} onChange={setRange} />

          <div className="relative flex-1 lg:min-w-[220px]">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setPage(1)
              }}
              placeholder="Buscar por #, driver, local o zona"
              className="pl-8"
            />
          </div>

          <Button variant="outline" className="lg:ml-auto">
            <Download className="size-4" />
            Exportar
          </Button>
        </FilterBar>

        {/* Conteo */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">
            {filtered.length.toLocaleString("es-AR")} pedidos
          </h2>
        </div>

        {/* Grilla de pedidos */}
        <div className="grid gap-2.5 sm:grid-cols-2">
          {filtered.map((o) => (
            <EntityCard
              key={o.code}
              icon={<Bike className="size-4" />}
              title={
                <span className="font-[family-name:var(--font-mono)]">
                  {o.code}
                </span>
              }
              badge={
                <StatusPill tone={statusToneFrom(o.state)} dot>
                  {o.stateLabel}
                </StatusPill>
              }
              onClick={() => setSelected(o)}
            >
              <Chip icon={User}>{o.driver}</Chip>
              <Chip icon={MapPin}>{o.zone}</Chip>
              <Chip mono icon={Wallet}>
                {o.total}
              </Chip>
            </EntityCard>
          ))}
        </div>

        {/* Paginación */}
        <div className="flex items-center justify-between border-t border-border pt-4">
          <span className="font-[family-name:var(--font-mono)] text-xs text-muted-foreground">
            Página {page} de 4
          </span>
          <Pagination page={page} totalPages={4} onPageChange={setPage} />
        </div>
      </main>

      {/* Drawer de detalle */}
      <DetailDrawer
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
        icon={selected?.driverInitials}
        title={
          <span className="font-[family-name:var(--font-mono)]">
            {selected?.code}
          </span>
        }
        subtitle={selected ? `Creado ${selected.createdAt}` : undefined}
        badge={
          selected && (
            <StatusPill tone={statusToneFrom(selected.state)} dot>
              {selected.stateLabel}
            </StatusPill>
          )
        }
        footer={
          <Button className="w-full">
            Ver seguimiento en el mapa
            <ArrowRight className="size-4" />
          </Button>
        }
      >
        {selected && (
          <>
            <div className="grid grid-cols-2 gap-2.5">
              <DrawerStat label="Total" value={selected.total} />
              <DrawerStat label="ETA" value={selected.eta} />
              <DrawerStat label="Ítems" value={selected.items} />
              <DrawerStat label="Distancia" value={selected.distanceKm} />
            </div>

            <DrawerSection title="Driver">
              <DrawerField label="Nombre" icon={<User className="size-3.5" />}>
                {selected.driver}
              </DrawerField>
              <DrawerField label="Zona" icon={<MapPin className="size-3.5" />}>
                {selected.zone}
              </DrawerField>
              <DrawerField
                label="Teléfono"
                icon={<Phone className="size-3.5" />}
                mono
              >
                {selected.phone}
              </DrawerField>
            </DrawerSection>

            <DrawerSection title="Pedido">
              <DrawerField label="Local" icon={<Store className="size-3.5" />}>
                {selected.store}
              </DrawerField>
              <DrawerField label="Cliente" icon={<User className="size-3.5" />}>
                {selected.customer}
              </DrawerField>
              <DrawerField
                label="Creado"
                icon={<Clock className="size-3.5" />}
                mono
              >
                {selected.createdAt}
              </DrawerField>
            </DrawerSection>
          </>
        )}
      </DetailDrawer>
    </div>
  )
}
