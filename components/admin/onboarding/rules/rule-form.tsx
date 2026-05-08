'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Save, Trash2, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { DaysOfWeekPicker } from './days-of-week-picker'
import { RulePreview } from './rule-preview'
import { GoogleMeetLogo } from './google-meet-logo'
import { LocationPicker } from './location-picker'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import type { SavedLocation } from '@/lib/types/onboarding-rules.types'
import { slugify, isValidSlug } from '@/lib/utils/slugify'
import type {
  RuleSummary,
  RuleCreateInput,
  OnboardingModality,
} from '@/lib/types/onboarding-rules.types'

interface AdminOption {
  id: string
  fullName: string | null
  firstName: string | null
  lastName: string | null
  profileImageUrl?: string | null
  email?: string | null
}

function getInitials(label: string): string {
  return label
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

interface Props {
  mode: 'create' | 'edit'
  rule?: RuleSummary
  admins: AdminOption[]
}

interface FormState {
  slug: string
  title: string
  description: string
  instructions: string
  modality: OnboardingModality
  // Ubicación: o bien locationId (saved) o bien locationAddress + googleMapsUrl ad-hoc
  locationId: string | null
  location: string
  locationAddress: string
  googleMapsUrl: string
  meetingLink: string
  meetingPlatform: string

  // Recurrencia
  isRecurring: boolean
  daysOfWeek: number[]
  oneOffDate: string // YYYY-MM-DD para evento único

  startTime: string
  durationMinutes: number
  validFrom: string
  validTo: string
  validToOpen: boolean

  maxCapacity: string
  minNoticeHours: string
  maxFutureDays: string
  cancelDeadlineHours: string
  paymentMode: 'POST_EVENT' | 'PRE_BOOKING'
  isActive: boolean
  isPublic: boolean
  defaultOrganizer: string
}

const DURATION_OPTIONS: { value: number; label: string }[] = [
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 h' },
  { value: 75, label: '1 h 15' },
  { value: 90, label: '1 h 30' },
]

function toIsoDate(val: string): string | undefined {
  if (!val) return undefined
  return new Date(val + 'T00:00:00').toISOString()
}

function fromIsoDate(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toISOString().slice(0, 10)
}

// Field wrapper para espaciado consistente
function Field({
  label,
  required,
  children,
  hint,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
  hint?: string
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="text-brand"> *</span>}
      </Label>
      {children}
      {hint && (
        <p className="text-xs text-muted-foreground flex items-start gap-1.5">
          <Info className="h-3 w-3 mt-0.5 shrink-0" />
          <span>{hint}</span>
        </p>
      )}
    </div>
  )
}

export function RuleForm({ mode, rule, admins }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [slugTouched, setSlugTouched] = useState(false)

  const [form, setForm] = useState<FormState>(() => ({
    slug: rule?.slug ?? '',
    title: rule?.title ?? '',
    description: rule?.description ?? '',
    instructions: rule?.instructions ?? '',
    modality: rule?.modality ?? 'IN_PERSON',
    locationId: rule?.locationId ?? null,
    location: rule?.location ?? '',
    locationAddress: rule?.locationAddress ?? '',
    googleMapsUrl: rule?.googleMapsUrl ?? '',
    meetingLink: rule?.meetingLink ?? '',
    meetingPlatform: rule?.meetingPlatform ?? 'Google Meet',
    isRecurring: rule ? rule.frequency !== 'ONE_OFF' : true,
    daysOfWeek: rule?.daysOfWeek ?? [1, 3],
    oneOffDate:
      rule && rule.frequency === 'ONE_OFF' ? fromIsoDate(rule.validFrom) : '',
    startTime: rule?.startTime ?? '10:00',
    durationMinutes: rule?.durationMinutes ?? 60,
    validFrom: fromIsoDate(rule?.validFrom) || new Date().toISOString().slice(0, 10),
    validTo: fromIsoDate(rule?.validTo),
    validToOpen: !rule?.validTo,
    maxCapacity: (rule?.maxCapacity ?? 20).toString(),
    minNoticeHours: (rule?.minNoticeHours ?? 2).toString(),
    maxFutureDays: (rule?.maxFutureDays ?? 60).toString(),
    cancelDeadlineHours: (rule?.cancelDeadlineHours ?? 4).toString(),
    paymentMode: rule?.paymentMode ?? 'POST_EVENT',
    isActive: rule?.isActive ?? true,
    isPublic: rule?.isPublic ?? true,
    defaultOrganizer: rule?.defaultOrganizer ?? admins[0]?.id ?? '',
  }))

  // Auto-slug
  useEffect(() => {
    if (mode === 'edit') return
    if (slugTouched) return
    if (!form.title) return
    setForm((f) => ({ ...f, slug: slugify(f.title) }))
  }, [form.title, slugTouched, mode])

  const adminLabel = useMemo(() => {
    // Preferimos "Nombre Apellido" (más prolijo en UI) por encima del fullName
    // que a veces incluye el segundo nombre.
    const map = new Map(
      admins.map((a) => {
        const compact = `${a.firstName ?? ''} ${a.lastName ?? ''}`.trim()
        return [a.id, compact || a.fullName || a.email || a.id]
      }),
    )
    return (id: string) => map.get(id) ?? id
  }, [admins])

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!form.title.trim()) return toast.error('El título es obligatorio')
    if (!isValidSlug(form.slug)) return toast.error('Slug inválido (solo minúsculas, números y guiones)')
    if (!/^\d{2}:\d{2}$/.test(form.startTime)) return toast.error('Hora inválida')

    // Validación de recurrencia
    if (form.isRecurring) {
      if (form.daysOfWeek.length === 0)
        return toast.error('Seleccioná al menos un día de la semana')
      if (!form.validFrom) return toast.error('Falta fecha de vigencia inicial')
      if (!form.validToOpen && form.validTo && form.validTo < form.validFrom) {
        return toast.error('La fecha de fin debe ser posterior al inicio')
      }
    } else {
      if (!form.oneOffDate) return toast.error('Elegí la fecha del evento')
    }

    if (form.modality !== 'IN_PERSON' && !form.meetingLink.trim()) {
      return toast.error('El link de reunión es obligatorio para modalidad virtual o híbrida')
    }
    if (form.modality !== 'VIRTUAL') {
      if (!form.locationId && !form.locationAddress.trim()) {
        return toast.error('Elegí una ubicación guardada o cargá una dirección')
      }
    }
    if (!form.defaultOrganizer) return toast.error('Seleccioná un organizador por defecto')

    // Si es ONE_OFF: validFrom = validTo = oneOffDate, daysOfWeek = [día de la semana de esa fecha]
    let validFromIso: string | undefined
    let validToIso: string | null | undefined
    let daysOfWeek: number[]
    let frequency: 'WEEKLY' | 'ONE_OFF'

    if (form.isRecurring) {
      validFromIso = toIsoDate(form.validFrom)
      validToIso = form.validToOpen ? null : toIsoDate(form.validTo)
      daysOfWeek = form.daysOfWeek
      frequency = 'WEEKLY'
    } else {
      validFromIso = toIsoDate(form.oneOffDate)
      validToIso = toIsoDate(form.oneOffDate)
      const d = new Date(form.oneOffDate + 'T12:00:00')
      daysOfWeek = [d.getDay()]
      frequency = 'ONE_OFF'
    }

    const payload: Partial<RuleCreateInput> = {
      slug: form.slug,
      title: form.title.trim(),
      description: form.description.trim() || null,
      instructions: form.instructions.trim() || null,
      modality: form.modality,
      locationId: form.locationId,
      location: form.location.trim() || null,
      locationAddress: form.locationAddress.trim() || null,
      googleMapsUrl: form.googleMapsUrl.trim() || null,
      meetingLink: form.meetingLink.trim() || null,
      meetingPlatform: form.meetingPlatform.trim() || null,
      frequency,
      daysOfWeek,
      startTime: form.startTime,
      durationMinutes: form.durationMinutes,
      validFrom: validFromIso,
      validTo: validToIso,
      maxCapacity: parseInt(form.maxCapacity, 10) || 20,
      minNoticeHours: parseInt(form.minNoticeHours, 10) || 0,
      maxFutureDays: parseInt(form.maxFutureDays, 10) || 60,
      cancelDeadlineHours: parseInt(form.cancelDeadlineHours, 10) || 0,
      paymentMode: form.paymentMode,
      isActive: form.isActive,
      isPublic: form.isPublic,
      defaultOrganizer: form.defaultOrganizer,
    }

    setSaving(true)
    try {
      const url =
        mode === 'create'
          ? '/api/admin/onboarding/rules'
          : `/api/admin/onboarding/rules/${rule!.id}`
      const method = mode === 'create' ? 'POST' : 'PATCH'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Error al guardar')
      }
      const saved = await res.json()
      toast.success(mode === 'create' ? 'Evento creado' : 'Evento actualizado')
      const id = saved.rule?.id || saved.id
      const savedSlug = saved.rule?.slug || saved.slug || form.slug
      if (mode === 'create') {
        // Auto-materializar al crear
        fetch(`/api/admin/onboarding/rules/${id}/materialize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ weeksAhead: 8 }),
        }).catch(() => {})
      }
      router.push(`/admin/onboarding/reglas/${savedSlug}`)
      router.refresh()
    } catch (err: any) {
      toast.error(err?.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeactivate() {
    if (!rule) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/onboarding/rules/${rule.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('Evento desactivado')
      router.push('/admin/onboarding?tab=capacitaciones')
      router.refresh()
    } catch {
      toast.error('No se pudo desactivar')
    } finally {
      setDeleting(false)
    }
  }

  const inputClass = 'h-11'

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {/* INFORMACIÓN DEL EVENTO */}
        <Card>
          <CardHeader>
            <CardTitle>Información del evento</CardTitle>
            <CardDescription>
              Esto es lo que el postulante va a ver en la pantalla pública antes de reservar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <Field
              label="Título"
              required
              hint="Aparece como título principal de la card en /capacitaciones."
            >
              <Input
                value={form.title}
                onChange={(e) => update('title', e.target.value)}
                placeholder="Capacitación Presencial HUB"
                className={inputClass}
              />
            </Field>

            <Field
              label="URL pública"
              hint="Identificador único del evento en la URL pública."
            >
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground bg-muted px-3 h-11 rounded-md flex items-center border">
                  /capacitaciones/
                </span>
                <Input
                  value={form.slug}
                  onChange={(e) => {
                    setSlugTouched(true)
                    update('slug', e.target.value.toLowerCase())
                  }}
                  placeholder="capacitacion-presencial-hub"
                  disabled={mode === 'edit'}
                  className={inputClass}
                />
              </div>
              {!slugTouched && mode === 'create' && (
                <p className="text-xs text-muted-foreground">Se genera automáticamente desde el título.</p>
              )}
            </Field>

            <Field
              label="Descripción"
              hint="Texto general que cuenta de qué se trata, beneficios, qué se enseña. Aparece arriba en la pantalla de detalle. Usá negritas, listas y subtítulos para que sea claro."
            >
              <RichTextEditor
                value={form.description}
                onChange={(html) => update('description', html)}
                minHeight="9rem"
                placeholder="Te enseñamos cómo funciona la app, qué hacer en caso de problemas y entregamos tu mochila + remera."
              />
            </Field>

            <Field
              label="Instrucciones — ¿qué debe traer?"
              hint='Una línea por ítem. Las que empiezan con "- " se muestran como lista con bullets.'
            >
              <Textarea
                value={form.instructions}
                onChange={(e) => update('instructions', e.target.value)}
                rows={4}
                placeholder={'- Cédula original\n- Carnet de conducir\n- Llegar 10 minutos antes'}
              />
            </Field>

            <Field label="Modalidad" required>
              <RadioGroup
                value={form.modality}
                onValueChange={(v) => update('modality', v as OnboardingModality)}
                className="grid grid-cols-3 gap-2"
              >
                {[
                  { value: 'IN_PERSON', label: 'Presencial' },
                  { value: 'VIRTUAL', label: 'Virtual' },
                  { value: 'HYBRID', label: 'Híbrida' },
                ].map((m) => (
                  <label
                    key={m.value}
                    className={`flex items-center gap-2 border rounded-md px-3 h-11 cursor-pointer transition-colors ${
                      form.modality === m.value ? 'bg-muted border-foreground/20' : 'hover:bg-muted'
                    }`}
                  >
                    <RadioGroupItem value={m.value} />
                    <span className="text-sm">{m.label}</span>
                  </label>
                ))}
              </RadioGroup>
            </Field>

            <Field
              label="Duración"
              required
              hint="Cuánto dura cada capacitación, en minutos."
            >
              <div className="grid grid-cols-5 gap-2">
                {DURATION_OPTIONS.map((opt) => (
                  <button
                    type="button"
                    key={opt.value}
                    onClick={() => update('durationMinutes', opt.value)}
                    className={`h-11 rounded-md border text-sm font-medium transition-colors ${
                      form.durationMinutes === opt.value
                        ? 'bg-brand text-brand-foreground border-brand hover:bg-brand-hover'
                        : 'hover:bg-muted'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </Field>
          </CardContent>
        </Card>

        {/* UBICACIÓN */}
        {form.modality !== 'VIRTUAL' && (
          <Card>
            <CardHeader>
              <CardTitle>Ubicación física</CardTitle>
              <CardDescription>
                Elegí una ubicación que ya tengas guardada o creá una nueva. El postulante ve la
                dirección y un link directo a Google Maps.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <Field
                label="Ubicación guardada"
                hint="Las ubicaciones se reusan entre eventos. Tocá 'Nueva' para crear una y volverá a aparecer en la próxima capacitación."
              >
                <LocationPicker
                  value={form.locationId}
                  onChange={(id, loc: SavedLocation | null) => {
                    setForm((f) => ({
                      ...f,
                      locationId: id,
                      // si elige una guardada, sincronizamos los campos legacy a partir de ella
                      // así la rule siempre tiene address + url poblados
                      location: loc?.name ?? f.location,
                      locationAddress: loc?.address ?? f.locationAddress,
                      googleMapsUrl: loc?.googleMapsUrl ?? f.googleMapsUrl,
                    }))
                  }}
                />
              </Field>

              {!form.locationId && (
                <>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium pt-2 border-t">
                    O cargá una dirección puntual
                  </div>
                  <Field label="Nombre del lugar">
                    <Input
                      value={form.location}
                      onChange={(e) => update('location', e.target.value)}
                      placeholder="HUB Asunción"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Dirección" required>
                    <Textarea
                      value={form.locationAddress}
                      onChange={(e) => update('locationAddress', e.target.value)}
                      rows={2}
                      placeholder="México 850 e/ F.R. Moreno y M. Domínguez, Asunción"
                    />
                  </Field>
                  <Field
                    label="Link de Google Maps"
                    hint="Abrí Google Maps → buscá el lugar → 'Compartir' → copiá el link."
                  >
                    <Input
                      type="url"
                      value={form.googleMapsUrl}
                      onChange={(e) => update('googleMapsUrl', e.target.value)}
                      placeholder="https://maps.app.goo.gl/..."
                      className={inputClass}
                    />
                  </Field>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* MEETING LINK */}
        {form.modality !== 'IN_PERSON' && (
          <Card>
            <CardHeader>
              <CardTitle>Link virtual</CardTitle>
              <CardDescription>
                El link se incluye en el email de confirmación y en la pantalla de «Mi reserva».
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-4">
                <Field label="Plataforma">
                  <Select
                    value={form.meetingPlatform || 'Google Meet'}
                    onValueChange={(v) => update('meetingPlatform', v)}
                  >
                    <SelectTrigger className={inputClass}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Google Meet">
                        <span className="flex items-center gap-2">
                          <GoogleMeetLogo size={18} />
                          Google Meet
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field
                  label="Link de reunión"
                  required
                  hint="URL completa (ej: https://meet.google.com/abc-defg-hij)."
                >
                  <Input
                    type="url"
                    value={form.meetingLink}
                    onChange={(e) => update('meetingLink', e.target.value)}
                    placeholder="https://meet.google.com/abc-defg-hij"
                    className={inputClass}
                  />
                </Field>
              </div>
            </CardContent>
          </Card>
        )}

        {/* DISPONIBILIDAD */}
        <Card>
          <CardHeader>
            <CardTitle>Cuándo se realiza</CardTitle>
            <CardDescription>
              {form.isRecurring
                ? 'Genera slots automáticamente cada semana en los días seleccionados.'
                : 'Genera un único evento en la fecha elegida.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Recurrente vs único */}
            <div className="flex items-center justify-between border rounded-md px-4 py-3 bg-muted/40">
              <div>
                <div className="font-medium text-sm">¿Es un evento recurrente?</div>
                <div className="text-xs text-muted-foreground">
                  {form.isRecurring
                    ? 'Se repite todas las semanas en los días que elijas.'
                    : 'Sucede una sola vez en una fecha específica.'}
                </div>
              </div>
              <Switch
                checked={form.isRecurring}
                onCheckedChange={(v) => update('isRecurring', v)}
              />
            </div>

            {form.isRecurring ? (
              <>
                <Field
                  label="Días de la semana"
                  required
                  hint="El sistema genera un slot por cada día seleccionado durante el rango de vigencia."
                >
                  <DaysOfWeekPicker
                    value={form.daysOfWeek}
                    onChange={(v) => update('daysOfWeek', v)}
                  />
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Vigente desde" required>
                    <Input
                      type="date"
                      value={form.validFrom}
                      onChange={(e) => update('validFrom', e.target.value)}
                      className={`${inputClass} cursor-pointer`}
                    />
                  </Field>
                  <Field label="Vigente hasta">
                    <div className="space-y-2">
                      <Input
                        type="date"
                        value={form.validTo}
                        onChange={(e) => update('validTo', e.target.value)}
                        disabled={form.validToOpen}
                        className={`${inputClass} cursor-pointer disabled:cursor-not-allowed`}
                      />
                      <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                        <Switch
                          checked={form.validToOpen}
                          onCheckedChange={(v) => update('validToOpen', v)}
                        />
                        Sin fecha de fin (recurre indefinidamente)
                      </label>
                    </div>
                  </Field>
                </div>
              </>
            ) : (
              <Field
                label="Fecha del evento"
                required
                hint="El evento se va a realizar una sola vez en esta fecha."
              >
                <Input
                  type="date"
                  value={form.oneOffDate}
                  onChange={(e) => update('oneOffDate', e.target.value)}
                  className={`${inputClass} cursor-pointer`}
                  min={new Date().toISOString().slice(0, 10)}
                />
              </Field>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label="Hora de inicio"
                required
                hint="Hora local Asunción (PY)."
              >
                <Input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => update('startTime', e.target.value)}
                  className={`${inputClass} cursor-pointer`}
                  step={300}
                />
              </Field>
              <Field label="Zona horaria">
                <Input value="America/Asuncion (UTC-3 / -4)" disabled className={inputClass} />
              </Field>
            </div>
          </CardContent>
        </Card>

        {/* REGLAS DE RESERVA */}
        <Card>
          <CardHeader>
            <CardTitle>Reglas de reserva</CardTitle>
            <CardDescription>
              Definí los límites para que el postulante no agende fuera de tiempo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label="Cupo máximo"
                required
                hint="Cuánta gente entra por evento."
              >
                <Input
                  type="number"
                  min={1}
                  value={form.maxCapacity}
                  onChange={(e) => update('maxCapacity', e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field
                label="Anticipación mínima (horas)"
                hint="Bloquea reservas demasiado cercanas al evento."
              >
                <Input
                  type="number"
                  min={0}
                  value={form.minNoticeHours}
                  onChange={(e) => update('minNoticeHours', e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field
                label="Máximo a futuro (días)"
                hint="Cuánto en el futuro puede agendar el postulante."
              >
                <Input
                  type="number"
                  min={1}
                  value={form.maxFutureDays}
                  onChange={(e) => update('maxFutureDays', e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field
                label="Cancelación hasta (horas antes)"
                hint="Después de este límite ya no puede cancelar self-service."
              >
                <Input
                  type="number"
                  min={0}
                  value={form.cancelDeadlineHours}
                  onChange={(e) => update('cancelDeadlineHours', e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>

            <Field label="Pago">
              <RadioGroup
                value={form.paymentMode}
                onValueChange={(v) => update('paymentMode', v as 'POST_EVENT' | 'PRE_BOOKING')}
                className="grid grid-cols-1 sm:grid-cols-2 gap-2"
              >
                <label className="flex items-center gap-2 border rounded-md px-3 h-11 cursor-pointer hover:bg-muted">
                  <RadioGroupItem value="POST_EVENT" />
                  <span className="text-sm">Post-capacitación</span>
                </label>
                <label className="flex items-center gap-2 border rounded-md px-3 h-11 cursor-not-allowed opacity-60">
                  <RadioGroupItem value="PRE_BOOKING" disabled />
                  <span className="text-sm">Pre-pago al reservar (próximamente)</span>
                </label>
              </RadioGroup>
            </Field>
          </CardContent>
        </Card>

        {/* AVANZADO */}
        <Card>
          <CardHeader>
            <CardTitle>Avanzado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <Field
              label="Organizador por defecto"
              required
              hint="El organizador queda asociado a cada slot generado."
            >
              <Select value={form.defaultOrganizer} onValueChange={(v) => update('defaultOrganizer', v)}>
                <SelectTrigger className="h-auto py-3 px-3.5 [&_>span]:flex-1">
                  <SelectValue placeholder="Elegí un admin" />
                </SelectTrigger>
                <SelectContent>
                  {admins.map((a) => {
                    const label = adminLabel(a.id)
                    return (
                      <SelectItem key={a.id} value={a.id} className="py-3 pr-8">
                        <span className="flex items-center gap-3.5 min-w-0">
                          <Avatar className="h-10 w-10 shrink-0 ring-1 ring-border">
                            {a.profileImageUrl ? (
                              <AvatarImage src={a.profileImageUrl} alt={label} />
                            ) : null}
                            <AvatarFallback className="text-sm font-semibold bg-muted text-muted-foreground">
                              {getInitials(label)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="flex flex-col min-w-0 gap-1 text-left">
                            <span className="text-sm font-semibold leading-none truncate">
                              {label}
                            </span>
                            {a.email && (
                              <span className="text-xs text-muted-foreground leading-none truncate">
                                {a.email}
                              </span>
                            )}
                          </span>
                        </span>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </Field>
            <div className="flex items-center justify-between border rounded-md px-4 py-3">
              <div>
                <div className="font-medium text-sm">Activo</div>
                <div className="text-xs text-muted-foreground">
                  Los eventos inactivos no generan slots nuevos.
                </div>
              </div>
              <Switch checked={form.isActive} onCheckedChange={(v) => update('isActive', v)} />
            </div>
            <div className="flex items-center justify-between border rounded-md px-4 py-3">
              <div>
                <div className="font-medium text-sm">Visible en pantalla pública</div>
                <div className="text-xs text-muted-foreground">
                  Mostrar este evento en /capacitaciones para que cualquiera lo vea.
                </div>
              </div>
              <Switch checked={form.isPublic} onCheckedChange={(v) => update('isPublic', v)} />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <div>
            {mode === 'edit' && rule && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="outline" size="sm" disabled={deleting}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Desactivar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Desactivar este evento?</AlertDialogTitle>
                    <AlertDialogDescription>
                      No se generarán nuevos slots, pero los eventos ya creados se mantienen y los
                      asistentes ya reservados pueden seguir asistiendo.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeactivate}>Desactivar</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={saving}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-brand text-brand-foreground hover:bg-brand-hover"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {mode === 'create' ? 'Crear evento' : 'Guardar cambios'}
            </Button>
          </div>
        </div>
      </div>

      <div className="lg:col-span-1">
        <div className="lg:sticky lg:top-6">
          <RulePreview
            daysOfWeek={
              form.isRecurring
                ? form.daysOfWeek
                : form.oneOffDate
                  ? [new Date(form.oneOffDate + 'T12:00:00').getDay()]
                  : []
            }
            startTime={form.startTime}
            durationMinutes={form.durationMinutes}
            validFrom={form.isRecurring ? form.validFrom : form.oneOffDate}
            validTo={
              form.isRecurring
                ? form.validToOpen
                  ? null
                  : form.validTo
                : form.oneOffDate
            }
            modality={form.modality}
            maxCapacity={parseInt(form.maxCapacity, 10) || 0}
          />
        </div>
      </div>
    </form>
  )
}
