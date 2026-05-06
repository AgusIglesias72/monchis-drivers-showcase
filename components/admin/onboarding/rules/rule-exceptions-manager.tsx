'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Trash2, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { formatPYShort } from '@/lib/utils/onboarding-time'

interface Exception {
  id: string
  date: Date
  type: 'CANCELLED' | 'OVERRIDE'
  overrideStartTime: string | null
  overrideDurationMin: number | null
  overrideMaxCapacity: number | null
  overrideMeetingLink: string | null
  reason: string | null
}

export function RuleExceptionsManager({
  ruleId,
  exceptions,
}: {
  ruleId: string
  exceptions: Exception[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({
    date: '',
    type: 'CANCELLED' as 'CANCELLED' | 'OVERRIDE',
    overrideStartTime: '',
    overrideDurationMin: '',
    overrideMaxCapacity: '',
    overrideMeetingLink: '',
    reason: '',
  })

  async function createException() {
    if (!form.date) return toast.error('Falta la fecha')
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/onboarding/rules/${ruleId}/exceptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ruleId,
          date: form.date,
          type: form.type,
          overrideStartTime: form.overrideStartTime || null,
          overrideDurationMin: form.overrideDurationMin ? parseInt(form.overrideDurationMin) : null,
          overrideMaxCapacity: form.overrideMaxCapacity ? parseInt(form.overrideMaxCapacity) : null,
          overrideMeetingLink: form.overrideMeetingLink || null,
          reason: form.reason || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Error')
      }
      toast.success('Excepción creada')
      setOpen(false)
      setForm({
        date: '',
        type: 'CANCELLED',
        overrideStartTime: '',
        overrideDurationMin: '',
        overrideMaxCapacity: '',
        overrideMeetingLink: '',
        reason: '',
      })
      router.refresh()
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo crear')
    } finally {
      setBusy(false)
    }
  }

  async function deleteException(id: string) {
    if (!confirm('¿Eliminar esta excepción?')) return
    try {
      const res = await fetch(`/api/admin/onboarding/rules/${ruleId}/exceptions/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error()
      toast.success('Excepción eliminada')
      router.refresh()
    } catch {
      toast.error('No se pudo eliminar')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Feriados o cambios puntuales sobre fechas específicas de la regla.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Nueva excepción
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agregar excepción</DialogTitle>
              <DialogDescription>
                Cancelá una fecha específica o cambiá su configuración puntualmente.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="exDate">Fecha *</Label>
                <Input
                  id="exDate"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
              <div>
                <Label>Tipo *</Label>
                <RadioGroup
                  value={form.type}
                  onValueChange={(v) => setForm({ ...form, type: v as 'CANCELLED' | 'OVERRIDE' })}
                  className="grid grid-cols-2 gap-2 mt-2"
                >
                  <label className="flex items-center gap-2 border rounded-md px-3 py-2 cursor-pointer hover:bg-muted">
                    <RadioGroupItem value="CANCELLED" />
                    <span className="text-sm">Cancelar día</span>
                  </label>
                  <label className="flex items-center gap-2 border rounded-md px-3 py-2 cursor-pointer hover:bg-muted">
                    <RadioGroupItem value="OVERRIDE" />
                    <span className="text-sm">Cambio puntual</span>
                  </label>
                </RadioGroup>
              </div>
              {form.type === 'OVERRIDE' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="oStart">Nueva hora</Label>
                    <Input
                      id="oStart"
                      type="time"
                      value={form.overrideStartTime}
                      onChange={(e) => setForm({ ...form, overrideStartTime: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="oDur">Nueva duración (min)</Label>
                    <Input
                      id="oDur"
                      type="number"
                      value={form.overrideDurationMin}
                      onChange={(e) => setForm({ ...form, overrideDurationMin: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="oMax">Nuevo cupo</Label>
                    <Input
                      id="oMax"
                      type="number"
                      value={form.overrideMaxCapacity}
                      onChange={(e) => setForm({ ...form, overrideMaxCapacity: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="oLink">Nuevo link</Label>
                    <Input
                      id="oLink"
                      type="url"
                      value={form.overrideMeetingLink}
                      onChange={(e) => setForm({ ...form, overrideMeetingLink: e.target.value })}
                    />
                  </div>
                </div>
              )}
              <div>
                <Label htmlFor="reason">Motivo (opcional)</Label>
                <Textarea
                  id="reason"
                  rows={2}
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  placeholder="Ej: Feriado nacional, evento especial..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
                Cancelar
              </Button>
              <Button onClick={createException} disabled={busy} className="bg-brand text-brand-foreground hover:bg-brand-hover">
                Crear excepción
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {exceptions.length === 0 ? (
        <div className="text-sm text-muted-foreground border border-dashed rounded-lg p-6 text-center">
          Sin excepciones. La regla aplica todos los días configurados sin variaciones.
        </div>
      ) : (
        <div className="space-y-2">
          {exceptions.map((ex) => (
            <Card key={ex.id}>
              <CardContent className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium text-sm">{formatPYShort(new Date(ex.date))}</div>
                    {ex.reason && <div className="text-xs text-muted-foreground">{ex.reason}</div>}
                    {ex.type === 'OVERRIDE' && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {ex.overrideStartTime && `${ex.overrideStartTime} `}
                        {ex.overrideDurationMin && `(${ex.overrideDurationMin} min) `}
                        {ex.overrideMaxCapacity && `cupo ${ex.overrideMaxCapacity}`}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    className={
                      ex.type === 'CANCELLED' ? 'bg-danger-soft text-danger' : 'bg-warning-soft text-warning'
                    }
                  >
                    {ex.type === 'CANCELLED' ? 'Cancelada' : 'Override'}
                  </Badge>
                  <Button variant="ghost" size="icon" onClick={() => deleteException(ex.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
