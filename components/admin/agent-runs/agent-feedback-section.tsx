'use client'

import { useState } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, Loader2, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export type AgentFeedbackValue = 'MATCHES' | 'DOES_NOT_MATCH' | 'PARTIAL'

interface AgentFeedbackSectionProps {
  runId: string
  initialFeedback?: AgentFeedbackValue | null
  initialNote?: string | null
  initialAt?: string | Date | null
}

/**
 * Permite al admin marcar si la decisión del agente coincidió con la suya.
 * Tres estados: coincide, no coincide, parcial. Nota opcional.
 * Reusable entre el drawer de "Correr agente" y el detalle en /admin/agent-runs.
 */
export function AgentFeedbackSection({
  runId,
  initialFeedback = null,
  initialNote = null,
  initialAt = null,
}: AgentFeedbackSectionProps) {
  const router = useRouter()
  const [currentFeedback, setCurrentFeedback] = useState<AgentFeedbackValue | null>(
    initialFeedback,
  )
  const [currentNote, setCurrentNote] = useState<string | null>(initialNote)
  const [currentAt, setCurrentAt] = useState<string | Date | null>(initialAt)

  const [editing, setEditing] = useState(!initialFeedback)
  const [selected, setSelected] = useState<AgentFeedbackValue | null>(initialFeedback)
  const [note, setNote] = useState(initialNote ?? '')
  const [isSaving, setIsSaving] = useState(false)

  const save = async () => {
    if (!selected) {
      toast.error('Elegí una opción antes de guardar')
      return
    }
    setIsSaving(true)
    try {
      const res = await fetch(`/api/admin/agent-runs/${runId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback: selected, note: note.trim() || null }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data?.error || 'Error al guardar feedback')
        return
      }
      setCurrentFeedback(selected)
      setCurrentNote(note.trim() || null)
      setCurrentAt(new Date().toISOString())
      setEditing(false)
      toast.success('Feedback guardado')
      router.refresh()
    } catch (err) {
      console.error('[feedback]', err)
      toast.error('Error de red')
    } finally {
      setIsSaving(false)
    }
  }

  const clearFeedback = async () => {
    setIsSaving(true)
    try {
      const res = await fetch(`/api/admin/agent-runs/${runId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback: null }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data?.error || 'Error al limpiar feedback')
        return
      }
      setCurrentFeedback(null)
      setCurrentNote(null)
      setCurrentAt(null)
      setSelected(null)
      setNote('')
      setEditing(true)
      toast.success('Feedback removido')
      router.refresh()
    } finally {
      setIsSaving(false)
    }
  }

  // Modo VISTA: ya hay feedback y no está en edición
  if (!editing && currentFeedback) {
    return (
      <section className="border-t pt-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          Tu feedback
        </h3>
        <div className="flex items-start gap-3 rounded-md border bg-muted/30 p-3">
          <FeedbackBadge feedback={currentFeedback} />
          <div className="flex-1 min-w-0">
            {currentNote && (
              <p className="text-sm whitespace-pre-wrap break-words">{currentNote}</p>
            )}
            {currentAt && (
              <p className="text-xs text-muted-foreground mt-1">
                Marcado el {new Date(currentAt).toLocaleString('es-PY')}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={() => {
                setSelected(currentFeedback)
                setNote(currentNote ?? '')
                setEditing(true)
              }}
            >
              <Pencil className="h-3 w-3" />
              Editar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-red-600 hover:text-red-700"
              onClick={clearFeedback}
              disabled={isSaving}
            >
              Quitar
            </Button>
          </div>
        </div>
      </section>
    )
  }

  // Modo EDICIÓN
  return (
    <section className="border-t pt-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        ¿Coincidís con esta decisión?
      </h3>
      <p className="text-xs text-muted-foreground mb-3">
        Tu feedback nos ayuda a medir la precisión del agente y mejorar el prompt con los
        errores reales.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
        <FeedbackOption
          value="MATCHES"
          selected={selected}
          onClick={() => setSelected('MATCHES')}
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Sí, coincide"
          baseClass="bg-green-50/60 border-green-200 text-green-700 hover:bg-green-100 hover:border-green-400 hover:text-green-800"
          selectedClass="bg-green-100 border-green-500 text-green-900 ring-2 ring-green-400 ring-offset-1"
        />
        <FeedbackOption
          value="PARTIAL"
          selected={selected}
          onClick={() => setSelected('PARTIAL')}
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Parcial"
          baseClass="bg-amber-50/60 border-amber-200 text-amber-700 hover:bg-amber-100 hover:border-amber-400 hover:text-amber-800"
          selectedClass="bg-amber-100 border-amber-500 text-amber-900 ring-2 ring-amber-400 ring-offset-1"
        />
        <FeedbackOption
          value="DOES_NOT_MATCH"
          selected={selected}
          onClick={() => setSelected('DOES_NOT_MATCH')}
          icon={<XCircle className="h-4 w-4" />}
          label="No coincide"
          baseClass="bg-red-50/60 border-red-200 text-red-700 hover:bg-red-100 hover:border-red-400 hover:text-red-800"
          selectedClass="bg-red-100 border-red-500 text-red-900 ring-2 ring-red-400 ring-offset-1"
        />
      </div>

      <Textarea
        placeholder="Nota opcional: ¿qué hubieras decidido y por qué?"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        className="mb-3"
      />

      <div className="flex items-center gap-2">
        <Button onClick={save} disabled={!selected || isSaving} size="sm">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
          Guardar feedback
        </Button>
        {initialFeedback && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelected(currentFeedback)
              setNote(currentNote ?? '')
              setEditing(false)
            }}
            disabled={isSaving}
          >
            Cancelar
          </Button>
        )}
      </div>
    </section>
  )
}

function FeedbackOption({
  value,
  selected,
  onClick,
  icon,
  label,
  baseClass,
  selectedClass,
}: {
  value: AgentFeedbackValue
  selected: AgentFeedbackValue | null
  onClick: () => void
  icon: React.ReactNode
  label: string
  baseClass: string
  selectedClass: string
}) {
  const isSelected = selected === value
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium cursor-pointer transition ${
        isSelected ? selectedClass : baseClass
      }`}
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
    </button>
  )
}

function FeedbackBadge({ feedback }: { feedback: AgentFeedbackValue }) {
  if (feedback === 'MATCHES') {
    return (
      <Badge variant="outline" className="gap-1 bg-green-50 text-green-800 border-green-300">
        <CheckCircle2 className="h-3 w-3" />
        Coincide
      </Badge>
    )
  }
  if (feedback === 'DOES_NOT_MATCH') {
    return (
      <Badge variant="outline" className="gap-1 bg-red-50 text-red-800 border-red-300">
        <XCircle className="h-3 w-3" />
        No coincide
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="gap-1 bg-amber-50 text-amber-800 border-amber-300">
      <AlertTriangle className="h-3 w-3" />
      Parcial
    </Badge>
  )
}
