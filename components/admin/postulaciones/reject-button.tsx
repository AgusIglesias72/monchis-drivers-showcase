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
import {
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { rejectPostulacion, enablePostulacion } from '@/lib/actions/postulacion-contact.actions'
import { toast } from 'sonner'

interface RejectButtonProps {
  driverId: string
  driverName: string
  isRejected?: boolean
  onSuccess?: () => void
  showLabel?: boolean // Si es true, usa Button en lugar de DropdownMenuItem
  size?: 'sm' | 'default'
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

  // ✅ Versión CON LABEL (para usar fuera de dropdown)
  if (showLabel) {
    if (isRejected) {
      return (
        <>
          <Button
            variant="outline"
            size={size}
            onClick={handleClick}
            className="gap-2 border-success text-success hover:bg-success-soft hover:text-success"
          >
            <CheckCircle className="h-4 w-4" />
            Habilitar
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
                  className="bg-success hover:bg-success"
                >
                  {isProcessing ? 'Habilitando...' : 'Habilitar Postulación'}
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
          variant="destructive"
          size={size}
          onClick={handleClick}
          className="gap-2"
        >
          <XCircle className="h-4 w-4" />
          Rechazar
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
                className="bg-destructive hover:bg-destructive"
              >
                {isProcessing ? 'Rechazando...' : 'Rechazar Postulación'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    )
  }

  // ✅ Versión SIN LABEL (para usar dentro de dropdown)
  if (isRejected) {
    return (
      <>
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault()
            handleClick(e as any)
          }}
          className="cursor-pointer"
        >
          <CheckCircle className="mr-2 h-4 w-4" />
          <span>Habilitar</span>
        </DropdownMenuItem>

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
                className="bg-success hover:bg-success"
              >
                {isProcessing ? 'Habilitando...' : 'Habilitar Postulación'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    )
  }

  return (
    <>
      <DropdownMenuItem
        onSelect={(e) => {
          e.preventDefault()
          handleClick(e as any)
        }}
        className="cursor-pointer"
      >
        <XCircle className="mr-2 h-4 w-4 text-destructive" />
        <span className="text-destructive">Rechazar</span>
      </DropdownMenuItem>

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
              className="bg-destructive hover:bg-destructive"
            >
              {isProcessing ? 'Rechazando...' : 'Rechazar Postulación'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}