"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Bike,
  CheckCircle2,
  Clock,
  FileWarning,
  MapPin,
  Package,
  Star,
} from "lucide-react"

import {
  BarChartDS,
  ChartCard,
  Chip,
  DateRangePicker,
  DonutChartDS,
  EntityCard,
  FunnelChartDS,
  KpiCard,
  LineChartDS,
  MetricGrid,
  PageHeader,
  SectionCard,
  StatusPill,
  type DateRangeValue,
} from "@/components/ds"

// — Datos de muestra (inertes) —————————————————————————————————————————

const ORDERS_BY_DAY = [
  { day: "Lun", pedidos: 312 },
  { day: "Mar", pedidos: 348 },
  { day: "Mié", pedidos: 401 },
  { day: "Jue", pedidos: 389 },
  { day: "Vie", pedidos: 512 },
  { day: "Sáb", pedidos: 634 },
  { day: "Dom", pedidos: 578 },
]

const HOURLY_E2E = [
  { hora: "10h", actual: 42, previa: 38 },
  { hora: "12h", actual: 118, previa: 96 },
  { hora: "14h", actual: 96, previa: 101 },
  { hora: "16h", actual: 61, previa: 58 },
  { hora: "18h", actual: 88, previa: 74 },
  { hora: "20h", actual: 154, previa: 132 },
  { hora: "22h", actual: 121, previa: 128 },
]

const BY_ZONE = [
  { name: "Asunción", value: 1240 },
  { name: "Fdo de la Mora", value: 860 },
  { name: "Luque", value: 540 },
  { name: "San Lorenzo", value: 420 },
  { name: "Lambaré", value: 214 },
]

const CONVERSION = [
  { label: "Pedidos creados", value: 3274 },
  { label: "Asignados", value: 3020 },
  { label: "Aceptados", value: 2788 },
  { label: "Entregados", value: 2612 },
]

const TOP_DRIVERS = [
  {
    id: "DRV-01842",
    name: "Marcelo Giménez",
    initials: "MG",
    zone: "Asunción",
    orders: 96,
    accept: 94,
    hours: 41,
    tone: "success" as const,
    status: "Activo",
  },
  {
    id: "DRV-02310",
    name: "Rocío Benítez",
    initials: "RB",
    zone: "Luque",
    orders: 88,
    accept: 91,
    hours: 38,
    tone: "info" as const,
    status: "En curso",
  },
  {
    id: "DRV-00975",
    name: "Diego Ferreira",
    initials: "DF",
    zone: "Fdo de la Mora",
    orders: 81,
    accept: 87,
    hours: 44,
    tone: "success" as const,
    status: "Activo",
  },
  {
    id: "DRV-03127",
    name: "Camila Ortega",
    initials: "CO",
    zone: "San Lorenzo",
    orders: 74,
    accept: 82,
    hours: 33,
    tone: "warning" as const,
    status: "Descanso",
  },
]

const TOTAL_ZONE = BY_ZONE.reduce((sum, z) => sum + z.value, 0)

export default function DashboardScreen() {
  const [range, setRange] = useState<DateRangeValue | undefined>()

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
            Dashboard
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-6 py-6">
        <PageHeader
          title="Dashboard"
          description="Actividad de la operación de delivery. Datos de muestra, panel inerte."
          actions={<DateRangePicker value={range} onChange={setRange} />}
        />

        {/* KPIs */}
        <MetricGrid columns={4}>
          <KpiCard
            label="Pedidos"
            value="3.274"
            sub="+8,4% vs semana previa"
            icon={Package}
            tone="brand"
          />
          <KpiCard
            label="Completadas"
            value="2.612"
            sub="79,8% de conversión"
            icon={CheckCircle2}
            tone="success"
          />
          <KpiCard
            label="En curso"
            value="147"
            sub="43 drivers en ruta"
            icon={Bike}
            tone="info"
          />
          <KpiCard
            label="Docs pendientes"
            value="28"
            sub="12 en revisión"
            icon={FileWarning}
            tone="warning"
          />
        </MetricGrid>

        {/* Gráficos */}
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard
            title="Órdenes por día"
            subtitle="Últimos 7 días · toda la red"
            height={260}
          >
            <BarChartDS
              data={ORDERS_BY_DAY}
              xKey="day"
              series={[{ key: "pedidos", label: "Pedidos" }]}
            />
          </ChartCard>

          <ChartCard
            title="Curva horaria"
            subtitle="Esta semana vs. W-1"
            height={260}
          >
            <LineChartDS
              data={HOURLY_E2E}
              xKey="hora"
              series={[{ key: "actual", label: "E2E" }]}
              comparison={{ key: "previa", label: "W-1" }}
              legend
            />
          </ChartCard>

          <ChartCard
            title="Pedidos por zona"
            subtitle="Distribución geográfica"
            height={260}
          >
            <DonutChartDS
              data={BY_ZONE}
              centerLabel="Total"
              centerValue={TOTAL_ZONE.toLocaleString("es-PY")}
            />
          </ChartCard>

          <ChartCard
            title="Embudo de conversión"
            subtitle="Creado → entregado"
            height={260}
          >
            <FunnelChartDS
              stages={CONVERSION}
              percentOf="first"
              valueFormatter={(n) => n.toLocaleString("es-PY")}
            />
          </ChartCard>
        </div>

        {/* Top drivers */}
        <SectionCard
          title="Top drivers"
          description="Ranking por pedidos completados en el rango"
          noPadding
        >
          <div className="grid gap-2.5 p-4">
            {TOP_DRIVERS.map((d) => (
              <EntityCard
                key={d.id}
                icon={d.initials}
                title={d.name}
                badge={
                  <StatusPill tone={d.tone} dot>
                    {d.status}
                  </StatusPill>
                }
                meta={
                  <span className="inline-flex items-center gap-1 font-[family-name:var(--font-mono)] text-sm font-semibold text-foreground">
                    <Star className="size-3.5 text-warning" />
                    {d.accept}%
                  </span>
                }
              >
                <Chip mono icon={Package}>
                  {d.orders} ped
                </Chip>
                <Chip mono icon={Clock}>
                  {d.hours}h
                </Chip>
                <Chip icon={MapPin}>{d.zone}</Chip>
                <Chip mono tone="brand">
                  {d.id}
                </Chip>
              </EntityCard>
            ))}
          </div>
        </SectionCard>
      </main>
    </div>
  )
}
