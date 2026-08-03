// app/admin/agent-runs/page.tsx

import Link from 'next/link'
import { Sparkles, CheckCircle2, AlertTriangle, XCircle, Loader2, Settings2 } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { AdminHeader } from '@/components/admin/admin-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AgentRunDetailSheet } from '@/components/admin/agent-runs/agent-run-detail-sheet'

export const revalidate = 15

const PAGE_SIZE = 50

interface PageProps {
  searchParams: Promise<{ page?: string }>
}

export default async function AgentRunsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = Math.max(1, Number(params.page ?? '1') || 1)
  const skip = (page - 1) * PAGE_SIZE

  const [runs, total, feedbackCounts] = await Promise.all([
    prisma.agentRun.findMany({
      include: {
        formDriver: {
          select: { id: true, slug: true, fullName: true, firstName: true, lastName: true, cedula: true },
        },
        actions: {
          select: { id: true, tool: true, input: true, reasoning: true, status: true },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.agentRun.count(),
    // Conteos de feedback sobre todo el histórico (cálculo de accuracy)
    prisma.agentRun.groupBy({
      by: ['humanFeedback'],
      where: { humanFeedback: { not: null } },
      _count: { _all: true },
    }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  // Calcular accuracy global
  const matches = feedbackCounts.find((c) => c.humanFeedback === 'MATCHES')?._count._all ?? 0
  const doesNotMatch =
    feedbackCounts.find((c) => c.humanFeedback === 'DOES_NOT_MATCH')?._count._all ?? 0
  const partial = feedbackCounts.find((c) => c.humanFeedback === 'PARTIAL')?._count._all ?? 0
  const withFeedback = matches + doesNotMatch + partial
  // Accuracy: MATCHES cuenta 1.0, PARTIAL cuenta 0.5, DOES_NOT_MATCH cuenta 0
  const accuracyPct =
    withFeedback > 0 ? Math.round(((matches + partial * 0.5) / withFeedback) * 100) : null

  return (
    <div className="flex flex-col">
      <AdminHeader
        breadcrumbs={[{ label: 'Agente IA', href: '/admin/agent-runs' }]}
      />

      <div className="w-full p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-purple-600" />
              Agente IA
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Historial de ejecuciones del agente IA sobre postulaciones.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/configuracion">
              <Settings2 className="mr-2 h-4 w-4" />
              Configurar agente
            </Link>
          </Button>
        </div>

        {/* KPIs de accuracy (feedback humano) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
              Precisión del agente
            </p>
            <p className="text-3xl font-bold">
              {accuracyPct != null ? `${accuracyPct}%` : '—'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {withFeedback > 0
                ? `${withFeedback} corrida${withFeedback === 1 ? '' : 's'} con feedback`
                : 'Sin feedback todavía'}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
              Coincide
            </p>
            <p className="text-3xl font-bold text-success">{matches}</p>
            <p className="text-xs text-muted-foreground mt-1">admin de acuerdo</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
              Parcial
            </p>
            <p className="text-3xl font-bold text-warning">{partial}</p>
            <p className="text-xs text-muted-foreground mt-1">mixto</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
              No coincide
            </p>
            <p className="text-3xl font-bold text-destructive">{doesNotMatch}</p>
            <p className="text-xs text-muted-foreground mt-1">errores del agente</p>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between border-b pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-600" />
              Corridas ({total})
            </CardTitle>
            <span className="text-xs text-muted-foreground">
              Página {page} de {totalPages}
            </span>
          </CardHeader>
          <CardContent className="p-0">
            {runs.length === 0 ? (
              <div className="p-12 text-center text-sm text-muted-foreground">
                Todavía no hay corridas del agente. Probá correr una desde la tabla de
                postulaciones con el botón &quot;Correr agente (simulación)&quot;.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 text-left">Fecha</th>
                      <th className="px-4 py-2 text-left">Postulante</th>
                      <th className="px-4 py-2 text-left">Modo</th>
                      <th className="px-4 py-2 text-left">Estado</th>
                      <th className="px-4 py-2 text-left">Decisión</th>
                      <th className="px-4 py-2 text-left">Tu feedback</th>
                      <th className="px-4 py-2 text-right">Acciones</th>
                      <th className="px-4 py-2 text-right">Tokens</th>
                      <th className="px-4 py-2 text-right">Costo</th>
                      <th className="px-4 py-2 text-left">Ver</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map((run) => {
                      const driver = run.formDriver
                      const name =
                        driver.fullName ||
                        `${driver.firstName ?? ''} ${driver.lastName ?? ''}`.trim() ||
                        'Sin nombre'
                      const totalTokens = (run.inputTokens ?? 0) + (run.outputTokens ?? 0)
                      return (
                        <tr key={run.id} className="border-t hover:bg-muted/30">
                          <td className="px-4 py-2 text-xs whitespace-nowrap">
                            {new Date(run.createdAt).toLocaleString('es-PY', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="px-4 py-2">
                            <Link
                              href={`/admin/postulaciones/${driver.slug ?? driver.id}`}
                              className="text-sm font-medium hover:underline"
                            >
                              {name}
                            </Link>
                            <div className="text-xs text-muted-foreground">{driver.cedula}</div>
                          </td>
                          <td className="px-4 py-2">
                            <Badge
                              variant="outline"
                              className={
                                run.mode === 'DRY_RUN'
                                  ? 'border-border text-muted-foreground'
                                  : 'border-purple-300 text-purple-700'
                              }
                            >
                              {run.mode === 'DRY_RUN' ? 'Simulación' : 'Real'}
                            </Badge>
                          </td>
                          <td className="px-4 py-2">
                            <StatusBadge status={run.status} />
                          </td>
                          <td className="px-4 py-2">
                            <DecisionBadge decision={run.decision} />
                          </td>
                          <td className="px-4 py-2">
                            <FeedbackBadge feedback={run.humanFeedback} />
                          </td>
                          <td className="px-4 py-2 text-right text-xs">{run.actions.length}</td>
                          <td className="px-4 py-2 text-right text-xs text-muted-foreground">
                            {totalTokens > 0 ? totalTokens.toLocaleString() : '—'}
                          </td>
                          <td className="px-4 py-2 text-right text-xs text-muted-foreground">
                            {run.costMicroUsd != null
                              ? `$${(run.costMicroUsd / 1_000_000).toFixed(4)}`
                              : '—'}
                          </td>
                          <td className="px-4 py-2">
                            <AgentRunDetailSheet
                              runId={run.id}
                              driverName={name}
                              cedula={driver.cedula}
                              mode={run.mode}
                              status={run.status}
                              decision={run.decision}
                              summary={run.summary}
                              reasoning={run.reasoning}
                              actions={run.actions.map((a) => ({
                                tool: a.tool,
                                input: a.input,
                                reasoning: a.reasoning,
                                status: a.status,
                              }))}
                              model={run.model}
                              inputTokens={run.inputTokens}
                              outputTokens={run.outputTokens}
                              costMicroUsd={run.costMicroUsd}
                              createdAt={run.createdAt.toISOString()}
                              error={run.error}
                              humanFeedback={run.humanFeedback}
                              humanFeedbackNote={run.humanFeedbackNote}
                              humanFeedbackAt={run.humanFeedbackAt?.toISOString() ?? null}
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {totalPages > 1 && (
          <div className="flex justify-center gap-2 text-sm">
            {page > 1 && (
              <Link
                href={`/admin/agent-runs?page=${page - 1}`}
                className="rounded border px-3 py-1 hover:bg-muted"
              >
                ← Anterior
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/admin/agent-runs?page=${page + 1}`}
                className="rounded border px-3 py-1 hover:bg-muted"
              >
                Siguiente →
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; cls: string; Icon: any }> = {
    PENDING: {
      label: 'Pendiente',
      cls: 'bg-muted text-muted-foreground border-border',
      Icon: Loader2,
    },
    RUNNING: { label: 'Corriendo', cls: 'bg-info-soft text-info border-info', Icon: Loader2 },
    COMPLETED: {
      label: 'Completada',
      cls: 'bg-success-soft text-success border-success',
      Icon: CheckCircle2,
    },
    FAILED: { label: 'Falló', cls: 'bg-danger-soft text-destructive border-destructive', Icon: XCircle },
    NEEDS_REVIEW: {
      label: 'Revisión',
      cls: 'bg-warning-soft text-warning border-warning',
      Icon: AlertTriangle,
    },
  }
  const c = config[status] ?? config.PENDING
  const Icon = c.Icon
  return (
    <Badge variant="outline" className={`gap-1 ${c.cls}`}>
      <Icon className="h-3 w-3" />
      {c.label}
    </Badge>
  )
}

function DecisionBadge({ decision }: { decision: string | null }) {
  if (!decision) return <span className="text-xs text-muted-foreground">—</span>
  const config: Record<string, { label: string; cls: string }> = {
    APPROVED: { label: 'APROBADA', cls: 'bg-success-soft text-success border-success' },
    NEEDS_REVIEW: { label: 'REVISIÓN', cls: 'bg-warning-soft text-warning border-warning' },
    REJECTED: { label: 'RECHAZADA', cls: 'bg-danger-soft text-destructive border-destructive' },
  }
  const c = config[decision] ?? { label: decision, cls: '' }
  return (
    <Badge variant="outline" className={c.cls}>
      {c.label}
    </Badge>
  )
}

function FeedbackBadge({ feedback }: { feedback: string | null }) {
  if (!feedback) return <span className="text-xs text-muted-foreground italic">—</span>
  if (feedback === 'MATCHES') {
    return (
      <Badge variant="outline" className="gap-1 bg-success-soft text-success border-success">
        <CheckCircle2 className="h-3 w-3" />
        Coincide
      </Badge>
    )
  }
  if (feedback === 'DOES_NOT_MATCH') {
    return (
      <Badge variant="outline" className="gap-1 bg-danger-soft text-destructive border-destructive">
        <XCircle className="h-3 w-3" />
        No coincide
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="gap-1 bg-warning-soft text-warning border-warning">
      <AlertTriangle className="h-3 w-3" />
      Parcial
    </Badge>
  )
}
