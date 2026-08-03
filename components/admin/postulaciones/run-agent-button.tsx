'use client'

import { useState } from 'react'
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ClipboardList,
  MessageSquare,
  CircleSlash,
  UserCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { getActionLabel } from '@/lib/utils/agent-action-labels'
import { AgentFeedbackSection } from '@/components/admin/agent-runs/agent-feedback-section'
import { ReasoningText } from '@/components/admin/agent-runs/reasoning-text'

type Decision = 'APPROVED' | 'NEEDS_REVIEW' | 'REJECTED' | null

const ACTION_ICON: Record<string, any> = {
  check: CheckCircle2,
  x: XCircle,
  alert: AlertTriangle,
  message: MessageSquare,
  waive: CircleSlash,
  escalate: UserCheck,
}

interface ProposedAction {
  tool: string
  input: Record<string, any>
  reasoning?: string
}

interface AgentResult {
  agentRunId: string
  decision: Decision
  summary: string
  reasoning: string
  actions: ProposedAction[]
  metrics: {
    iterations: number
    inputTokens: number
    outputTokens: number
    cacheReadTokens: number
    cacheWriteTokens: number
    costMicroUsd: number
  }
  model: string | null
  error?: string
}

interface RunAgentButtonProps {
  driverId: string
  hasExistingRun?: boolean
}

export function RunAgentButton({ driverId, hasExistingRun = false }: RunAgentButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [openSheet, setOpenSheet] = useState(false)
  const [result, setResult] = useState<AgentResult | null>(null)

  const runDryRun = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isLoading || hasExistingRun) return

    setIsLoading(true)
    const toastId = toast.loading('Corriendo agente (dry-run)…')

    try {
      const res = await fetch(`/api/admin/postulaciones/${driverId}/run-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'DRY_RUN' }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data?.error || 'Error al correr el agente', { id: toastId })
        return
      }

      const agentResult = data.result as AgentResult
      setResult(agentResult)
      setOpenSheet(true)

      if (agentResult.error) {
        toast.error(`Agente falló: ${agentResult.error}`, { id: toastId })
      } else if (agentResult.decision === 'APPROVED') {
        toast.success('Agente: APROBADO', { id: toastId })
      } else if (agentResult.decision === 'REJECTED') {
        toast.warning('Agente: RECHAZADO', { id: toastId })
      } else {
        toast.info('Agente: requiere revisión manual', { id: toastId })
      }
    } catch (err) {
      console.error('[run-agent]', err)
      toast.error('Error de red', { id: toastId })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={runDryRun}
        disabled={isLoading || hasExistingRun}
        className={`w-full justify-start text-left gap-2 h-auto py-1.5 px-2 text-sm font-normal ${
          hasExistingRun ? 'text-muted-foreground cursor-not-allowed' : ''
        }`}
        title={hasExistingRun ? 'Ya existe una corrida — abrí el ícono de bot junto al nombre' : undefined}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        <span className="flex-1">
          {isLoading
            ? 'Corriendo agente…'
            : hasExistingRun
              ? 'Agente ya ejecutado'
              : 'Correr agente (simulación)'}
        </span>
      </Button>

      <Sheet open={openSheet} onOpenChange={setOpenSheet}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              Resultado del agente
            </SheetTitle>
            <SheetDescription>
              Simulación: ninguna acción fue aplicada al sistema. Este resultado queda
              guardado en el historial en{' '}
              <span className="font-mono text-xs">/admin/agent-runs</span>.
            </SheetDescription>
          </SheetHeader>

          {result && <AgentResultView result={result} />}
        </SheetContent>
      </Sheet>
    </>
  )
}

function AgentResultView({ result }: { result: AgentResult }) {
  return (
    <div className="space-y-5 px-4 pb-6">
      <DecisionBadge decision={result.decision} />

      {result.summary && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
            Resumen
          </h3>
          <p className="text-sm leading-relaxed">{result.summary}</p>
        </section>
      )}

      {result.actions.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
            <ClipboardList className="h-3.5 w-3.5" />
            Acciones propuestas ({result.actions.length})
          </h3>
          <ul className="space-y-2">
            {result.actions.map((action, idx) => {
              const label = getActionLabel(action.tool)
              const Icon = ACTION_ICON[label.icon]
              return (
                <li
                  key={idx}
                  className="rounded-md border border-border p-3 bg-muted/30 flex gap-3"
                >
                  <Icon className="h-4 w-4 flex-shrink-0 mt-0.5 text-muted-foreground" />
                  <div className="flex-1 min-w-0 break-words">
                    <div className="text-sm font-medium">{label.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap">
                      {label.describe(action.input)}
                    </div>
                    {action.reasoning && (
                      <p className="text-xs italic text-muted-foreground mt-2 border-t pt-2">
                        {action.reasoning}
                      </p>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {result.reasoning && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
            Razonamiento
          </h3>
          <ReasoningText text={result.reasoning} />
        </section>
      )}

      <section className="border-t pt-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          Métricas
        </h3>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          {result.model && (
            <>
              <dt className="text-muted-foreground">Modelo</dt>
              <dd className="font-mono">{result.model}</dd>
            </>
          )}
          <dt className="text-muted-foreground">Iteraciones</dt>
          <dd>{result.metrics.iterations}</dd>
          <dt className="text-muted-foreground">Input tokens</dt>
          <dd>{result.metrics.inputTokens.toLocaleString()}</dd>
          <dt className="text-muted-foreground">Output tokens</dt>
          <dd>{result.metrics.outputTokens.toLocaleString()}</dd>
          {result.metrics.cacheReadTokens > 0 && (
            <>
              <dt className="text-muted-foreground">Cache reads</dt>
              <dd>{result.metrics.cacheReadTokens.toLocaleString()}</dd>
            </>
          )}
          <dt className="text-muted-foreground">Costo estimado</dt>
          <dd>${(result.metrics.costMicroUsd / 1_000_000).toFixed(4)} USD</dd>
        </dl>
      </section>

      {result.error && (
        <section className="rounded-md border border-destructive bg-danger-soft p-3">
          <p className="text-xs font-semibold text-destructive mb-1">Error</p>
          <p className="text-xs text-destructive">{result.error}</p>
        </section>
      )}

      <AgentFeedbackSection runId={result.agentRunId} />

      <p className="text-xs text-muted-foreground pt-2 border-t">
        ID: <code className="font-mono">{result.agentRunId}</code>
      </p>
    </div>
  )
}

function DecisionBadge({ decision }: { decision: Decision }) {
  if (!decision) {
    return (
      <div className="flex items-center gap-2 rounded-md bg-muted p-3">
        <AlertTriangle className="h-5 w-5 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">Sin decisión</span>
      </div>
    )
  }

  if (decision === 'APPROVED') {
    return (
      <div className="flex items-center gap-2 rounded-md border border-success bg-success-soft p-3">
        <CheckCircle2 className="h-5 w-5 text-success" />
        <span className="text-sm font-semibold text-success">APROBADO</span>
        <Badge variant="outline" className="ml-auto border-success text-success">
          Lista para avanzar
        </Badge>
      </div>
    )
  }

  if (decision === 'REJECTED') {
    return (
      <div className="flex items-center gap-2 rounded-md border border-destructive bg-danger-soft p-3">
        <XCircle className="h-5 w-5 text-destructive" />
        <span className="text-sm font-semibold text-destructive">RECHAZADO</span>
        <Badge variant="outline" className="ml-auto border-destructive text-destructive">
          Motivos claros de rechazo
        </Badge>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 rounded-md border border-info bg-info-soft p-3">
      <AlertTriangle className="h-5 w-5 text-info" />
      <span className="text-sm font-semibold text-info">REVISIÓN MANUAL</span>
      <Badge variant="outline" className="ml-auto border-info text-info">
        Requiere admin
      </Badge>
    </div>
  )
}
