// components/admin/postulaciones/reject-button.tsx
'use client'

import { useState } from 'react'
import { XCircle, CheckCircle } from 'lucide-react'
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
import { rejectPostulacion, enablePostulacion } from '@/lib/actions/postulacion-contact.actions'
import { toast } from 'sonner'

interface RejectButtonProps {
  driverId: string
  driverName: string
  isRejected?: boolean
  onSuccess?: () => void
  showLabel?: boolean // Si es true, muestra el texto del botón
  size?: 'sm' | 'default' // Tamaño del botón
}

export function RejectButton({ 
  driverId, 
  driverName,
  isRejected = false,
  onSuccess,
  showLabel = false,
  size = 'sm'
}: RejectButtonProps) {
  const [showDialog, setShowDialog] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowDialog(true)
  }

  const confirmAction = async () => {
    setIsProcessing(true)
    try {
      const result = isRejected 
        ? await enablePostulacion(driverId)
        : await rejectPostulacion(driverId)
      
      if (result.success) {
        toast.success(isRejected ? 'Postulación habilitada exitosamente' : 'Postulación rechazada exitosamente')
        setShowDialog(false)
        onSuccess?.()
      } else {
        toast.error(result.error || `Error al ${isRejected ? 'habilitar' : 'rechazar'} postulación`)
      }
    } catch (error) {
      toast.error(`Error al ${isRejected ? 'habilitar' : 'rechazar'} postulación`)
      console.error(error)
    } finally {
      setIsProcessing(false)
    }
  }

  if (isRejected) {
    // Botón de Habilitar
    return (
      <>
        <Button
          variant={showLabel ? 'outline' : 'ghost'}
          size={size}
          onClick={handleClick}
          className={
            showLabel 
              ? 'gap-2 border-green-600 text-green-600 hover:bg-green-50 hover:text-green-700'
              : 'text-green-600 hover:text-green-700 hover:bg-green-50 w-full justify-start'
          }
        >
          <CheckCircle className="h-4 w-4" />
          {showLabel && 'Habilitar'}
        </Button>

        <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
            <AlertDialogHeader>
              <AlertDialogTitle>Habilitar Postulación</AlertDialogTitle>
              <AlertDialogDescription>
                ¿Estás seguro de habilitar nuevamente la postulación de <strong>{driverName}</strong>?
                <br />
                <span className="text-xs text-muted-foreground mt-2 block">
                  Se restaurará el estado anterior al rechazo y podrá continuar con el proceso.
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
                className="bg-green-600 hover:bg-green-700"
              >
                {isProcessing ? 'Habilitando...' : 'Habilitar Postulación'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    )
  }

  // Botón de Rechazar
  return (
    <>
      <Button
        variant={showLabel ? 'destructive' : 'ghost'}
        size={size}
        onClick={handleClick}
        className={
          showLabel 
            ? 'gap-2'
            : 'text-red-600 hover:text-red-700 hover:bg-red-50 w-full justify-start'
        }
      >
        <XCircle className="h-4 w-4" />
        {showLabel && 'Rechazar'}
      </Button>

      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Rechazar Postulación</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de rechazar la postulación de <strong>{driverName}</strong>?
              <br />
              <span className="text-xs text-muted-foreground mt-2 block">
                Podrás revertir esta acción cuando quieras.
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
              className="bg-red-600 hover:bg-red-700"
            >
              {isProcessing ? 'Rechazando...' : 'Rechazar Postulación'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}