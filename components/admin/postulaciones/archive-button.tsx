// components/admin/postulaciones/archive-button.tsx

'use client'

import { useState } from 'react'
import { Archive, ArchiveRestore } from 'lucide-react'
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
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { archivePostulacion, unarchivePostulacion } from '@/lib/actions/postulacion-archive.actions'
import { toast } from 'sonner'

interface ArchiveButtonProps {
  driverId: string
  driverName: string
  isArchived?: boolean
  onSuccess?: () => void
  showLabel?: boolean // Si es true, usa Button en lugar de DropdownMenuItem
  size?: 'sm' | 'default'
}

export function ArchiveButton({
  driverId,
  driverName,
  isArchived = false,
  onSuccess,
  showLabel = false,
  size = 'sm',
}: ArchiveButtonProps) {
  const [showDialog, setShowDialog] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowDialog(true)
  }

  const confirmAction = async () => {
    setIsProcessing(true)
    try {
      const result = isArchived
        ? await unarchivePostulacion(driverId)
        : await archivePostulacion(driverId)

      if (result.success) {
        toast.success(isArchived ? 'Postulación desarchivada' : 'Postulación archivada')
        setShowDialog(false)
        onSuccess?.()
      } else {
        toast.error(result.error || `Error al ${isArchived ? 'desarchivar' : 'archivar'} postulación`)
      }
    } catch (error) {
      toast.error(`Error al ${isArchived ? 'desarchivar' : 'archivar'} postulación`)
      console.error(error)
    } finally {
      setIsProcessing(false)
    }
  }

  const dialog = (
    <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isArchived ? 'Desarchivar Postulación' : 'Archivar Postulación'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isArchived ? (
              <>
                ¿Volver a mostrar la postulación de <strong>{driverName}</strong> en el listado?
              </>
            ) : (
              <>
                ¿Archivar la postulación de <strong>{driverName}</strong>?
              </>
            )}
            <br />
            <span className="text-xs text-muted-foreground mt-2 block">
              {isArchived
                ? 'Volverá a aparecer en las vistas de trabajo y en los contadores.'
                : 'Dejará de aparecer en el listado y los contadores. No cambia su estado y podés revertirlo cuando quieras desde la solapa Archivadas.'}
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isProcessing}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={confirmAction} disabled={isProcessing}>
            {isProcessing
              ? isArchived ? 'Desarchivando...' : 'Archivando...'
              : isArchived ? 'Desarchivar' : 'Archivar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )

  if (showLabel) {
    return (
      <>
        <Button variant="outline" size={size} onClick={handleClick} className="gap-2">
          {isArchived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
          {isArchived ? 'Desarchivar' : 'Archivar'}
        </Button>
        {dialog}
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
        {isArchived ? (
          <ArchiveRestore className="mr-2 h-4 w-4" />
        ) : (
          <Archive className="mr-2 h-4 w-4" />
        )}
        <span>{isArchived ? 'Desarchivar' : 'Archivar'}</span>
      </DropdownMenuItem>
      {dialog}
    </>
  )
}
