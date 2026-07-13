// components/admin/templates-management-content.tsx
'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { WhatsAppTemplate } from '@prisma/client'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Plus,
  Pencil,
  Copy,
  EyeOff,
  Eye,
  Loader2,
  ShieldCheck,
  History,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

import {
  duplicateTemplate,
  updateTemplate,
} from '@/lib/actions/whatsapp-templates.actions'
import {
  SYSTEM_TEMPLATE_KEYS,
  SYSTEM_TEMPLATE_KEYS_SET,
  getSystemTemplateInfo,
  TEMPLATE_CATEGORIES,
} from '@/lib/constants/whatsapp-template-keys'
import { TemplateFormSheet } from './template-form-dialog'
import { cn } from '@/lib/utils'

interface ExtendedTemplate extends WhatsAppTemplate {
  createdByUser?: { firstName: string | null; fullName: string | null } | null
  updatedByUser?: { firstName: string | null; fullName: string | null } | null
}

interface Props {
  initialTemplates: ExtendedTemplate[]
}

const DAY_30_MS = 30 * 24 * 60 * 60 * 1000

export function TemplatesManagementContent({ initialTemplates }: Props) {
  const router = useRouter()
  const [templates] = useState<ExtendedTemplate[]>(initialTemplates)
  const [showCreate, setShowCreate] = useState(false)
  const [editTemplate, setEditTemplate] = useState<ExtendedTemplate | null>(null)
  const [search, setSearch] = useState('')

  const refresh = () => router.refresh()

  // ===== Stats =====
  const total = templates.length
  const active = templates.filter(t => t.isActive).length
  const now = Date.now()
  const usedRecently = templates.filter(
    t => t.lastUsedAt && now - new Date(t.lastUsedAt).getTime() < DAY_30_MS,
  ).length
  const requiredByCode = templates.filter(t => SYSTEM_TEMPLATE_KEYS_SET.has(t.key)).length
  const requiredMissing = SYSTEM_TEMPLATE_KEYS.filter(
    k =>
      !templates.some(t => t.key === k.key && t.isActive),
  ).length

  // ===== Filter & group =====
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return templates
    return templates.filter(
      t =>
        t.key.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q) ||
        t.content.toLowerCase().includes(q),
    )
  }, [templates, search])

  const systemTemplates = filtered.filter(t => SYSTEM_TEMPLATE_KEYS_SET.has(t.key))
  const customTemplates = filtered.filter(t => !SYSTEM_TEMPLATE_KEYS_SET.has(t.key))
  // Plantillas de sistema que faltan crearse en DB (no aparecen en `templates`).
  const missingSystemKeys = SYSTEM_TEMPLATE_KEYS.filter(
    k => !templates.some(t => t.key === k.key),
  )

  return (
    <div className="container mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Plantillas de WhatsApp
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-2xl">
            Contenido de los mensajes automáticos. El sistema busca cada plantilla por{' '}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">key</code> y reemplaza{' '}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">{`{nombre}`}</code>,{' '}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">{`{fullname}`}</code> y otras
            variables antes de enviar.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/comunicaciones/historial">
              <History className="mr-1.5 h-3.5 w-3.5" />
              Ver historial
            </Link>
          </Button>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Nueva plantilla
          </Button>
        </div>
      </header>

      {/* KPI strip */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Plantillas"
          value={total}
          progress={total > 0 ? { current: active, total, label: `${active} activas` } : undefined}
        />
        <KpiCard
          label="Usadas últimos 30d"
          value={usedRecently}
          progress={
            active > 0
              ? {
                  current: usedRecently,
                  total: active,
                  label:
                    usedRecently < active
                      ? `${active - usedRecently} sin uso reciente`
                      : 'todas las activas',
                }
              : undefined
          }
        />
        <KpiCard
          label="Requeridas por el sistema"
          value={requiredByCode}
          progress={{
            current: requiredByCode,
            total: SYSTEM_TEMPLATE_KEYS.length,
            label:
              requiredMissing > 0
                ? `${requiredMissing} faltan o inactivas`
                : 'todas configuradas',
          }}
          tone={requiredMissing > 0 ? 'warn' : 'ok'}
        />
        <KpiCard
          label="Custom"
          value={customTemplates.length}
          hint="creadas a mano"
        />
      </section>

      {/* Search */}
      <div className="max-w-md space-y-1.5">
        <Label
          htmlFor="templates-search"
          className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
        >
          Buscar
        </Label>
        <Input
          id="templates-search"
          type="search"
          placeholder="Por key, nombre, descripción o contenido…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="h-9"
        />
      </div>

      {/* Sección: requeridas por el sistema */}
      <section>
        <div className="mb-3 flex items-baseline gap-2">
          <h2 className="text-base font-semibold">Requeridas por el sistema</h2>
          <span className="text-xs text-muted-foreground">
            {systemTemplates.length} de {SYSTEM_TEMPLATE_KEYS.length}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mb-4 max-w-2xl">
          Estas keys las consume el código (form completado, cron, etc.). Si falta alguna o
          está inactiva, el envío se omite silenciosamente.
        </p>

        {systemTemplates.length === 0 && search ? (
          <EmptyFiltered />
        ) : (
          <ul className="divide-y border-y">
            {systemTemplates.map(t => (
              <TemplateRow
                key={t.id}
                template={t}
                isSystem
                onEdit={() => setEditTemplate(t)}
                onAfterMutation={refresh}
              />
            ))}
          </ul>
        )}

        {missingSystemKeys.length > 0 && !search && (
          <div className="mt-4 rounded-md border border-dashed p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70 mb-2">
              Faltan crear
            </p>
            <ul className="space-y-1.5">
              {missingSystemKeys.map(k => (
                <li key={k.key} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <code className="text-xs">{k.key}</code>
                    <span className="text-muted-foreground ml-2 text-xs">{k.trigger}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => setShowCreate(true)}
                  >
                    Crear
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Sección: custom */}
      {customTemplates.length > 0 && (
        <section>
          <div className="mb-3 flex items-baseline gap-2">
            <h2 className="text-base font-semibold">Plantillas custom</h2>
            <span className="text-xs text-muted-foreground">
              {customTemplates.length}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mb-4 max-w-2xl">
            Creadas desde el admin. No las dispara ningún trigger automáticamente —
            se usan para envíos manuales y broadcasts.
          </p>
          <ul className="divide-y border-y">
            {customTemplates.map(t => (
              <TemplateRow
                key={t.id}
                template={t}
                onEdit={() => setEditTemplate(t)}
                onAfterMutation={refresh}
              />
            ))}
          </ul>
        </section>
      )}

      {filtered.length === 0 && !search && (
        <div className="rounded-md border border-dashed py-12 text-center">
          <p className="text-sm font-medium">No hay plantillas cargadas</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Empezá creando alguna de las plantillas que el sistema necesita arriba.
          </p>
        </div>
      )}

      {/* Form dialogs */}
      <TemplateFormSheet
        open={showCreate}
        onOpenChange={setShowCreate}
        onSuccess={refresh}
      />
      <TemplateFormSheet
        open={!!editTemplate}
        onOpenChange={open => !open && setEditTemplate(null)}
        template={editTemplate || undefined}
        onSuccess={refresh}
      />
    </div>
  )
}

// ===================== UI bits =====================

function KpiCard({
  label,
  value,
  hint,
  progress,
  tone = 'default',
}: {
  label: string
  value: number
  hint?: React.ReactNode
  progress?: { current: number; total: number; label: string }
  tone?: 'default' | 'ok' | 'warn'
}) {
  const valueColor =
    tone === 'warn'
      ? 'text-warning'
      : tone === 'ok'
      ? 'text-success'
      : 'text-foreground'
  const barColor =
    tone === 'warn'
      ? 'bg-warning'
      : tone === 'ok'
      ? 'bg-success'
      : 'bg-foreground/70'
  const pct =
    progress && progress.total > 0
      ? Math.min(100, Math.round((progress.current / progress.total) * 100))
      : null

  return (
    <div className="rounded-lg border bg-card p-4 transition-colors hover:border-foreground/20">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground/80 font-medium">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <div className={`text-3xl font-semibold tabular-nums ${valueColor}`}>
          {value.toLocaleString('es-AR')}
        </div>
        {progress && pct !== null && (
          <span className="text-xs text-muted-foreground tabular-nums">
            de {progress.total}
          </span>
        )}
      </div>
      {progress && pct !== null ? (
        <div className="mt-3 space-y-1.5">
          <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full transition-all ${barColor}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="text-[11px] text-muted-foreground">{progress.label}</div>
        </div>
      ) : (
        hint != null && <div className="mt-2 text-xs text-muted-foreground">{hint}</div>
      )}
    </div>
  )
}

function TemplateRow({
  template,
  isSystem = false,
  onEdit,
  onAfterMutation,
}: {
  template: ExtendedTemplate
  isSystem?: boolean
  onEdit: () => void
  onAfterMutation: () => void
}) {
  const [busy, setBusy] = useState<'duplicate' | 'toggle' | null>(null)
  const [showToggleDialog, setShowToggleDialog] = useState(false)
  const systemInfo = isSystem ? getSystemTemplateInfo(template.key) : null
  const lastUsedLabel = template.lastUsedAt
    ? formatDistanceToNow(new Date(template.lastUsedAt), { addSuffix: true, locale: es })
    : 'sin uso registrado'

  const handleDuplicate = async () => {
    setBusy('duplicate')
    const r = await duplicateTemplate(template.id)
    setBusy(null)
    if (r.success) {
      toast.success('Plantilla duplicada')
      onAfterMutation()
    } else {
      toast.error(r.error || 'No se pudo duplicar')
    }
  }

  const handleToggleActive = async () => {
    setBusy('toggle')
    const r = await updateTemplate(template.id, { isActive: !template.isActive })
    setBusy(null)
    setShowToggleDialog(false)
    if (r.success) {
      toast.success(template.isActive ? 'Plantilla desactivada' : 'Plantilla activada')
      onAfterMutation()
    } else {
      toast.error(r.error || 'No se pudo actualizar')
    }
  }

  // Vista compacta del contenido (sin saltos de línea ni formatos).
  const contentPreview = template.content
    .replace(/[\*_~`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  const handleRowClick = (e: React.MouseEvent) => {
    // No abrir editar si el click vino de un botón de acción.
    if ((e.target as HTMLElement).closest('[data-row-action]')) return
    onEdit()
  }

  return (
    <>
      <li
        onClick={handleRowClick}
        className="group grid grid-cols-[auto_1fr_auto] items-start gap-4 py-4 cursor-pointer transition-colors hover:bg-muted/40 px-2 -mx-2 rounded"
      >
        <span
          className={cn(
            'mt-1.5 inline-flex h-2 w-2 rounded-full shrink-0',
            template.isActive ? 'bg-success' : 'bg-muted-foreground/40',
          )}
          aria-label={template.isActive ? 'Activa' : 'Inactiva'}
        />

        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-sm font-medium">{template.name}</span>
            <code className="text-xs text-muted-foreground">{template.key}</code>
            {isSystem && (
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center gap-1 rounded-full bg-info-soft text-info px-1.5 py-0.5 text-[10px] font-medium border border-info">
                      <ShieldCheck className="h-3 w-3" />
                      Sistema
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-xs">
                    {systemInfo?.trigger || 'Plantilla referenciada desde el código.'}
                    {systemInfo?.source && (
                      <div className="text-muted-foreground mt-0.5">
                        Disparador: {systemInfo.source}
                      </div>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {template.category && (
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {template.category}
              </span>
            )}
          </div>

          {contentPreview && (
            <p className="text-xs text-muted-foreground line-clamp-1 italic">
              “{contentPreview}”
            </p>
          )}

          <div className="flex items-center gap-3 text-[11px] text-muted-foreground tabular-nums">
            <span>
              <span className="font-medium text-foreground">{template.usageCount}</span> usos
            </span>
            <span className="text-muted-foreground/40">·</span>
            <span>{lastUsedLabel}</span>
            {!template.isActive && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span className="text-warning">inactiva</span>
              </>
            )}
          </div>
        </div>

        <div
          data-row-action
          className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity"
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="h-8"
            data-row-action
          >
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            Editar
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDuplicate}
            disabled={busy === 'duplicate'}
            title="Duplicar"
            className="h-8 w-8"
            data-row-action
          >
            {busy === 'duplicate' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowToggleDialog(true)}
            title={template.isActive ? 'Desactivar' : 'Activar'}
            className="h-8 w-8"
            data-row-action
          >
            {template.isActive ? (
              <EyeOff className="h-3.5 w-3.5" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </li>

      <AlertDialog open={showToggleDialog} onOpenChange={setShowToggleDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {template.isActive ? '¿Desactivar plantilla?' : '¿Activar plantilla?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {template.isActive ? (
                <>
                  {isSystem ? (
                    <>
                      Esta plantilla es <strong>requerida por el sistema</strong>. Si la
                      desactivás, el envío automático que la usa (
                      <span className="text-foreground">{systemInfo?.trigger}</span>) se va a
                      omitir silenciosamente.
                    </>
                  ) : (
                    'La plantilla queda inactiva y no va a estar disponible para envíos manuales.'
                  )}
                </>
              ) : (
                <>
                  Se va a marcar como activa y queda disponible para envíos.{' '}
                  {isSystem && (
                    <>
                      El sistema la consume automáticamente cuando se dispara el evento (
                      <span className="text-foreground">{systemInfo?.trigger}</span>).
                    </>
                  )}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy === 'toggle'}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleActive}
              disabled={busy === 'toggle'}
              className={
                template.isActive
                  ? 'bg-warning hover:bg-warning'
                  : undefined
              }
            >
              {busy === 'toggle' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {template.isActive ? 'Desactivar' : 'Activar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function EmptyFiltered() {
  return (
    <div className="rounded-md border border-dashed py-8 text-center">
      <p className="text-sm text-muted-foreground">
        Ninguna plantilla coincide con la búsqueda.
      </p>
    </div>
  )
}
