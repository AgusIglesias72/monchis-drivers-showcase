'use client'

import { useState } from 'react'
import { CheckCircle2, CircleSlash } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface WaiveRucButtonProps {
  driverId: string
  waived: boolean
  waivedAt?: string | Date | null
  waivedNote?: string | null
  onSuccess?: () => void
}

export function WaiveRucButton({
  driverId,
  waived,
  waivedAt,
  waivedNote,
  onSuccess,
}: WaiveRucButtonProps) {
  const [showDialog, setShowDialog] = useState(false)
  const [note, setNote] = useState(waivedNote ?? '')
  const [isLoading, setIsLoading] = useState(false)

  const toggle = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/admin/postulaciones/${driverId}/waive-ruc-inactive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ waived: !waived, note: waived ? null : note.trim() || null }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data?.error || 'Error al actualizar')
        return
      }
      toast.success(waived ? 'Marca de "RUC Inactivo" removida' : 'Marcado como "RUC Inactivo"')
      setShowDialog(false)
      onSuccess?.()
    } catch (err) {
      console.error('[waive-ruc]', err)
      toast.error('Error de red')
    } finally {
      setIsLoading(false)
    }
  }

  if (waived) {
    return (
      <>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
          onClick={() => setShowDialog(true)}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          RUC Inactivo (excepción)
        </Button>

        <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Quitar marca de RUC Inactivo</AlertDialogTitle>
              <AlertDialogDescription>
                La postulación volverá a requerir el Certificado Tributario para estar en
                &quot;Documentos Completos&quot;.
                {waivedAt && (
                  <>
                    <br />
                    <span className="text-xs text-muted-foreground mt-2 block">
                      Marcado el {new Date(waivedAt).toLocaleString('es-PY')}
                      {waivedNote ? ` — Nota: ${waivedNote}` : ''}
                    </span>
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                disabled={isLoading}
                onClick={toggle}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {isLoading ? 'Quitando…' : 'Quitar marca'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    )
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5 border-gray-300 text-gray-700 hover:bg-gray-50"
        onClick={() => setShowDialog(true)}
      >
        <CircleSlash className="h-3.5 w-3.5" />
        Marcar RUC Inactivo
      </Button>

      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Marcar como RUC Inactivo</AlertDialogTitle>
            <AlertDialogDescription>
              El postulante declaró que regularizará su situación fiscal. Al marcar esta
              excepción, el certificado tributario se dará por satisfecho y la postulación
              podrá quedar en &quot;Documentos Completos&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2 py-2">
            <Label htmlFor="waive-note" className="text-xs text-muted-foreground">
              Nota (opcional)
            </Label>
            <Textarea
              id="waive-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ej: se comprometió a regularizar RUC antes del 30/04"
              rows={3}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={isLoading}
              onClick={toggle}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isLoading ? 'Marcando…' : 'Marcar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
