// components/admin/comunicacion/braze/BrazeNewTriggerContent.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Loader2, Save, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export function BrazeNewTriggerContent() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [triggerType, setTriggerType] = useState<'CAMPAIGN' | 'CANVAS'>('CAMPAIGN')
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    campaignId: '',
    canvasId: '',
    targetAudience: '',
    defaultProperties: '',
    tags: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      // Validar
      if (!formData.title) {
        toast.error('El título es requerido')
        setSaving(false)
        return
      }

      if (triggerType === 'CAMPAIGN' && !formData.campaignId) {
        toast.error('El Campaign ID es requerido')
        setSaving(false)
        return
      }

      if (triggerType === 'CANVAS' && !formData.canvasId) {
        toast.error('El Canvas ID es requerido')
        setSaving(false)
        return
      }

      // Parsear defaultProperties si hay
      let defaultProperties = null
      if (formData.defaultProperties.trim()) {
        try {
          defaultProperties = JSON.parse(formData.defaultProperties)
        } catch (error) {
          toast.error('Las propiedades por defecto deben ser un JSON válido')
          setSaving(false)
          return
        }
      }

      // Parsear tags
      const tags = formData.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0)

      const response = await fetch('/api/braze/triggers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || null,
          triggerType,
          campaignId: triggerType === 'CAMPAIGN' ? formData.campaignId : null,
          canvasId: triggerType === 'CANVAS' ? formData.canvasId : null,
          targetAudience: formData.targetAudience || null,
          defaultProperties,
          tags,
        }),
      })

      const data = await response.json()

      if (data.success) {
        // Limpiar formulario
        setFormData({
          title: '',
          description: '',
          campaignId: '',
          canvasId: '',
          targetAudience: '',
          defaultProperties: '',
          tags: '',
        })
        setTriggerType('CAMPAIGN')
        toast.success('Disparador creado exitosamente')
        // Cambiar al tab de triggers
        router.push('/admin/comunicaciones/braze?tab=triggers')
      } else {
        toast.error(data.error || 'Error al crear el disparador')
        setSaving(false)
      }
    } catch (error) {
      console.error('Error creating trigger:', error)
      toast.error('Error al crear el disparador')
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Formulario */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Información del Disparador</CardTitle>
            <CardDescription>
              Completa los datos del disparador que querés crear
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Título */}
            <div className="space-y-2">
              <Label htmlFor="title">
                Título <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                placeholder="Ej: Recordatorio de documentos pendientes"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            {/* Descripción */}
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                placeholder="Descripción del disparador y su propósito"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            {/* Tipo */}
            <div className="space-y-2">
              <Label>
                Tipo <span className="text-destructive">*</span>
              </Label>
              <RadioGroup
                value={triggerType}
                onValueChange={(value) => setTriggerType(value as 'CAMPAIGN' | 'CANVAS')}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="CAMPAIGN" id="campaign" />
                  <Label htmlFor="campaign" className="font-normal cursor-pointer">
                    Campaign (Campaña)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="CANVAS" id="canvas" />
                  <Label htmlFor="canvas" className="font-normal cursor-pointer">
                    Canvas (Flujo)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Campaign ID o Canvas ID */}
            {triggerType === 'CAMPAIGN' ? (
              <div className="space-y-2">
                <Label htmlFor="campaignId">
                  Campaign ID <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="campaignId"
                  placeholder="99721cef-f6b9-4608-ac66-ac68de775c48"
                  value={formData.campaignId}
                  onChange={(e) => setFormData({ ...formData, campaignId: e.target.value })}
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Encontralo en Braze Dashboard → Messaging → Campaigns → Settings → API Identifier
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="canvasId">
                  Canvas ID <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="canvasId"
                  placeholder="abc-def-123"
                  value={formData.canvasId}
                  onChange={(e) => setFormData({ ...formData, canvasId: e.target.value })}
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Encontralo en Braze Dashboard → Messaging → Canvas → Settings → API Identifier
                </p>
              </div>
            )}

            {/* Audiencia objetivo (documentación) */}
            <div className="space-y-2">
              <Label htmlFor="targetAudience">Audiencia Objetivo</Label>
              <Textarea
                id="targetAudience"
                placeholder="Ej: Drivers con documentos en estado REJECTED o PENDING"
                value={formData.targetAudience}
                onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                rows={2}
              />
              <p className="text-sm text-muted-foreground">
                Documentación para referencia sobre a quién está dirigido este disparador
              </p>
            </div>

            {/* Propiedades por defecto */}
            <div className="space-y-2">
              <Label htmlFor="defaultProperties">Propiedades por Defecto (JSON)</Label>
              <Textarea
                id="defaultProperties"
                placeholder='{"nombre": "Driver", "deadline": "5 días"}'
                value={formData.defaultProperties}
                onChange={(e) => setFormData({ ...formData, defaultProperties: e.target.value })}
                rows={4}
                className="font-mono text-sm"
              />
              <p className="text-sm text-muted-foreground">
                Propiedades que se enviarán por defecto en cada ejecución (formato JSON)
              </p>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                placeholder="documentos, onboarding, urgente"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              />
              <p className="text-sm text-muted-foreground">
                Separados por comas para facilitar la búsqueda
              </p>
            </div>

            {/* Acciones */}
            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Crear Disparador
                  </>
                )}
              </Button>
              <Button type="button" variant="outline" asChild disabled={saving}>
                <Link href="/admin/comunicaciones/braze/triggers">Cancelar</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
