// components/admin/agent-runs/agent-run-summary-card.tsx
//
// Card compacta del último AgentRun en la página de detalle de la postulación.
// Una sola línea: decisión + summary + counts + meta + click-through al sheet.

'use client'

import { Badge } from '@/components/ui/badge'
import {
  Bot,
  CheckCircle2,
  XCircle,
  AlertTriangle,
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
  if (!run) return null

  const createdAt = new Date(run.createdAt)
  const cfg = getDecisionConfig(run.decision)
  const Icon = cfg.Icon

  const actionsByStatus: Record<string, number> = {}
  for (const a of run.actions) actionsByStatus[a.status] = (actionsByStatus[a.status] ?? 0) + 1
  const proposed = actionsByStatus['PROPOSED'] ?? 0
  const executed = actionsByStatus['EXECUTED'] ?? 0
  const failed = actionsByStatus['FAILED'] ?? 0

  const triggerLabel = describeTrigger(run.triggeredBy)
  const costUsd = run.costMicroUsd != null ? (run.costMicroUsd / 1_000_000).toFixed(4) : null
  const dateLabel = createdAt.toLocaleString('es-PY', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div
      className={`flex items-center gap-3 rounded-md border ${cfg.border} ${cfg.bg} px-3 py-2`}
    >
      <Bot className="h-4 w-4 text-muted-foreground flex-shrink-0" />

      <div className="flex items-center gap-2 flex-shrink-0">
        <Icon className={`h-4 w-4 ${cfg.text}`} />
        <span className={`text-xs font-bold uppercase tracking-wide ${cfg.text}`}>
          {cfg.label}
        </span>
      </div>

      {run.summary && (
        <span className="text-sm text-foreground truncate flex-1 min-w-0" title={run.summary}>
          — {run.summary}
        </span>
      )}

      <div className="flex items-center gap-1.5 flex-shrink-0">
        {run.actions.length > 0 && (
          <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-normal">
            {run.actions.length} acción{run.actions.length === 1 ? '' : 'es'}
            {executed > 0 && ` · ${executed} ejec`}
            {proposed > 0 && ` · ${proposed} prop`}
            {failed > 0 && ` · ${failed} fail`}
          </Badge>
        )}
      </div>

      <div className="hidden md:flex items-center gap-3 text-[11px] text-muted-foreground flex-shrink-0">
        <span>{dateLabel}</span>
        <span>·</span>
        <span>{triggerLabel}</span>
        {costUsd != null && (
          <>
            <span>·</span>
            <span>${costUsd}</span>
          </>
        )}
        {run.mode === 'DRY_RUN' && (
          <>
            <span>·</span>
            <span className="text-warning">simulación</span>
          </>
        )}
      </div>

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
    </div>
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
      label: 'Aprobado',
      bg: 'bg-success-soft',
      border: 'border-success/25',
      text: 'text-success',
      Icon: CheckCircle2,
    }
  }
  if (decision === 'REJECTED') {
    return {
      label: 'Rechazado',
      bg: 'bg-danger-soft',
      border: 'border-danger/25',
      text: 'text-danger',
      Icon: XCircle,
    }
  }
  if (decision === 'NEEDS_REVIEW') {
    return {
      label: 'Revisión manual',
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
  if (!triggeredBy) return 'sistema'
  if (triggeredBy.startsWith('cron:')) return 'cron'
  if (triggeredBy === 'SYSTEM') return 'sistema'
  if (triggeredBy.startsWith('user_')) return 'admin'
  return triggeredBy.length > 12 ? `${triggeredBy.slice(0, 12)}…` : triggeredBy
}
