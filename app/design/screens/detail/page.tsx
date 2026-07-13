"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Pencil,
  PauseCircle,
  Trash2,
  MessageSquare,
  Phone,
  Bike,
  MapPin,
  Star,
  FileText,
  FileCheck2,
  FileClock,
  Download,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Avatar,
  StatusPill,
  ActionMenu,
  PillTabs,
  SectionCard,
  DescriptionList,
  DescriptionItem,
  Timeline,
  TimelineItem,
  MetricGrid,
  KpiCard,
  StatList,
  Callout,
  Chip,
  BarChartDS,
} from "@/components/ds"

const DRIVER = {
  name: "Ricardo Benítez",
  phone: "+595 981 447 210",
  vehicle: "Moto · Honda Wave 110",
  zone: "Fernando de la Mora",
  joined: "12 mar 2026",
  id: "DRV-08421",
}

const WEEK_ORDERS = [
  { day: "Lun", pedidos: 22 },
  { day: "Mar", pedidos: 28 },
  { day: "Mié", pedidos: 19 },
  { day: "Jue", pedidos: 31 },
  { day: "Vie", pedidos: 44 },
  { day: "Sáb", pedidos: 51 },
  { day: "Dom", pedidos: 38 },
]

const DOCS = [
  { label: "Cédula de identidad", meta: "Verificada · 12 mar 2026", tone: "success" as const, icon: FileCheck2 },
  { label: "Licencia de conducir", meta: "Verificada · 12 mar 2026", tone: "success" as const, icon: FileCheck2 },
  { label: "Cédula verde (moto)", meta: "Vence en 24 días", tone: "warning" as const, icon: FileClock },
  { label: "Seguro contra terceros", meta: "Pendiente de carga", tone: "neutral" as const, icon: FileText },
]

function ScreenFrame({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="min-h-svh" style={{ backgroundImage: "var(--grad-page)" }}>
      <div className="sticky top-0 z-20 border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-2.5">
          <Link
            href="/design/screens"
            className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Pantallas
          </Link>
          <span className="h-4 w-px bg-border" />
          <span className="text-sm font-semibold text-foreground">{title}</span>
        </div>
      </div>
      <div className="mx-auto max-w-5xl px-6 py-6">{children}</div>
    </div>
  )
}

export default function DetailScreen() {
  const [tab, setTab] = useState("resumen")

  return (
    <ScreenFrame title="Detalle de repartidor">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar name={DRIVER.name} size="lg" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-[var(--ls-tight)]">
                {DRIVER.name}
              </h1>
              <StatusPill tone="success" dot>
                Activo
              </StatusPill>
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Bike className="size-3.5" />
                {DRIVER.vehicle}
              </span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5" />
                {DRIVER.zone}
              </span>
              <span className="font-[family-name:var(--font-mono)] text-xs">
                {DRIVER.id}
              </span>
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="sm">
            <MessageSquare className="size-4" />
            Mensaje
          </Button>
          <Button size="sm">
            <Phone className="size-4" />
            Contactar
          </Button>
          <ActionMenu
            items={[
              { label: "Editar", icon: Pencil, onSelect: () => {} },
              { label: "Suspender", icon: PauseCircle, onSelect: () => {} },
              {
                label: "Eliminar",
                icon: Trash2,
                tone: "danger",
                separatorBefore: true,
                onSelect: () => {},
              },
            ]}
          />
        </div>
      </div>

      {/* Two-column layout */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2/3 */}
        <div className="space-y-4 lg:col-span-2">
          <PillTabs
            aria-label="Secciones del repartidor"
            value={tab}
            onChange={setTab}
            tabs={[
              { value: "resumen", label: "Resumen" },
              { value: "actividad", label: "Actividad" },
              { value: "documentos", label: "Documentos", count: DOCS.length },
            ]}
          />

          {tab === "resumen" && (
            <div className="space-y-4">
              <SectionCard title="Información general">
                <DescriptionList columns={2}>
                  <DescriptionItem label="Teléfono" mono>
                    {DRIVER.phone}
                  </DescriptionItem>
                  <DescriptionItem label="Zona operativa">
                    {DRIVER.zone}
                  </DescriptionItem>
                  <DescriptionItem label="Vehículo">
                    {DRIVER.vehicle}
                  </DescriptionItem>
                  <DescriptionItem label="Alta" mono>
                    {DRIVER.joined}
                  </DescriptionItem>
                  <DescriptionItem label="Calificación" mono>
                    4,82 / 5,0
                  </DescriptionItem>
                  <DescriptionItem label="Estado">
                    <StatusPill tone="success" dot>
                      Activo
                    </StatusPill>
                  </DescriptionItem>
                </DescriptionList>
              </SectionCard>

              <SectionCard title="Actividad reciente">
                <Timeline>
                  <TimelineItem
                    tone="success"
                    title="Pedido #48210 entregado"
                    time="10:42"
                    description="Fernando de la Mora · 18 min · Gs. 12.500"
                  />
                  <TimelineItem
                    tone="brand"
                    title="Turno iniciado"
                    time="09:00"
                    description="Bloque mañana · zona centro"
                  />
                  <TimelineItem
                    tone="info"
                    title="Documento actualizado"
                    time="Ayer"
                    description="Cédula verde cargada, pendiente de revisión"
                  />
                  <TimelineItem
                    tone="warning"
                    title="Pedido reasignado"
                    time="Ayer"
                    description="#48007 fuera de radio de arribo"
                    last
                  />
                </Timeline>
              </SectionCard>
            </div>
          )}

          {tab === "actividad" && (
            <div className="space-y-4">
              <MetricGrid columns={3}>
                <KpiCard label="Pedidos 7d" value="233" sub="+14% vs semana previa" tone="brand" />
                <KpiCard label="Tasa aceptación" value="94%" sub="objetivo 90%" tone="success" />
                <KpiCard label="Tiempo medio" value="17 min" sub="por entrega" />
              </MetricGrid>

              <SectionCard title="Pedidos por día" description="Últimos 7 días">
                <div className="h-64">
                  <BarChartDS
                    data={WEEK_ORDERS}
                    xKey="day"
                    series={[{ key: "pedidos", label: "Pedidos" }]}
                  />
                </div>
              </SectionCard>
            </div>
          )}

          {tab === "documentos" && (
            <SectionCard title="Documentos" description="Verificación de identidad y vehículo">
              <ul className="divide-y divide-border">
                {DOCS.map((doc) => {
                  const Icon = doc.icon
                  return (
                    <li
                      key={doc.label}
                      className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-muted text-muted-foreground">
                          <Icon className="size-4" />
                        </span>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-foreground">
                            {doc.label}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {doc.meta}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusPill tone={doc.tone}>
                          {doc.tone === "success"
                            ? "Verificado"
                            : doc.tone === "warning"
                              ? "Por vencer"
                              : "Pendiente"}
                        </StatusPill>
                        <Button variant="ghost" size="icon-sm" aria-label="Descargar">
                          <Download className="size-4" />
                        </Button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </SectionCard>
          )}
        </div>

        {/* Right 1/3 */}
        <div className="space-y-4">
          <SectionCard
            title="KPIs 30 días"
            actions={
              <Chip tone="brand" icon={Star} mono>
                4,82
              </Chip>
            }
          >
            <StatList
              items={[
                { label: "Pedidos", value: "912" },
                { label: "Entregados", value: "889" },
                { label: "Cancelados", value: "23" },
                { label: "Aceptación", value: "94%" },
                { label: "Puntualidad", value: "91%" },
                { label: "Ingresos", value: "Gs. 4,1M" },
              ]}
            />
          </SectionCard>

          <Callout tone="warning" title="Documento por vencer">
            La cédula verde vence en 24 días. Solicitá la renovación antes del
            25 jul para evitar la suspensión automática.
          </Callout>
        </div>
      </div>
    </ScreenFrame>
  )
}
