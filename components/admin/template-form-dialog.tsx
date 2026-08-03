// components/admin/template-form-dialog.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { WhatsAppTemplate } from '@prisma/client'
import { toast } from 'sonner'
import {
  Loader2,
  ShieldCheck,
  AlertTriangle,
  Wand2,
  Bold,
  Italic,
  Strikethrough,
  Code,
} from 'lucide-react'

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { createTemplate, updateTemplate } from '@/lib/actions/whatsapp-templates.actions'
import {
  TEMPLATE_VARIABLES,
  TEMPLATE_CATEGORIES,
  SYSTEM_TEMPLATE_KEYS_SET,
  getSystemTemplateInfo,
} from '@/lib/constants/whatsapp-template-keys'
import { whatsappToHtml } from '@/lib/utils/whatsapp-format'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  template?: WhatsAppTemplate
  onSuccess?: () => void
}

const DEFAULT_PREVIEW_VALUES: Record<string, string> = TEMPLATE_VARIABLES.reduce(
  (acc, v) => {
    acc[v.name] = v.example
    return acc
  },
  {} as Record<string, string>,
)

function renderPreview(content: string): string {
  return content.replace(/\{([^}]+)\}/g, (_, raw) => {
    const key = String(raw).trim().toLowerCase()
    return DEFAULT_PREVIEW_VALUES[key] ?? `{${raw}}`
  })
}

function extractUsedVariables(content: string): string[] {
  const matches = content.match(/\{([^}]+)\}/g) || []
  return Array.from(new Set(matches.map(m => m.slice(1, -1).toLowerCase())))
}

type WrapChar = '*' | '_' | '~' | '`'

export function TemplateFormSheet({ open, onOpenChange, template, onSuccess }: Props) {
  const isEdit = !!template
  const contentRef = useRef<HTMLTextAreaElement>(null)

  const [formData, setFormData] = useState({
    key: '',
    name: '',
    description: '',
    content: '',
    category: 'general',
    order: 0,
    isActive: true,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (template) {
      setFormData({
        key: template.key,
        name: template.name,
        description: template.description || '',
        content: template.content,
        category: template.category || 'general',
        order: template.order,
        isActive: template.isActive,
      })
    } else {
      setFormData({
        key: '',
        name: '',
        description: '',
        content: '',
        category: 'general',
        order: 0,
        isActive: true,
      })
    }
  }, [template, open])

  const isSystemKey = SYSTEM_TEMPLATE_KEYS_SET.has(formData.key)
  const systemInfo = isSystemKey ? getSystemTemplateInfo(formData.key) : null
  const usedVariables = extractUsedVariables(formData.content)
  const unknownVariables = usedVariables.filter(
    v => !TEMPLATE_VARIABLES.some(tv => tv.name === v),
  )
  const previewContent = formData.content
    ? renderPreview(formData.content)
    : '— el preview aparece acá cuando escribís el contenido —'

  const insertVariable = (varName: string) => {
    const textarea = contentRef.current
    if (!textarea) {
      setFormData(d => ({ ...d, content: d.content + `{${varName}}` }))
      return
    }
    const start = textarea.selectionStart ?? formData.content.length
    const end = textarea.selectionEnd ?? formData.content.length
    const next =
      formData.content.slice(0, start) + `{${varName}}` + formData.content.slice(end)
    setFormData(d => ({ ...d, content: next }))
    // Mantener foco y mover cursor después de la variable insertada.
    requestAnimationFrame(() => {
      textarea.focus()
      const pos = start + varName.length + 2
      textarea.setSelectionRange(pos, pos)
    })
  }

  /**
   * Envuelve la selección actual con el caracter de formato de WhatsApp.
   * Si no hay selección, inserta los dos marcadores y deja el cursor en el medio.
   */
  const wrapSelection = (wrap: WrapChar) => {
    const textarea = contentRef.current
    if (!textarea) return
    const start = textarea.selectionStart ?? 0
    const end = textarea.selectionEnd ?? 0
    const before = formData.content.slice(0, start)
    const selected = formData.content.slice(start, end)
    const after = formData.content.slice(end)
    const next = `${before}${wrap}${selected}${wrap}${after}`
    setFormData(d => ({ ...d, content: next }))
    requestAnimationFrame(() => {
      textarea.focus()
      if (selected.length > 0) {
        // Mantener la selección dentro de los marcadores.
        textarea.setSelectionRange(start + 1, end + 1)
      } else {
        const cursor = start + 1
        textarea.setSelectionRange(cursor, cursor)
      }
    })
  }

  const handleContentKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!(e.metaKey || e.ctrlKey)) return
    const key = e.key.toLowerCase()
    if (key === 'b') {
      e.preventDefault()
      wrapSelection('*')
    } else if (key === 'i') {
      e.preventDefault()
      wrapSelection('_')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      if (isEdit && template) {
        const result = await updateTemplate(template.id, {
          name: formData.name,
          description: formData.description || undefined,
          content: formData.content,
          category: formData.category || undefined,
          order: formData.order,
          isActive: formData.isActive,
        })
        if (result.success) {
          toast.success('Plantilla actualizada')
          onSuccess?.()
          onOpenChange(false)
        } else {
          toast.error(result.error || 'No se pudo actualizar')
        }
      } else {
        const result = await createTemplate({
          key: formData.key,
          name: formData.name,
          description: formData.description || undefined,
          content: formData.content,
          category: formData.category || undefined,
          order: formData.order,
        })
        if (result.success) {
          toast.success('Plantilla creada')
          onSuccess?.()
          onOpenChange(false)
        } else {
          toast.error(result.error || 'No se pudo crear')
        }
      }
    } catch (err) {
      toast.error('Error inesperado')
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto p-0">
        <form onSubmit={handleSubmit} className="flex h-full flex-col">
          <SheetHeader className="px-6 pt-6 pb-4 border-b">
            <SheetTitle>{isEdit ? 'Editar plantilla' : 'Nueva plantilla'}</SheetTitle>
            <SheetDescription>
              {isEdit
                ? 'Cambios se aplican apenas guardás. Los envíos en curso no se afectan.'
                : 'Definí la key, contenido y categoría. La plantilla queda activa por defecto.'}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_320px] divide-y lg:divide-y-0 lg:divide-x">
            {/* Form */}
            <div className="space-y-5 p-6">
              {/* Key */}
              <div className="space-y-1.5">
                <Label htmlFor="t-key" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Identificador (key)
                  {!isEdit && <span className="ml-1 text-destructive">*</span>}
                </Label>
                <Input
                  id="t-key"
                  value={formData.key}
                  onChange={e =>
                    setFormData(d => ({
                      ...d,
                      key: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''),
                    }))
                  }
                  placeholder="capacitaciones"
                  required
                  disabled={isEdit}
                  pattern="[a-z0-9_-]+"
                  className="font-mono text-sm"
                />
                <p className="text-[11px] text-muted-foreground">
                  {isEdit
                    ? 'El identificador no se puede cambiar después de crear la plantilla.'
                    : 'Minúsculas, números, guiones y guiones bajos. El código busca la plantilla por esta key.'}
                </p>
                {!isEdit && isSystemKey && systemInfo && (
                  <div className="mt-2 rounded-md border border-info bg-info-soft p-3 text-xs">
                    <div className="flex items-start gap-2">
                      <ShieldCheck className="h-3.5 w-3.5 text-info mt-0.5 shrink-0" />
                      <div>
                        <div className="font-medium text-info">
                          Esta key la consume el sistema
                        </div>
                        <div className="mt-0.5 text-info/80">
                          Se va a disparar cuando: {systemInfo.trigger}.
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Nombre */}
              <div className="space-y-1.5">
                <Label htmlFor="t-name" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Nombre <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="t-name"
                  value={formData.name}
                  onChange={e => setFormData(d => ({ ...d, name: e.target.value }))}
                  placeholder="Postulación completada"
                  required
                />
              </div>

              {/* Descripción */}
              <div className="space-y-1.5">
                <Label htmlFor="t-desc" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Descripción
                </Label>
                <Input
                  id="t-desc"
                  value={formData.description}
                  onChange={e =>
                    setFormData(d => ({ ...d, description: e.target.value }))
                  }
                  placeholder="Confirmación post-form al postulante"
                />
                <p className="text-[11px] text-muted-foreground">
                  Para que el equipo entienda cuándo se usa. No se envía al postulante.
                </p>
              </div>

              {/* Contenido */}
              <div className="space-y-1.5">
                <div className="flex items-end justify-between gap-2">
                  <Label
                    htmlFor="t-content"
                    className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                  >
                    Contenido <span className="text-destructive">*</span>
                  </Label>
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {formData.content.length} caracteres
                  </span>
                </div>

                <div className="rounded-md border bg-background overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1">
                  <FormatToolbar onWrap={wrapSelection} />
                  <Textarea
                    id="t-content"
                    ref={contentRef}
                    value={formData.content}
                    onChange={e => setFormData(d => ({ ...d, content: e.target.value }))}
                    onKeyDown={handleContentKeyDown}
                    required
                    rows={10}
                    className="font-mono text-sm leading-relaxed border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 resize-none"
                    placeholder={`¡Hola {nombre}! 🎉\n\nGracias por completar tu *postulación*...`}
                  />
                </div>

                <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                  <span>
                    Soporta <strong className="text-foreground">*negrita*</strong>,{' '}
                    <em className="text-foreground">_cursiva_</em>,{' '}
                    <s className="text-foreground">~tachado~</s> y{' '}
                    <code className="text-foreground">`mono`</code> al estilo WhatsApp.
                  </span>
                  <kbd className="hidden sm:inline rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                    ⌘B / ⌘I
                  </kbd>
                </div>

                {unknownVariables.length > 0 && (
                  <div className="flex items-start gap-1.5 text-[11px] text-warning">
                    <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                    <span>
                      Variables sin soporte: {unknownVariables.map(v => `{${v}}`).join(', ')}.
                      Van a aparecer vacías al enviar.
                    </span>
                  </div>
                )}
              </div>

              {/* Categoría + Orden + Activa */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="t-cat"
                    className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                  >
                    Categoría
                  </Label>
                  <Select
                    value={formData.category}
                    onValueChange={v => setFormData(d => ({ ...d, category: v }))}
                  >
                    <SelectTrigger id="t-cat" className="cursor-pointer">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TEMPLATE_CATEGORIES.map(c => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="t-order"
                    className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                  >
                    Orden
                  </Label>
                  <Input
                    id="t-order"
                    type="number"
                    min={0}
                    value={formData.order}
                    onChange={e =>
                      setFormData(d => ({ ...d, order: parseInt(e.target.value) || 0 }))
                    }
                  />
                </div>
              </div>

              {/* Activa */}
              <div className="flex items-center justify-between rounded-md border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="t-active" className="text-sm font-medium">
                    Plantilla activa
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {isSystemKey
                      ? 'Si está inactiva, el envío automático que la usa se omite.'
                      : 'Inactiva = no aparece para envíos manuales ni broadcasts.'}
                  </p>
                </div>
                <Switch
                  id="t-active"
                  className="cursor-pointer"
                  checked={formData.isActive}
                  onCheckedChange={checked =>
                    setFormData(d => ({ ...d, isActive: checked }))
                  }
                />
              </div>
            </div>

            {/* Preview & vars */}
            <aside className="space-y-5 p-6 bg-muted/30">
              <div>
                <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                  Preview con datos de ejemplo
                </h3>
                <WhatsAppBubble content={previewContent} />
              </div>

              <div>
                <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Wand2 className="h-3 w-3" />
                  Variables
                </h3>
                <p className="text-[11px] text-muted-foreground mb-2">
                  Click para insertar. Se reemplazan al enviar.
                </p>
                <ul className="space-y-1.5">
                  {TEMPLATE_VARIABLES.map(v => {
                    const used = usedVariables.includes(v.name)
                    return (
                      <li key={v.name}>
                        <button
                          type="button"
                          onClick={() => insertVariable(v.name)}
                          className={cn(
                            'w-full cursor-pointer text-left rounded-md border px-2 py-1.5 text-xs transition-colors',
                            'hover:bg-background hover:border-foreground/30',
                            used ? 'border-foreground/20 bg-background' : 'border-transparent',
                          )}
                        >
                          <div className="flex items-baseline justify-between gap-2">
                            <code className="font-mono text-xs">{`{${v.name}}`}</code>
                            <span className="text-muted-foreground text-[10px]">
                              {v.example}
                            </span>
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                            {v.description}
                          </div>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </aside>
          </div>

          <SheetFooter className="px-6 py-4 border-t bg-background">
            <div className="flex w-full items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEdit ? 'Guardar cambios' : 'Crear plantilla'}
              </Button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

function FormatToolbar({ onWrap }: { onWrap: (w: WrapChar) => void }) {
  return (
    <div
      role="toolbar"
      aria-label="Formato del mensaje"
      className="flex items-center gap-0.5 border-b bg-muted/30 px-2 py-1"
    >
      <ToolbarButton
        label="Negrita (⌘B)"
        onClick={() => onWrap('*')}
        icon={<Bold className="h-3.5 w-3.5" />}
      />
      <ToolbarButton
        label="Cursiva (⌘I)"
        onClick={() => onWrap('_')}
        icon={<Italic className="h-3.5 w-3.5" />}
      />
      <ToolbarButton
        label="Tachado"
        onClick={() => onWrap('~')}
        icon={<Strikethrough className="h-3.5 w-3.5" />}
      />
      <span className="mx-1 h-4 w-px bg-border" aria-hidden />
      <ToolbarButton
        label="Monoespaciado"
        onClick={() => onWrap('`')}
        icon={<Code className="h-3.5 w-3.5" />}
      />
    </div>
  )
}

function ToolbarButton({
  label,
  onClick,
  icon,
}: {
  label: string
  onClick: () => void
  icon: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        'inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded text-muted-foreground',
        'hover:bg-background hover:text-foreground transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}
    >
      {icon}
    </button>
  )
}

function WhatsAppBubble({ content }: { content: string }) {
  const html = whatsappToHtml(content)
  return (
    <div className="rounded-lg bg-[#dcf8c6] dark:bg-[#005c4b] p-3 pb-5 text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed shadow-sm relative">
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <div className="absolute bottom-1 right-2 text-[10px] text-foreground/60 tabular-nums">
        ahora ✓✓
      </div>
    </div>
  )
}

// Compat: el archivo se sigue importando como template-form-dialog en algunos
// sitios — mantenemos un re-export con el nombre viejo.
export { TemplateFormSheet as TemplateFormDialog }
