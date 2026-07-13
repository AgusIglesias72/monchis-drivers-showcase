'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { toast } from 'sonner'
import { Modal, RadioCards, LoadingButton } from '@/components/ds'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'

const GROUP_OPTIONS = [
  { key: 'personal', label: 'Datos personales', hint: 'Nacimiento, ubicación, contacto de emergencia' },
  { key: 'vehiculo', label: 'Vehículo y documentos', hint: 'Datos del vehículo y URLs de documentos' },
  { key: 'trabajo', label: 'Trabajo y referidos', hint: 'Zona, disponibilidad, cómo se enteró' },
  { key: 'financiero', label: 'Servicios financieros', hint: 'Cuenta Ueno, facturación, Conto' },
  { key: 'pagos', label: 'Pago de equipamiento', hint: 'Monto, comprobante, estado' },
  { key: 'capacitaciones', label: 'Capacitaciones', hint: 'Asignaciones, asistencia, no-shows' },
  { key: 'ruc', label: 'RUC', hint: 'Estado, razón social, verificación' },
  { key: 'estado', label: 'Estado y fechas', hint: 'Estado, archivado, timestamps' },
] as const

type GroupKey = (typeof GROUP_OPTIONS)[number]['key']

interface ExportConfigModalProps {
  status?: string
  searchTerm?: string
  viewingArchived: boolean
  disabled?: boolean
}

export function ExportConfigModal({
  status,
  searchTerm,
  viewingArchived,
  disabled,
}: ExportConfigModalProps) {
  const [open, setOpen] = useState(false)
  const [scope, setScope] = useState<'filtered' | 'all'>('filtered')
  const [includeArchived, setIncludeArchived] = useState(viewingArchived)
  const [groups, setGroups] = useState<Set<GroupKey>>(
    () => new Set(GROUP_OPTIONS.map((g) => g.key)),
  )
  const [isExporting, setIsExporting] = useState(false)

  const hasActiveFilters = Boolean((status && status !== 'all') || searchTerm)

  function toggleGroup(key: GroupKey) {
    setGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function handleOpen() {
    setIncludeArchived(viewingArchived)
    setScope('filtered')
    setOpen(true)
  }

  async function handleExport() {
    setIsExporting(true)
    try {
      const response = await fetch('/api/admin/postulaciones/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope,
          includeArchived: viewingArchived && scope === 'filtered' ? true : includeArchived,
          groups: Array.from(groups),
          status: scope === 'filtered' && status !== 'all' ? status : undefined,
          searchTerm: scope === 'filtered' ? searchTerm || undefined : undefined,
        }),
      })

      if (!response.ok) throw new Error('Error al exportar datos')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `postulaciones_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      if (response.headers.get('X-Truncated')) {
        toast.warning('Exportación completada (truncada a 2000 filas)')
      } else {
        toast.success('Exportación completada exitosamente')
      }
      setOpen(false)
    } catch {
      toast.error('Error al exportar datos')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <>
      <Button
        onClick={handleOpen}
        disabled={disabled}
        variant="outline"
        className="gap-2 whitespace-nowrap"
      >
        <Download className="h-4 w-4" />
        Exportar a Excel
      </Button>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Exportar a Excel"
        description="Elegí qué postulaciones y qué datos incluir en el archivo."
        size="lg"
        footer={
          <LoadingButton
            loading={isExporting}
            disabled={groups.size === 0}
            onClick={handleExport}
          >
            Exportar
          </LoadingButton>
        }
      >
        <div className="space-y-5">
          <RadioCards
            value={scope}
            onChange={(v) => setScope(v as 'filtered' | 'all')}
            columns={2}
            aria-label="Alcance de la exportación"
            options={[
              {
                value: 'filtered',
                label: 'Vista actual',
                description: hasActiveFilters
                  ? 'Respeta el estado y la búsqueda aplicados'
                  : 'Sin filtros activos: equivale a todas',
              },
              {
                value: 'all',
                label: 'Todas las postulaciones',
                description: 'Ignora los filtros aplicados',
              },
            ]}
          />

          <label className="flex items-center gap-2.5 text-sm">
            <Checkbox
              checked={viewingArchived && scope === 'filtered' ? true : includeArchived}
              disabled={viewingArchived && scope === 'filtered'}
              onCheckedChange={(v) => setIncludeArchived(v === true)}
            />
            Incluir postulaciones archivadas
          </label>

          <div>
            <p className="text-sm font-medium mb-2">Datos a incluir</p>
            <p className="text-xs text-muted-foreground mb-3">
              Nombre, cédula, teléfono y email van siempre.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {GROUP_OPTIONS.map((g) => (
                <label
                  key={g.key}
                  className="flex items-start gap-2.5 rounded-[var(--r-md)] border border-border bg-card p-3 text-sm has-[[data-state=checked]]:border-primary/40 has-[[data-state=checked]]:bg-[var(--surface-2)]"
                >
                  <Checkbox
                    className="mt-0.5"
                    checked={groups.has(g.key)}
                    onCheckedChange={() => toggleGroup(g.key)}
                  />
                  <span className="min-w-0">
                    <span className="block font-medium">{g.label}</span>
                    <span className="block text-xs text-muted-foreground">{g.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </>
  )
}
