// components/admin/agent-runs/agent-run-summary-card.tsx
//
// Card visible en la página de detalle de la postulación que resume el último
// AgentRun del agente IA. Reusa el AgentRunBadge subyacente para abrir el sheet
// con el detalle completo cuando el admin quiere profundizar.

'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Bot,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ClipboardList,
  Zap,
} from 'lucide-react'
import { AgentRunBadge } from './agent-run-badge'

type Decision = 'APPROVED' | 'NEEDS_REVIEW' | 'REJECTED' | null
type ActionStatus = 'PROPOSED' | 'APPROVED' | 'EXECUTED' | 'REJECTED' | 'FAILED'

interface AgentAction {
  tool: string
  input: any
  reasoning: string | null
  status: ActionStatus | string
}

interface AgentRunData {
  id: string
  mode: 'DRY_RUN' | 'REAL'
  status: string
  decision: Decision
  summary: string | null
  reasoning: string | null
  model: string | null
  inputTokens: number | null
  outputTokens: number | null
  costMicroUsd: number | null
  createdAt: string | Date
  error: string | null
  triggeredBy?: string | null
  humanFeedback?: 'MATCHES' | 'DOES_NOT_MATCH' | 'PARTIAL' | null
  humanFeedbackNote?: string | null
  humanFeedbackAt?: string | Date | null
  actions: AgentAction[]
}

interface AgentRunSummaryCardProps {
  run: AgentRunData | undefined | null
  driverName: string
  cedula: string
}

export function AgentRunSummaryCard({ run, driverName, cedula }: AgentRunSummaryCardProps) {
  if (!run) {
    return (
      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base font-bold flex items-center gap-2 tracking-tight">
            <Bot className="h-4 w-4" />
            Análisis del Agente IA
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">
            El agente todavía no procesó esta postulación. Cuando se ejecute (manual o
            via cron) vas a ver acá la decisión, el razonamiento y las acciones propuestas.
          </p>
        </CardContent>
      </Card>
    )
  }

  const createdAt = new Date(run.createdAt)
  const decisionConfig = getDecisionConfig(run.decision)
  const Icon = decisionConfig.Icon

  // Contar acciones por estado
  const actionsByStatus: Record<string, number> = {}
  for (const a of run.actions) {
    actionsByStatus[a.status] = (actionsByStatus[a.status] ?? 0) + 1
  }
  const proposed = actionsByStatus['PROPOSED'] ?? 0
  const executed = actionsByStatus['EXECUTED'] ?? 0
  const failed = actionsByStatus['FAILED'] ?? 0
  const dismissed = (actionsByStatus['REJECTED'] ?? 0) + (actionsByStatus['APPROVED'] ?? 0)

  const triggerLabel = describeTrigger(run.triggeredBy)
  const costUsd = run.costMicroUsd != null ? (run.costMicroUsd / 1_000_000).toFixed(4) : null

  return (
    <Card>
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-base font-bold flex items-center justify-between gap-2 tracking-tight">
          <span className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            Análisis del Agente IA
          </span>
          <span className="text-xs font-normal text-muted-foreground">
            {createdAt.toLocaleString('es-PY')}
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Decisión */}
        <div className={`flex items-center gap-3 rounded-md border p-3 ${decisionConfig.bg} ${decisionConfig.border}`}>
          <Icon className={`h-5 w-5 ${decisionConfig.text} flex-shrink-0`} />
          <div className="flex-1 min-w-0">
            <div className={`text-sm font-semibold ${decisionConfig.text}`}>
              {decisionConfig.label}
            </div>
            {run.summary && (
              <div className="text-xs text-foreground mt-0.5 leading-snug">{run.summary}</div>
            )}
          </div>
        </div>

        {/* Acciones */}
        {run.actions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <ClipboardList className="h-3.5 w-3.5" />
              Acciones ({run.actions.length})
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {executed > 0 && (
                <Badge variant="outline" className="bg-success-soft text-success border-success/25 gap-1">
                  <Zap className="h-3 w-3" />
                  {executed} ejecutada{executed === 1 ? '' : 's'}
                </Badge>
              )}
              {proposed > 0 && (
                <Badge variant="outline" className="bg-warning-soft text-warning border-warning/30">
                  {proposed} propuesta{proposed === 1 ? '' : 's'}
                </Badge>
              )}
              {failed > 0 && (
                <Badge variant="outline" className="bg-danger-soft text-danger border-danger/25">
                  {failed} fallida{failed === 1 ? '' : 's'}
                </Badge>
              )}
              {dismissed > 0 && (
                <Badge variant="outline" className="text-muted-foreground">
                  {dismissed} resuelta{dismissed === 1 ? '' : 's'}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Metadata compacta */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground pt-2 border-t">
          <span>
            Disparado por: <strong className="text-foreground">{triggerLabel}</strong>
          </span>
          {run.mode === 'DRY_RUN' && (
            <span className="text-warning">Modo simulación</span>
          )}
          {costUsd != null && <span>Costo: ${costUsd} USD</span>}
        </div>

        {/* CTA: ver detalle completo. AgentRunBadge ya abre el sheet con todo. */}
        <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
          <AgentRunBadge
            driverName={driverName}
            cedula={cedula}
            run={{
              id: run.id,
              mode: run.mode,
              status: run.status,
              decision: run.decision,
              summary: run.summary,
              reasoning: run.reasoning,
              model: run.model,
              inputTokens: run.inputTokens,
              outputTokens: run.outputTokens,
              costMicroUsd: run.costMicroUsd,
              createdAt: typeof run.createdAt === 'string' ? run.createdAt : run.createdAt.toISOString(),
              error: run.error,
              humanFeedback: run.humanFeedback ?? null,
              humanFeedbackNote: run.humanFeedbackNote ?? null,
              humanFeedbackAt: run.humanFeedbackAt ?? null,
              actions: run.actions.map((a) => ({
                tool: a.tool,
                input: a.input,
                reasoning: a.reasoning,
                status: a.status,
              })),
            }}
          />
          <span>Click en el ícono para ver razonamiento completo, acciones y métricas.</span>
        </div>
      </CardContent>
    </Card>
  )
}

function getDecisionConfig(decision: Decision): {
  label: string
  bg: string
  border: string
  text: string
  Icon: typeof CheckCircle2
} {
  if (decision === 'APPROVED') {
    return {
      label: 'APROBADO',
      bg: 'bg-success-soft',
      border: 'border-success/25',
      text: 'text-success',
      Icon: CheckCircle2,
    }
  }
  if (decision === 'REJECTED') {
    return {
      label: 'RECHAZADO',
      bg: 'bg-danger-soft',
      border: 'border-danger/25',
      text: 'text-danger',
      Icon: XCircle,
    }
  }
  if (decision === 'NEEDS_REVIEW') {
    return {
      label: 'REVISIÓN MANUAL',
      bg: 'bg-warning-soft',
      border: 'border-warning/30',
      text: 'text-warning',
      Icon: AlertTriangle,
    }
  }
  return {
    label: 'Sin decisión',
    bg: 'bg-muted',
    border: 'border-border',
    text: 'text-muted-foreground',
    Icon: AlertTriangle,
  }
}

function describeTrigger(triggeredBy: string | null | undefined): string {
  if (!triggeredBy) return 'Sistema'
  if (triggeredBy.startsWith('cron:')) return 'Cron automático'
  if (triggeredBy === 'SYSTEM') return 'Sistema'
  // Si es un clerkId, mostrarlo abreviado
  if (triggeredBy.startsWith('user_')) return `Admin (${triggeredBy.slice(0, 12)}…)`
  return triggeredBy
}
