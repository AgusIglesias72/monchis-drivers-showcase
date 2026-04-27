'use client'

import { useState } from 'react'
import { Bot, Sparkles } from 'lucide-react'
import { AgentRunDetailSheet } from '@/components/admin/agent-runs/agent-run-detail-sheet'
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip'

type Decision = 'APPROVED' | 'NEEDS_REVIEW' | 'REJECTED' | null
type Feedback = 'MATCHES' | 'DOES_NOT_MATCH' | 'PARTIAL' | null

interface AgentRunBadgeProps {
  driverName: string
  cedula: string
  run: {
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
    createdAt: string
    error: string | null
    humanFeedback?: Feedback
    humanFeedbackNote?: string | null
    humanFeedbackAt?: string | Date | null
    actions: Array<{ tool: string; input: any; reasoning: string | null; status: string }>
  }
}

/**
 * Mini-botón con ícono de bot cuyo color refleja la decisión del último run
 * del agente. Al hacer click abre el drawer con el detalle completo.
 *
 * Se muestra al lado del nombre del postulante en la tabla admin.
 */
export function AgentRunBadge({ driverName, cedula, run }: AgentRunBadgeProps) {
  const [open, setOpen] = useState(false)

  const config = getBotConfig(run.decision)

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setOpen(true)
              }}
              className={`flex items-center justify-center w-6 h-6 rounded-full transition ${config.bg} ${config.text} hover:scale-110 hover:ring-2 hover:ring-offset-1 ${config.ring}`}
              aria-label={`Ver decisión del agente: ${config.label}`}
            >
              <Bot className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">
              <strong>Agente: {config.label}</strong>
              <br />
              {run.summary ? run.summary.slice(0, 80) + (run.summary.length > 80 ? '…' : '') : 'Click para ver detalle'}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Trick: renderizamos el Sheet via un componente hermano invisible */}
      <HiddenSheetTrigger
        open={open}
        onOpenChange={setOpen}
        driverName={driverName}
        cedula={cedula}
        run={run}
      />
    </>
  )
}

function HiddenSheetTrigger({
  open,
  onOpenChange,
  driverName,
  cedula,
  run,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  driverName: string
  cedula: string
  run: AgentRunBadgeProps['run']
}) {
  // Reutilizamos el AgentRunDetailSheet pero lo controlamos externamente.
  // Como ese componente tiene su propio botón "Ver detalle", usamos este wrapper
  // que oculta el trigger y solo expone el Sheet controlado.
  return (
    <ControlledAgentRunDetailSheet
      open={open}
      onOpenChange={onOpenChange}
      runId={run.id}
      driverName={driverName}
      cedula={cedula}
      mode={run.mode}
      status={run.status}
      decision={run.decision}
      summary={run.summary}
      reasoning={run.reasoning}
      actions={run.actions}
      model={run.model}
      inputTokens={run.inputTokens}
      outputTokens={run.outputTokens}
      costMicroUsd={run.costMicroUsd}
      createdAt={run.createdAt}
      error={run.error}
      humanFeedback={run.humanFeedback}
      humanFeedbackNote={run.humanFeedbackNote}
      humanFeedbackAt={run.humanFeedbackAt}
    />
  )
}

// Re-exportamos el detail sheet en modo controlado.
// Para evitar tocar el componente original, hacemos un wrapper fino.
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Sparkles as SparklesIcon } from 'lucide-react'
// Traigo las piezas del detalle directamente.
// La opción más simple: renderizar el detalle armado acá usando los mismos
// componentes que ya existen. Dedupe menor, ganancia de control.
import { AgentFeedbackSection } from '@/components/admin/agent-runs/agent-feedback-section'
import { ReasoningText } from '@/components/admin/agent-runs/reasoning-text'
import { getActionLabel } from '@/lib/utils/agent-action-labels'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ClipboardList,
  MessageSquare,
  CircleSlash,
  UserCheck,
} from 'lucide-react'

const ACTION_ICON: Record<string, any> = {
  check: CheckCircle2,
  x: XCircle,
  alert: AlertTriangle,
  message: MessageSquare,
  waive: CircleSlash,
  escalate: UserCheck,
}

function ControlledAgentRunDetailSheet(props: {
  open: boolean
  onOpenChange: (v: boolean) => void
  runId: string
  driverName: string
  cedula: string
  mode: 'DRY_RUN' | 'REAL'
  status: string
  decision: Decision
  summary: string | null
  reasoning: string | null
  actions: Array<{ tool: string; input: any; reasoning: string | null; status: string }>
  model: string | null
  inputTokens: number | null
  outputTokens: number | null
  costMicroUsd: number | null
  createdAt: string
  error: string | null
  humanFeedback?: Feedback
  humanFeedbackNote?: string | null
  humanFeedbackAt?: string | Date | null
}) {
  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <SparklesIcon className="h-5 w-5 text-purple-600" />
            Detalle de la corrida
          </SheetTitle>
          <SheetDescription>
            {props.driverName} — cédula {props.cedula} —{' '}
            {props.mode === 'DRY_RUN' ? 'Simulación' : 'Modo real'}
            <br />
            <span className="text-xs text-muted-foreground">
              {new Date(props.createdAt).toLocaleString('es-PY')}
            </span>
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 px-4 pb-6">
          <DecisionBlock decision={props.decision} />

          {props.summary && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                Resumen
              </h3>
              <p className="text-sm leading-relaxed">{props.summary}</p>
            </section>
          )}

          {props.actions.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                <ClipboardList className="h-3.5 w-3.5" />
                Acciones propuestas ({props.actions.length})
              </h3>
              <ul className="space-y-2">
                {props.actions.map((action, idx) => {
                  const label = getActionLabel(action.tool)
                  const Icon = ACTION_ICON[label.icon]
                  return (
                    <li key={idx} className="rounded-md border border-border p-3 bg-muted/30 flex gap-3">
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

          {props.reasoning && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                Razonamiento
              </h3>
              <ReasoningText text={props.reasoning} />
            </section>
          )}

          <section className="border-t pt-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Métricas
            </h3>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <dt className="text-muted-foreground">Estado</dt>
              <dd className="font-semibold">{translateRunStatus(props.status)}</dd>
              {props.model && (
                <>
                  <dt className="text-muted-foreground">Modelo</dt>
                  <dd className="font-mono">{props.model}</dd>
                </>
              )}
              <dt className="text-muted-foreground">Tokens in</dt>
              <dd>{(props.inputTokens ?? 0).toLocaleString()}</dd>
              <dt className="text-muted-foreground">Tokens out</dt>
              <dd>{(props.outputTokens ?? 0).toLocaleString()}</dd>
              <dt className="text-muted-foreground">Costo estimado</dt>
              <dd>
                {props.costMicroUsd != null
                  ? `$${(props.costMicroUsd / 1_000_000).toFixed(4)} USD`
                  : '—'}
              </dd>
            </dl>
          </section>

          {props.error && (
            <section className="rounded-md border border-danger/25 bg-danger-soft p-3">
              <p className="text-xs font-semibold text-danger mb-1">Error</p>
              <p className="text-xs text-danger">{props.error}</p>
            </section>
          )}

          <AgentFeedbackSection
            runId={props.runId}
            initialFeedback={props.humanFeedback ?? null}
            initialNote={props.humanFeedbackNote ?? null}
            initialAt={props.humanFeedbackAt ?? null}
          />

          <p className="text-xs text-muted-foreground pt-2 border-t">
            ID: <code className="font-mono">{props.runId}</code>
          </p>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function translateRunStatus(status: string): string {
  const map: Record<string, string> = {
    PENDING: 'Pendiente',
    RUNNING: 'Corriendo',
    COMPLETED: 'Completado',
    FAILED: 'Falló',
    NEEDS_REVIEW: 'Revisión manual',
  }
  return map[status] ?? status
}

function DecisionBlock({ decision }: { decision: Decision }) {
  if (!decision) {
    return (
      <div className="flex items-center gap-2 rounded-md bg-muted p-3">
        <AlertTriangle className="h-5 w-5 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">Sin decisión</span>
      </div>
    )
  }
  if (decision === 'APPROVED') {
    return (
      <div className="flex items-center gap-2 rounded-md border border-success/25 bg-success-soft p-3">
        <CheckCircle2 className="h-5 w-5 text-success" />
        <span className="text-sm font-semibold text-success">APROBADO</span>
      </div>
    )
  }
  if (decision === 'REJECTED') {
    return (
      <div className="flex items-center gap-2 rounded-md border border-danger/25 bg-danger-soft p-3">
        <XCircle className="h-5 w-5 text-danger" />
        <span className="text-sm font-semibold text-danger">RECHAZADO</span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2 rounded-md border border-warning/30 bg-warning-soft p-3">
      <AlertTriangle className="h-5 w-5 text-warning" />
      <span className="text-sm font-semibold text-warning">REVISIÓN MANUAL</span>
    </div>
  )
}

function getBotConfig(decision: Decision): {
  bg: string
  text: string
  ring: string
  label: string
} {
  if (decision === 'APPROVED') {
    return {
      bg: 'bg-success-soft',
      text: 'text-success',
      ring: 'ring-success/40',
      label: 'Aprobado',
    }
  }
  if (decision === 'REJECTED') {
    return {
      bg: 'bg-danger-soft',
      text: 'text-danger',
      ring: 'ring-danger/40',
      label: 'Rechazado',
    }
  }
  if (decision === 'NEEDS_REVIEW') {
    return {
      bg: 'bg-warning-soft',
      text: 'text-warning',
      ring: 'ring-warning/40',
      label: 'Revisión manual',
    }
  }
  return {
    bg: 'bg-muted',
    text: 'text-muted-foreground',
    ring: 'ring-border',
    label: 'Sin decisión',
  }
}
