// components/admin/onboarding/event-settings-section.tsx

"use client"

import { useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  Loader2,
  Save,
  RotateCcw,
  Calendar as CalendarIcon,
  MapPin,
  Settings,
  Info,
  Users,
  Edit,
  CheckCircle,
  XCircle,
  PauseCircle,
  PlayCircle,
} from 'lucide-react'
import { updateOnboardingEvent } from '@/lib/actions/onboarding.actions'
import { toast } from 'sonner'

function toYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function parseYmd(s: string | undefined): Date | undefined {
  if (!s) return undefined
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (!m) return undefined
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Borrador', icon: Edit, className: 'bg-muted text-foreground border-border' },
  { value: 'SCHEDULED', label: 'Programado', icon: CalendarIcon, className: 'bg-info-soft text-info border-info' },
  { value: 'IN_PROGRESS', label: 'En curso', icon: PlayCircle, className: 'bg-warning-soft text-warning border-warning' },
  { value: 'COMPLETED', label: 'Completado', icon: CheckCircle, className: 'bg-success-soft text-success border-success' },
  { value: 'CANCELLED', label: 'Cancelado', icon: XCircle, className: 'bg-danger-soft text-destructive border-destructive' },
  { value: 'POSTPONED', label: 'Pospuesto', icon: PauseCircle, className: 'bg-purple-100 text-purple-800 border-purple-200' },
] as const

function SectionHeader({ icon: Icon, title, description }: { icon: typeof Settings; title: string; description?: string }) {
  return (
    <div className="mb-3">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground inline-flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </h4>
      {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
    </div>
  )
}

interface AdminUserOption {
  id: string
  fullName: string | null
  firstName: string | null
  lastName: string | null
  email: string
  profileImageUrl: string | null
}

interface EventSettingsSectionProps {
  event: any
  onUpdate: () => void
  adminUsers?: AdminUserOption[]
}

function adminDisplayName(u: AdminUserOption): string {
  if (u.fullName) return u.fullName
  const fl = [u.firstName, u.lastName].filter(Boolean).join(' ')
  return fl || u.email
}

function adminInitials(u: AdminUserOption): string {
  const name = adminDisplayName(u).trim()
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '–'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function AdminAvatar({ user, size = 24 }: { user: AdminUserOption; size?: number }) {
  if (user.profileImageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.profileImageUrl}
        alt={adminDisplayName(user)}
        width={size}
        height={size}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <span
      className="inline-flex items-center justify-center rounded-full bg-muted text-muted-foreground font-semibold flex-shrink-0"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
    >
      {adminInitials(user)}
    </span>
  )
}

// Valores por defecto (mismos que el dialog)
const DEFAULT_LOCATION = 'HUB'
const DEFAULT_ADDRESS = 'México 850'
const FULL_ADDRESS = 'Mexico N° 850 e/ F.R. Moreno y Manuel Domínguez, Asunción, Paraguay'

export function EventSettingsSection({ event, onUpdate, adminUsers = [] }: EventSettingsSectionProps) {
  const [loading, setLoading] = useState(false)
  const initialFormData = {
    title: event.title || '',
    organizer: event.organizer || '',
    description: event.description || '',
    scheduledDate: event.scheduledDate.split('T')[0],
    startTime: event.startTime || '09:00',
    endTime: event.endTime || '12:00',
    location: event.location || DEFAULT_LOCATION,
    locationAddress: event.locationAddress || DEFAULT_ADDRESS,
    meetingLink: event.meetingLink || '',
    maxCapacity: event.maxCapacity || '20',
    status: event.status,
    notes: event.notes || '',
  }
  const [formData, setFormData] = useState(initialFormData)

  const hasChanges = JSON.stringify(formData) !== JSON.stringify(initialFormData)

  const resetForm = () => setFormData(initialFormData)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const result = await updateOnboardingEvent(event.id, {
      ...formData,
      maxCapacity: formData.maxCapacity ? parseInt(formData.maxCapacity) : undefined,
    })

    if (result.success) {
      toast.success('Evento actualizado correctamente')
      onUpdate()
    } else {
      toast.error(result.error || 'Error al actualizar el evento')
    }

    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header flat — mismo patrón que "Agregar Participantes" */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuración
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Editá los datos del evento.
          </p>
        </div>
        {hasChanges && (
          <span className="inline-flex items-center gap-1 text-xs text-warning px-2 py-1 rounded-md bg-warning-soft border border-warning">
            <Info className="h-3 w-3" />
            Cambios sin guardar
          </span>
        )}
      </div>

      {/* Una sola Card consolidada con secciones separadas por divider */}
      <div className="rounded-lg border bg-card divide-y">
        {/* Información general */}
        <section className="p-4 md:p-5">
          <SectionHeader icon={Info} title="Información general" />
          <div className="space-y-3">
            {/* Título + Organizador en la misma fila */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  disabled={loading}
                  placeholder="Ej: OnBoarding Octubre — Zona Norte"
                />
                <p className="text-xs text-muted-foreground">
                  Si lo dejás vacío, se genera automáticamente.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="organizer">Organizador *</Label>
                <Select
                  value={formData.organizer || undefined}
                  onValueChange={(value) => setFormData({ ...formData, organizer: value })}
                  disabled={loading || adminUsers.length === 0}
                >
                  <SelectTrigger id="organizer" className="w-full cursor-pointer">
                    <SelectValue placeholder="Seleccionar organizador">
                      {(() => {
                        const current = adminUsers.find((u) => u.id === formData.organizer)
                        if (current) {
                          return (
                            <span className="inline-flex items-center gap-2 text-left min-w-0">
                              <AdminAvatar user={current} size={20} />
                              <span className="capitalize text-sm truncate">{adminDisplayName(current)}</span>
                            </span>
                          )
                        }
                        if (formData.organizer) {
                          return (
                            <span className="text-sm text-muted-foreground truncate">
                              {formData.organizer}
                            </span>
                          )
                        }
                        return null
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-[320px]">
                    {formData.organizer &&
                      !adminUsers.some((u) => u.id === formData.organizer) && (
                        <SelectItem value={formData.organizer} className="cursor-pointer">
                          <span className="text-sm">{formData.organizer}</span>
                          <span className="text-xs text-muted-foreground ml-2">actual</span>
                        </SelectItem>
                      )}
                    {adminUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id} className="cursor-pointer py-2">
                        <span className="inline-flex items-center gap-2">
                          <AdminAvatar user={u} size={22} />
                          <span className="flex flex-col leading-tight">
                            <span className="capitalize text-sm">{adminDisplayName(u)}</span>
                            <span className="text-[11px] text-muted-foreground">{u.email}</span>
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                    {adminUsers.length === 0 && (
                      <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                        No hay administradores activos
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                disabled={loading}
                placeholder="Descripción breve del evento"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Estado</Label>
              <div
                role="radiogroup"
                aria-label="Estado del evento"
                className="flex flex-wrap gap-1.5"
              >
                {STATUS_OPTIONS.map((opt) => {
                  const active = formData.status === opt.value
                  const Icon = opt.icon
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setFormData({ ...formData, status: opt.value })}
                      disabled={loading}
                      className={`inline-flex items-center justify-center gap-1 px-2 py-1 rounded-md border text-[11px] font-medium transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                        active
                          ? `${opt.className} shadow-sm`
                          : 'bg-background border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                      }`}
                    >
                      <Icon className="h-3 w-3" />
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Fecha y hora */}
        <section className="p-4 md:p-5">
          <SectionHeader icon={CalendarIcon} title="Fecha y hora" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Fecha *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={loading}
                    className={cn(
                      'w-full justify-start text-left font-normal cursor-pointer',
                      !formData.scheduledDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.scheduledDate
                      ? format(parseYmd(formData.scheduledDate)!, 'EEE dd MMM yyyy', { locale: es })
                      : 'Elegir fecha'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={parseYmd(formData.scheduledDate)}
                    onSelect={(d) => {
                      if (d) setFormData({ ...formData, scheduledDate: toYmd(d) })
                    }}
                    locale={es}
                    showOutsideDays={false}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="startTime">Hora inicio *</Label>
              <Input
                id="startTime"
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                disabled={loading}
                required
                className="cursor-pointer"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endTime">Hora fin</Label>
              <Input
                id="endTime"
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                disabled={loading}
                className="cursor-pointer"
              />
            </div>
          </div>
        </section>

        {/* Ubicación */}
        <section className="p-4 md:p-5">
          <SectionHeader icon={MapPin} title="Ubicación" />
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="location">Lugar</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Ej: HUB, Oficina Central"
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Por defecto: {DEFAULT_LOCATION}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="locationAddress">Dirección</Label>
                <Input
                  id="locationAddress"
                  value={formData.locationAddress}
                  onChange={(e) => setFormData({ ...formData, locationAddress: e.target.value })}
                  placeholder="México 850"
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {FULL_ADDRESS}
                </p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="meetingLink">
                Enlace de reunión <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <Input
                id="meetingLink"
                type="url"
                value={formData.meetingLink}
                onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value })}
                placeholder="https://meet.google.com/xxx-xxxx-xxx"
                disabled={loading}
              />
            </div>
          </div>
        </section>

        {/* Capacidad y notas */}
        <section className="p-4 md:p-5">
          <SectionHeader icon={Users} title="Capacidad y notas" />
          <div className="space-y-3">
            <div className="space-y-1.5 max-w-[200px]">
              <Label htmlFor="maxCapacity">Capacidad máxima</Label>
              <Input
                id="maxCapacity"
                type="number"
                min="1"
                max="100"
                value={formData.maxCapacity}
                onChange={(e) => setFormData({ ...formData, maxCapacity: e.target.value })}
                placeholder="20"
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Drivers que pueden asistir.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notas e instrucciones</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
                placeholder="Ej: Traer cédula y licencia original. Vestimenta casual."
                disabled={loading}
              />
            </div>
          </div>
        </section>
      </div>

      {/* Acciones */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        {hasChanges && (
          <Button
            type="button"
            variant="ghost"
            onClick={resetForm}
            disabled={loading}
            className="cursor-pointer"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Descartar cambios
          </Button>
        )}
        <Button
          type="submit"
          disabled={loading || !hasChanges}
          className="bg-brand text-brand-foreground hover:bg-brand-hover cursor-pointer"
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Guardar cambios
        </Button>
      </div>
    </form>
  )
}