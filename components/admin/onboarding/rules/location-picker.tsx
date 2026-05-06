'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Plus, MapPin, Loader2, ExternalLink, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { SavedLocation } from '@/lib/types/onboarding-rules.types'

interface Props {
  value: string | null // locationId
  onChange: (id: string | null, location: SavedLocation | null) => void
}

const NONE_VALUE = '__none__'

export function LocationPicker({ value, onChange }: Props) {
  const [locations, setLocations] = useState<SavedLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<SavedLocation | null>(null)

  async function reload() {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/onboarding/locations')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setLocations(data.locations || [])
    } catch {
      toast.error('No se pudieron cargar las ubicaciones')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
  }, [])

  const selected = locations.find((l) => l.id === value) || null

  function handleSelect(id: string) {
    if (id === NONE_VALUE) {
      onChange(null, null)
      return
    }
    const loc = locations.find((l) => l.id === id) || null
    onChange(id, loc)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Select value={value ?? NONE_VALUE} onValueChange={handleSelect} disabled={loading}>
          <SelectTrigger className="h-11 flex-1">
            <SelectValue placeholder={loading ? 'Cargando...' : 'Elegí una ubicación'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_VALUE}>
              <span className="text-muted-foreground">Sin ubicación guardada</span>
            </SelectItem>
            {locations.map((loc) => (
              <SelectItem key={loc.id} value={loc.id}>
                <span className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-medium">{loc.name}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          className="h-11 shrink-0"
          onClick={() => {
            setEditing(null)
            setOpen(true)
          }}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Nueva
        </Button>
      </div>

      {selected && (
        <div className="border rounded-md p-3 bg-muted/30 text-sm space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="font-semibold flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              {selected.name}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => {
                setEditing(selected)
                setOpen(true)
              }}
            >
              <Pencil className="h-3 w-3 mr-1" />
              Editar
            </Button>
          </div>
          <div className="text-muted-foreground">{selected.address}</div>
          {selected.notes && (
            <div className="text-xs text-muted-foreground italic">{selected.notes}</div>
          )}
          <a
            href={selected.googleMapsUrl}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1 text-xs text-brand hover:underline"
          >
            Ver en Google Maps <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}

      <LocationFormDialog
        open={open}
        onOpenChange={setOpen}
        location={editing}
        onSaved={async (loc) => {
          setOpen(false)
          await reload()
          onChange(loc.id, loc)
        }}
      />
    </div>
  )
}

function LocationFormDialog({
  open,
  onOpenChange,
  location,
  onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  location: SavedLocation | null
  onSaved: (loc: SavedLocation) => void
}) {
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [googleMapsUrl, setGoogleMapsUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setName(location?.name ?? '')
      setAddress(location?.address ?? '')
      setGoogleMapsUrl(location?.googleMapsUrl ?? '')
      setNotes(location?.notes ?? '')
    }
  }, [open, location])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !address.trim() || !googleMapsUrl.trim()) {
      return toast.error('Completá nombre, dirección y link')
    }

    setSaving(true)
    try {
      const url = location
        ? `/api/admin/onboarding/locations/${location.id}`
        : '/api/admin/onboarding/locations'
      const method = location ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          address: address.trim(),
          googleMapsUrl: googleMapsUrl.trim(),
          notes: notes.trim() || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'No se pudo guardar')
      }
      const data = await res.json()
      toast.success(location ? 'Ubicación actualizada' : 'Ubicación creada')
      onSaved(data.location)
    } catch (err: any) {
      toast.error(err?.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{location ? 'Editar ubicación' : 'Nueva ubicación'}</DialogTitle>
            <DialogDescription>
              Las ubicaciones se reutilizan en futuros eventos. Pegá el link de Google Maps tal cual.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre interno *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="HUB Asunción"
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">
                Para identificarla en el selector. Ej: "HUB Asunción", "Sucursal Encarnación".
              </p>
            </div>
            <div className="space-y-2">
              <Label>Dirección legible *</Label>
              <Textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
                placeholder="México 850 e/ F.R. Moreno y M. Domínguez, Asunción"
              />
            </div>
            <div className="space-y-2">
              <Label>Link de Google Maps *</Label>
              <Input
                type="url"
                value={googleMapsUrl}
                onChange={(e) => setGoogleMapsUrl(e.target.value)}
                placeholder="https://maps.app.goo.gl/..."
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">
                Abrí Google Maps → buscá el lugar → "Compartir" → copiá el link.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Notas / referencias</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Subir al 2do piso, oficina con cartel rojo de Monchis"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-brand text-brand-foreground hover:bg-brand-hover"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {location ? 'Guardar' : 'Crear ubicación'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
