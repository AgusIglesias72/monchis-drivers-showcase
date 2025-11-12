'use client'

import { useState } from 'react'
import { UserCheck, UserX } from 'lucide-react'
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
import { Button } from '@/components/ui/button'
import { markAssistedCompletion, unmarkAssistedCompletion } from '@/lib/actions/assisted-completion.actions'
import { toast } from 'sonner'

interface AssistedCompletionButtonProps {
  driverId: string
  driverName: string
  isAssisted: boolean
  onSuccess?: () => void
  showLabel?: boolean
  size?: 'sm' | 'default'
}

export function AssistedCompletionButton({ 
  driverId, 
  driverName,
  isAssisted,
  onSuccess,
  showLabel = false,
  size = 'sm'
}: AssistedCompletionButtonProps) {
  const [showDialog, setShowDialog] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowDialog(true)
  }

  const confirmAction = async () => {
    setIsProcessing(true)
    try {
      const result = isAssisted 
        ? await unmarkAssistedCompletion(driverId)
        : await markAssistedCompletion(driverId)
      
      if (result.success) {
        toast.success(isAssisted ? 'Marca de asistencia removida' : 'Postulación marcada como asistida')
        setShowDialog(false)
        onSuccess?.()
      } else {
        toast.error(result.error || 'Error al actualizar')
      }
    } catch (error) {
      toast.error('Error al actualizar')
      console.error(error)
    } finally {
      setIsProcessing(false)
    }
  }

  // ✅ Versión CON LABEL (para usar fuera de dropdown)
  if (showLabel) {
    if (isAssisted) {
      return (
        <>
          <Button
            variant="outline"
            size={size}
            onClick={handleClick}
            className="gap-2 border-orange-600 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
          >
            <UserX className="h-4 w-4" />
            Desmarcar Asistida
          </Button>

          <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
              <AlertDialogHeader>
                <AlertDialogTitle>Desmarcar Postulación Asistida</AlertDialogTitle>
                <AlertDialogDescription>
                  ¿Estás seguro de remover la marca de &quot;asistida&quot; de <strong>{driverName}</strong>?
                  <br />
                  <span className="text-xs text-muted-foreground mt-2 block">
                    El badge verde &quot;Asistida&quot; dejará de mostrarse.
                  </span>
                </AlertDialogDescription>
              </AlertDialogHeader>

              <AlertDialogFooter>
                <AlertDialogCancel disabled={isProcessing}>
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction 
                  onClick={confirmAction}
                  disabled={isProcessing}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {isProcessing ? 'Desmarcando...' : 'Desmarcar'}
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
          variant="default"
          size={size}
          onClick={handleClick}
          className="gap-2 bg-emerald-600 hover:bg-emerald-700"
        >
          <UserCheck className="h-4 w-4" />
          Marcar como Asistida
        </Button>

        <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
            <AlertDialogHeader>
              <AlertDialogTitle>Marcar Postulación como Asistida</AlertDialogTitle>
              <AlertDialogDescription>
                ¿Confirmas que <strong>{driverName}</strong> completó su postulación con asistencia del equipo?
                <br />
                <span className="text-xs text-muted-foreground mt-2 block">
                  Se mostrará un badge verde distintivo &quot;Asistida X/6&quot; para mejor visibilidad.
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter>
              <AlertDialogCancel disabled={isProcessing}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmAction}
                disabled={isProcessing}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {isProcessing ? 'Marcando...' : 'Marcar como Asistida'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    )
  }

  // ✅ Versión SIN LABEL (para usar dentro de dropdown)
  if (isAssisted) {
    return (
      <>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClick}
          className="w-full justify-start text-left gap-2 h-auto py-2 px-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
        >
          <UserX className="h-4 w-4" />
          <span className="flex-1">Desmarcar Asistida</span>
        </Button>

        <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
            <AlertDialogHeader>
              <AlertDialogTitle>Desmarcar Postulación Asistida</AlertDialogTitle>
              <AlertDialogDescription>
                ¿Estás seguro de remover la marca de &quot;asistida&quot; de <strong>{driverName}</strong>?
                <br />
                <span className="text-xs text-muted-foreground mt-2 block">
                  El badge verde &quot;Asistida&quot; dejará de mostrarse.
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter>
              <AlertDialogCancel disabled={isProcessing}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmAction}
                disabled={isProcessing}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {isProcessing ? 'Desmarcando...' : 'Desmarcar'}
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
        variant="ghost"
        size="sm"
        onClick={handleClick}
        className="w-full justify-start text-left gap-2 h-auto py-2 px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
      >
        <UserCheck className="h-4 w-4" />
        <span className="flex-1">Marcar como Asistida</span>
      </Button>

      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Marcar Postulación como Asistida</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Confirmas que <strong>{driverName}</strong> completó su postulación con asistencia del equipo?
              <br />
              <span className="text-xs text-muted-foreground mt-2 block">
                Se mostrará un badge verde distintivo &quot;Asistida X/6&quot; para mejor visibilidad.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmAction}
              disabled={isProcessing}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isProcessing ? 'Marcando...' : 'Marcar como Asistida'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}