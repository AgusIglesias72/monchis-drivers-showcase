'use client'

import { useState, useTransition } from 'react'
import { Bot, Save, Copy, Check, RotateCcw, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

import { AdminHeader } from '@/components/admin/admin-header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'

interface OverrideShape {
  id: string
  systemPromptOverride: string | null
  systemPromptAddendum: string | null
  pipelineNotes: string | null
  toolsNotes: string | null
  maxCedulaImages: number | null
  targetImageBytes: number | null
  rucRefreshMaxAgeDays: number | null
  haikuModelOverride: string | null
  updatedAt: Date | string
  updatedBy: string | null
}

interface CodeShape {
  systemPrompt: string
  pipelineDescription: string
  toolsCatalog: string
}

interface DefaultsShape {
  haikuModel: string
  maxCedulaImages: number
  targetImageBytes: number
  rucRefreshMaxAgeDays: number
}

interface Props {
  initialOverride: OverrideShape | null
  code: CodeShape
  defaults: DefaultsShape
}

interface FormState {
  systemPromptOverride: string
  systemPromptAddendum: string
  pipelineNotes: string
  toolsNotes: string
  maxCedulaImages: string
  targetImageBytes: string
  rucRefreshMaxAgeDays: string
  haikuModelOverride: string
}

function toFormState(o: OverrideShape | null): FormState {
  return {
    systemPromptOverride: o?.systemPromptOverride ?? '',
    systemPromptAddendum: o?.systemPromptAddendum ?? '',
    pipelineNotes: o?.pipelineNotes ?? '',
    toolsNotes: o?.toolsNotes ?? '',
    maxCedulaImages: o?.maxCedulaImages != null ? String(o.maxCedulaImages) : '',
    targetImageBytes: o?.targetImageBytes != null ? String(o.targetImageBytes) : '',
    rucRefreshMaxAgeDays: o?.rucRefreshMaxAgeDays != null ? String(o.rucRefreshMaxAgeDays) : '',
    haikuModelOverride: o?.haikuModelOverride ?? '',
  }
}

export function AgentConfigContent({ initialOverride, code, defaults }: Props) {
  const [form, setForm] = useState<FormState>(toFormState(initialOverride))
  const [lastSaved, setLastSaved] = useState<OverrideShape | null>(initialOverride)
  const [isPending, startTransition] = useTransition()

  const isDirty =
    form.systemPromptOverride !== (lastSaved?.systemPromptOverride ?? '') ||
    form.systemPromptAddendum !== (lastSaved?.systemPromptAddendum ?? '') ||
    form.pipelineNotes !== (lastSaved?.pipelineNotes ?? '') ||
    form.toolsNotes !== (lastSaved?.toolsNotes ?? '') ||
    form.maxCedulaImages !== (lastSaved?.maxCedulaImages != null ? String(lastSaved.maxCedulaImages) : '') ||
    form.targetImageBytes !== (lastSaved?.targetImageBytes != null ? String(lastSaved.targetImageBytes) : '') ||
    form.rucRefreshMaxAgeDays !== (lastSaved?.rucRefreshMaxAgeDays != null ? String(lastSaved.rucRefreshMaxAgeDays) : '') ||
    form.haikuModelOverride !== (lastSaved?.haikuModelOverride ?? '')

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleSave() {
    startTransition(async () => {
      const body = {
        systemPromptOverride: form.systemPromptOverride || null,
        systemPromptAddendum: form.systemPromptAddendum || null,
        pipelineNotes: form.pipelineNotes || null,
        toolsNotes: form.toolsNotes || null,
        maxCedulaImages: form.maxCedulaImages ? parseInt(form.maxCedulaImages, 10) : null,
        targetImageBytes: form.targetImageBytes ? parseInt(form.targetImageBytes, 10) : null,
        rucRefreshMaxAgeDays: form.rucRefreshMaxAgeDays ? parseInt(form.rucRefreshMaxAgeDays, 10) : null,
        haikuModelOverride: form.haikuModelOverride || null,
      }

      const res = await fetch('/api/admin/agent-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || 'Error al guardar')
        return
      }

      const data = await res.json()
      setLastSaved(data.override)
      setForm(toFormState(data.override))
      toast.success('Configuración guardada — se aplica en runs nuevos en ~30s')
    })
  }

  return (
    <div className="flex flex-1 flex-col">
      <AdminHeader breadcrumbs={[{ label: 'Configuración' }]} />

      <div className="flex-1 p-8 space-y-6 container mx-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
            <p className="text-muted-foreground mt-1">
              Iterá sobre el prompt del agente, las reglas y constantes operativas sin necesidad de deploy.
            </p>
          </div>
          <Button
            onClick={handleSave}
            disabled={!isDirty || isPending}
            className="bg-brand text-brand-foreground hover:bg-brand-hover"
          >
            <Save className="mr-2 h-4 w-4" />
            {isPending ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </div>

        <Tabs defaultValue="agente">
          <TabsList>
            <TabsTrigger value="agente" className="gap-1.5">
              <Bot className="h-3.5 w-3.5" />
              Agente IA
            </TabsTrigger>
          </TabsList>

          <TabsContent value="agente" className="mt-6 space-y-6">
            <SystemPromptCard
              codePrompt={code.systemPrompt}
              overrideValue={form.systemPromptOverride}
              onOverrideChange={(v) => update('systemPromptOverride', v)}
              addendum={form.systemPromptAddendum}
              onAddendumChange={(v) => update('systemPromptAddendum', v)}
            />

            <PipelineCard
              description={code.pipelineDescription}
              notes={form.pipelineNotes}
              onNotesChange={(v) => update('pipelineNotes', v)}
            />

            <ToolsCard
              catalog={code.toolsCatalog}
              notes={form.toolsNotes}
              onNotesChange={(v) => update('toolsNotes', v)}
            />

            <OperationalConstantsCard form={form} defaults={defaults} onChange={update} />

            {lastSaved?.updatedAt && (
              <p className="text-xs text-muted-foreground">
                Último cambio guardado: {new Date(lastSaved.updatedAt).toLocaleString('es-PY')}
                {lastSaved.updatedBy && lastSaved.updatedBy !== 'SYSTEM' && ` por ${lastSaved.updatedBy}`}
              </p>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function SystemPromptCard({
  codePrompt,
  overrideValue,
  onOverrideChange,
  addendum,
  onAddendumChange,
}: {
  codePrompt: string
  overrideValue: string | null | undefined
  onOverrideChange: (v: string) => void
  addendum: string | null | undefined
  onAddendumChange: (v: string) => void
}) {
  // Defensivo: si el server passes null/undefined (ej. la fila se creó antes de
  // que el campo existiera), tratamos como string vacío.
  const safeOverride = overrideValue ?? ''
  const safeAddendum = addendum ?? ''

  // editMode = true cuando hay un override guardado o el admin acaba de toggle ON.
  // Si el admin lo activa por primera vez y no hay override, precargamos con el del código.
  const [editMode, setEditMode] = useState(safeOverride.length > 0)
  const isCustom = safeOverride.length > 0

  function handleToggle(next: boolean) {
    setEditMode(next)
    if (next && safeOverride === '') {
      // Precargar con el prompt del código para que el admin lo edite encima.
      onOverrideChange(codePrompt)
    } else if (!next) {
      // Volver al default del código (limpia el override).
      onOverrideChange('')
    }
  }

  function handleRestoreDefault() {
    if (!confirm('Restaurar al prompt del código y descartar tu versión personalizada?')) return
    onOverrideChange('')
    setEditMode(false)
    toast.success('Prompt restaurado al default del código (guardá para aplicar)')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Prompt</CardTitle>
        <CardDescription>
          El prompt principal del agente. Por defecto se usa el del código; podés activar &ldquo;Personalizar&rdquo; para
          editarlo enteramente. Las instrucciones adicionales se concatenan al final en cualquier caso.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/40 p-3">
          <div className="flex-1">
            <Label htmlFor="custom-toggle" className="text-sm font-semibold cursor-pointer">
              Personalizar prompt completo
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              {editMode
                ? 'Estás editando un prompt personalizado. Reemplaza completamente al del código.'
                : 'Usando el prompt default del código (read-only).'}
            </p>
          </div>
          <Switch id="custom-toggle" checked={editMode} onCheckedChange={handleToggle} />
        </div>

        {editMode ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="prompt-editor" className="text-sm font-semibold">
                Prompt personalizado
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground tabular-nums">
                  {safeOverride.length.toLocaleString('es-PY')} caracteres
                </span>
                {isCustom && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={handleRestoreDefault}
                  >
                    <RotateCcw className="mr-1 h-3 w-3" />
                    Restaurar default
                  </Button>
                )}
              </div>
            </div>
            <Textarea
              id="prompt-editor"
              value={safeOverride}
              onChange={(e) => onOverrideChange(e.target.value)}
              rows={28}
              className="font-mono text-xs leading-relaxed"
              spellCheck={false}
            />
            <div className="flex items-start gap-2 rounded-md border border-warning bg-warning-soft p-2.5 text-xs text-warning">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                Cambios al prompt afectan a TODAS las corridas siguientes. Si rompés el formato JSON esperado, el
                agente puede empezar a fallar. Probá primero con un par de runs DRY_RUN antes de dejarlo activo
                en el cron.
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-semibold">Prompt del código (read-only)</Label>
              <CopyButton text={codePrompt} />
            </div>
            <pre className="text-xs bg-muted rounded-md p-4 max-h-80 overflow-auto whitespace-pre-wrap font-mono leading-relaxed">
              {codePrompt}
            </pre>
          </div>
        )}

        <Separator />

        <div className="space-y-2">
          <Label htmlFor="addendum" className="text-sm font-semibold">
            Instrucciones adicionales
          </Label>
          <p className="text-xs text-muted-foreground">
            Se concatenan al final del system prompt (sea el del código o el personalizado) bajo el header{' '}
            <code className="text-[10px] bg-muted px-1 rounded">## Instrucciones adicionales</code>. Útil para
            iterar reglas finas sin tocar el prompt principal.
          </p>
          <Textarea
            id="addendum"
            value={safeAddendum}
            onChange={(e) => onAddendumChange(e.target.value)}
            placeholder="Ej: Si una cédula extranjera tiene formato 'V12345678' (venezolano), aceptala como válida aunque no tenga MRZ paraguayo."
            rows={8}
            className="font-mono text-xs"
          />
        </div>
      </CardContent>
    </Card>
  )
}

function PipelineCard({
  description,
  notes,
  onNotesChange,
}: {
  description: string
  notes: string
  onNotesChange: (v: string) => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Reglas determinísticas del pipeline</CardTitle>
        <CardDescription>
          Estas reglas viven en código (no se ejecutan desde acá). Las notas abajo son un canal de feedback —
          quedan guardadas para que el dev las aplique en un próximo PR.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <Label className="text-sm font-semibold mb-2 block">Pipeline actual (read-only)</Label>
          <pre className="text-xs bg-muted rounded-md p-4 max-h-96 overflow-auto whitespace-pre-wrap leading-relaxed">
            {description}
          </pre>
        </div>

        <Separator />

        <div className="space-y-2">
          <Label htmlFor="pipeline-notes" className="text-sm font-semibold">
            Notas / sugerencias de mejora
          </Label>
          <p className="text-xs text-muted-foreground">
            ¿Querés que se modifique alguna regla? Escribilo acá. NO se aplica automáticamente; el dev lo lee y
            lo aplica en código si tiene sentido.
          </p>
          <Textarea
            id="pipeline-notes"
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Ej: El paso 4 'Detección de typo' debería tolerar ≤3 caracteres de diferencia en cédulas largas (8+ dígitos), no solo ≤2."
            rows={6}
          />
        </div>
      </CardContent>
    </Card>
  )
}

function ToolsCard({
  catalog,
  notes,
  onNotesChange,
}: {
  catalog: string
  notes: string
  onNotesChange: (v: string) => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tools / acciones del agente</CardTitle>
        <CardDescription>
          Lista de acciones que el agente puede proponer. Igual que el pipeline: la lista vive en código,
          las notas son feedback.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <Label className="text-sm font-semibold mb-2 block">Catálogo actual (read-only)</Label>
          <pre className="text-xs bg-muted rounded-md p-4 max-h-72 overflow-auto whitespace-pre-wrap leading-relaxed">
            {catalog}
          </pre>
        </div>

        <Separator />

        <div className="space-y-2">
          <Label htmlFor="tools-notes" className="text-sm font-semibold">
            Notas / nuevas tools propuestas
          </Label>
          <Textarea
            id="tools-notes"
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Ej: Falta una tool 'propose_request_better_photo' que pida al postulante una foto más nítida sin rechazar el documento."
            rows={5}
          />
        </div>
      </CardContent>
    </Card>
  )
}

function OperationalConstantsCard({
  form,
  defaults,
  onChange,
}: {
  form: FormState
  defaults: DefaultsShape
  onChange: <K extends keyof FormState>(key: K, value: FormState[K]) => void
}) {
  const targetMb = form.targetImageBytes
    ? (parseInt(form.targetImageBytes, 10) / 1024 / 1024).toFixed(2)
    : null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Constantes operativas</CardTitle>
        <CardDescription>
          Estos sí aplican runtime. Si dejás el campo vacío, el agente usa el default del código (entre paréntesis).
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="max-cedula">Máximo de imágenes de cédula a analizar</Label>
          <Input
            id="max-cedula"
            type="number"
            min={1}
            max={10}
            value={form.maxCedulaImages}
            onChange={(e) => onChange('maxCedulaImages', e.target.value)}
            placeholder={`Default: ${defaults.maxCedulaImages}`}
          />
          <p className="text-xs text-muted-foreground">
            Si el postulante subió más, se analizan las N más recientes. Evita 413 (request_too_large).
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ruc-age">RUC: días máx. antes de refrescar</Label>
          <Input
            id="ruc-age"
            type="number"
            min={0}
            max={90}
            value={form.rucRefreshMaxAgeDays}
            onChange={(e) => onChange('rucRefreshMaxAgeDays', e.target.value)}
            placeholder={`Default: ${defaults.rucRefreshMaxAgeDays}`}
          />
          <p className="text-xs text-muted-foreground">
            Si el dato persistido es más viejo que esto, vuelve a consultar a turuc.com.py.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="target-bytes">Target raw size por imagen (bytes)</Label>
          <Input
            id="target-bytes"
            type="number"
            min={512 * 1024}
            max={5 * 1024 * 1024}
            value={form.targetImageBytes}
            onChange={(e) => onChange('targetImageBytes', e.target.value)}
            placeholder={`Default: ${defaults.targetImageBytes} (${(defaults.targetImageBytes / 1024 / 1024).toFixed(2)} MB)`}
          />
          <p className="text-xs text-muted-foreground">
            {targetMb ? `≈ ${targetMb} MB.` : ''} Imágenes raw más grandes se comprimen con sharp (quality dinámico → resize).
            Bajalo para forzar más compresión, subilo para preservar más calidad.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="haiku-model">Modelo (override)</Label>
          <Input
            id="haiku-model"
            type="text"
            value={form.haikuModelOverride}
            onChange={(e) => onChange('haikuModelOverride', e.target.value)}
            placeholder={`Default: ${defaults.haikuModel}`}
          />
          <p className="text-xs text-muted-foreground">
            ID exacto del modelo Anthropic. Útil para A/B testing (ej. probar Sonnet 4.6 contra Haiku 4.5).
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-7 px-2 text-xs"
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        })
      }}
    >
      {copied ? <Check className="mr-1 h-3 w-3" /> : <Copy className="mr-1 h-3 w-3" />}
      {copied ? 'Copiado' : 'Copiar'}
    </Button>
  )
}
