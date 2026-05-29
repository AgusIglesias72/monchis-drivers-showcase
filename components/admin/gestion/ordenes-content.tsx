"use client"

import { useEffect, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { es } from "date-fns/locale"

import { AdminHeader } from "@/components/admin/admin-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { CaptureHealth } from "@/lib/services/live-capture-health.service"
import { parseOrderInstant } from "@/lib/utils/pedidos-time"
import { cn } from "@/lib/utils"

interface OrderRow {
  requestId: string
  externalOrderId: string | null
  driverName: string | null
  branchName: string | null
  status: string | null
  confirmedAt: string | null
  refreshedAt: string
}

interface Props {
  rows: OrderRow[]
  health: CaptureHealth
  generatedAt: string
}

const STATUS_LABEL: Record<string, { label: string; hex: string }> = {
  PENDING: { label: "Buscando driver", hex: "#f59e0b" },
  ASSIGNED: { label: "Asignado", hex: "#a855f7" },
  ACCEPTED: { label: "Aceptado", hex: "#8b5cf6" },
  WAITING_ORDER: { label: "En el comercio", hex: "#0ea5e9" },
  DELIVERY: { label: "En camino", hex: "#2563eb" },
  OUTSIDE: { label: "Afuera", hex: "#0891b2" },
}

function statusInfo(status: string | null) {
  if (!status) return { label: "Desconocido", hex: "#64748b" }
  return STATUS_LABEL[status] || { label: status, hex: "#64748b" }
}

function relativeMs(ms: number | null): string {
  if (ms === null) return "—"
  const s = Math.round(ms / 1000)
  if (s < 60) return `hace ${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `hace ${m}m`
  const h = Math.floor(m / 60)
  return `hace ${h}h ${m % 60}m`
}

function fmtTime(iso: string | null): string {
  const d = parseOrderInstant(iso)
  return d ? format(d, "dd MMM HH:mm", { locale: es }) : "—"
}

export function OrdenesContent({ rows, health, generatedAt }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [now, setNow] = useState(() => Date.parse(generatedAt))

  // Auto-refresh: re-ejecuta el server component (re-query a la DB, que el lane
  // rápido mantiene fresco) cada 20s. Sin polling de un endpoint propio.
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000)
    const refresh = setInterval(() => {
      startTransition(() => router.refresh())
    }, 20_000)
    return () => {
      clearInterval(tick)
      clearInterval(refresh)
    }
  }, [router])

  const sinceGenerated = now - Date.parse(generatedAt)

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader
        breadcrumbs={[
          { label: "Gestión Admin" },
          { label: "Órdenes", href: "/admin/gestion/ordenes" },
        ]}
      />

      <div className="w-full p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Órdenes en vivo
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Órdenes en curso con estado fresco y salud de la captura
              automática. Para el histórico completo, ver{" "}
              <Link
                href="/admin/gestion/pedidos"
                className="underline underline-offset-2"
              >
                Pedidos
              </Link>
              .
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              Actualizado {relativeMs(sinceGenerated)}
            </span>
            <Button
              variant="outline"
              onClick={() => startTransition(() => router.refresh())}
              disabled={isPending}
            >
              {isPending ? "Actualizando…" : "Actualizar"}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="en-curso">
          <TabsList>
            <TabsTrigger value="en-curso">
              En curso ({health.inProgressCount})
            </TabsTrigger>
            <TabsTrigger value="salud">Salud de captura</TabsTrigger>
          </TabsList>

          <TabsContent value="en-curso" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Estado</TableHead>
                      <TableHead>Comercio</TableHead>
                      <TableHead>Driver</TableHead>
                      <TableHead>Confirmado</TableHead>
                      <TableHead>Pedido</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="py-10 text-center text-sm text-muted-foreground"
                        >
                          No hay órdenes en curso en este momento.
                        </TableCell>
                      </TableRow>
                    ) : (
                      rows.map((r) => {
                        const s = statusInfo(r.status)
                        return (
                          <TableRow key={r.requestId}>
                            <TableCell>
                              <span className="inline-flex items-center gap-2">
                                <span
                                  className="h-2 w-2 rounded-full"
                                  style={{ backgroundColor: s.hex }}
                                />
                                {s.label}
                              </span>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {r.branchName || "—"}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {r.driverName || "—"}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {fmtTime(r.confirmedAt)}
                            </TableCell>
                            <TableCell>
                              <Link
                                href={`/admin/gestion/pedidos/${r.requestId}`}
                                className="font-mono text-xs underline underline-offset-2"
                              >
                                {r.externalOrderId || r.requestId.slice(-6)}
                              </Link>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="salud" className="mt-4 space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <HealthCard
                label="Última captura"
                value={relativeMs(health.captureLagMs)}
                warn={health.isStale}
                hint={
                  health.isStale
                    ? `Sin captura hace más de ${Math.round(
                        health.staleThresholdMs / 60000,
                      )}m`
                    : "Captura al día"
                }
              />
              <HealthCard
                label="Cobertura última corrida"
                value={`${health.lastIdsSeen} / ${health.lastZonesTotalRequest}`}
                hint="IDs vistos / total reportado por zonas"
              />
              <HealthCard
                label="En curso ahora"
                value={String(health.inProgressCount)}
                hint="Pedidos no-terminales cacheados"
              />
              <HealthCard
                label="Cola de importación"
                value={String(health.queue.pending)}
                warn={health.queue.failed > 0}
                hint={`pend. ${health.queue.pending} · ok ${health.queue.done} · fail ${health.queue.failed} · n/f ${health.queue.notFound}`}
              />
            </div>

            {health.lastErrors.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Errores en la última corrida
                  </div>
                  <ul className="space-y-1 text-sm">
                    {health.lastErrors.map((e, i) => (
                      <li key={i}>
                        <span className="font-mono">{e.source}</span>:{" "}
                        {e.message}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Corrida</TableHead>
                      <TableHead className="text-right">IDs vistos</TableHead>
                      <TableHead className="text-right">Nuevos</TableHead>
                      <TableHead className="text-right">Zonas total</TableHead>
                      <TableHead className="text-right">Errores</TableHead>
                      <TableHead className="text-right">Duración</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {health.trend.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="py-10 text-center text-sm text-muted-foreground"
                        >
                          Sin corridas de captura todavía.
                        </TableCell>
                      </TableRow>
                    ) : (
                      health.trend
                        .slice()
                        .reverse()
                        .map((p) => (
                          <TableRow key={p.fetchedAt}>
                            <TableCell className="text-muted-foreground">
                              {format(new Date(p.fetchedAt), "dd MMM HH:mm", {
                                locale: es,
                              })}
                            </TableCell>
                            <TableCell className="text-right">
                              {p.idsSeen}
                            </TableCell>
                            <TableCell className="text-right">
                              {p.idsNewEnqueued}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {p.zonesTotalRequest}
                            </TableCell>
                            <TableCell
                              className={cn(
                                "text-right",
                                p.errorCount > 0 && "text-amber-600",
                              )}
                            >
                              {p.errorCount}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {p.durationMs}ms
                            </TableCell>
                          </TableRow>
                        ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function HealthCard({
  label,
  value,
  hint,
  warn = false,
}: {
  label: string
  value: string
  hint?: string
  warn?: boolean
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div
          className={cn(
            "mt-1 text-2xl font-bold tracking-tight",
            warn && "text-amber-600",
          )}
        >
          {value}
        </div>
        {hint && (
          <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
        )}
      </CardContent>
    </Card>
  )
}
