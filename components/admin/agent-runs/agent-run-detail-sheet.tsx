'use client'

import { useState } from 'react'
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ClipboardList,
  MessageSquare,
  CircleSlash,
  UserCheck,
  Eye,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { getActionLabel } from '@/lib/utils/agent-action-labels'
import {
  AgentFeedbackSection,
  type AgentFeedbackValue,
} from '@/components/admin/agent-runs/agent-feedback-section'
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

export interface AgentRunDetailProps {
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
  humanFeedback?: AgentFeedbackValue | null
  humanFeedbackNote?: string | null
  humanFeedbackAt?: string | Date | null
}

export function AgentRunDetailSheet(props: AgentRunDetailProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 gap-1 text-xs"
        onClick={() => setOpen(true)}
      >
        <Eye className="h-3.5 w-3.5" />
        Ver detalle
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              Detalle de la corrida
            </SheetTitle>
            <SheetDescription>
              {props.driverName} — cédula {props.cedula} — {props.mode === 'DRY_RUN' ? 'Simulación' : 'Modo real'}
              <br />
              <span className="text-xs text-muted-foreground">
                {new Date(props.createdAt).toLocaleString('es-PY')}
              </span>
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-5 px-4 pb-6">
            <DecisionBadge decision={props.decision} />

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
                      <li
                        key={idx}
                        className="rounded-md border border-border p-3 bg-muted/30 flex gap-3"
                      >
                        <Icon className="h-4 w-4 flex-shrink-0 mt-0.5 text-muted-foreground" />
                        <div className="flex-1 min-w-0 break-words">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{label.title}</span>
                            <ActionStatusBadge status={action.status} />
                          </div>
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
              <section className="rounded-md border border-red-200 bg-red-50 p-3">
                <p className="text-xs font-semibold text-red-700 mb-1">Error</p>
                <p className="text-xs text-red-700">{props.error}</p>
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
    </>
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

function DecisionBadge({ decision }: { decision: Decision }) {
  if (!decision) {
    return (
      <div className="flex items-center gap-2 rounded-md bg-slate-100 p-3">
        <AlertTriangle className="h-5 w-5 text-slate-500" />
        <span className="text-sm font-medium text-slate-700">Sin decisión</span>
      </div>
    )
  }

  if (decision === 'APPROVED') {
    return (
      <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-3">
        <CheckCircle2 className="h-5 w-5 text-green-600" />
        <span className="text-sm font-semibold text-green-800">APROBADO</span>
      </div>
    )
  }
  if (decision === 'REJECTED') {
    return (
      <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3">
        <XCircle className="h-5 w-5 text-red-600" />
        <span className="text-sm font-semibold text-red-800">RECHAZADO</span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-3">
      <AlertTriangle className="h-5 w-5 text-amber-600" />
      <span className="text-sm font-semibold text-amber-800">REVISIÓN MANUAL</span>
    </div>
  )
}

function ActionStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    PROPOSED: { label: 'Propuesta', cls: 'bg-slate-50 text-slate-700 border-slate-200' },
    APPROVED: { label: 'Aprobada', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    EXECUTED: { label: 'Ejecutada', cls: 'bg-green-50 text-green-700 border-green-200' },
    REJECTED: { label: 'Rechazada', cls: 'bg-red-50 text-red-700 border-red-200' },
    FAILED: { label: 'Falló', cls: 'bg-red-50 text-red-700 border-red-200' },
  }
  const c = map[status] ?? map.PROPOSED
  return (
    <Badge variant="outline" className={`text-[10px] h-4 px-1 ${c.cls}`}>
      {c.label}
    </Badge>
  )
}
