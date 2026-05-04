// components/admin/trigger-manychat-flow-button.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { MessageSquare, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { triggerManychatApprovalFlow } from '@/lib/actions/manychat-trigger.actions'
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

interface TriggerManychatFlowButtonProps {
  driverId: string
  driverName: string
  /** Timestamp ISO del último envío automático/manual, si existe. */
  manychatApprovalSentAt?: string | Date | null
  inDropdown?: boolean
  onSuccess?: () => void
}

/**
 * Dispara manualmente el flow ManyChat de aprobación ("capacitaciones") al
 * postulante. Si ya se envió antes (lock manychatApprovalSentAt seteado), pide
 * confirmación extra para reenviar.
 */
export function TriggerManychatFlowButton({
  driverId,
  driverName,
  manychatApprovalSentAt,
  inDropdown = false,
  onSuccess,
}: TriggerManychatFlowButtonProps) {
  const [isSending, setIsSending] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const alreadySent = !!manychatApprovalSentAt
  const sentAtLabel = manychatApprovalSentAt
    ? new Date(manychatApprovalSentAt).toLocaleString('es-PY')
    : null

  const handleSend = async () => {
    setIsSending(true)
    try {
      const result = await triggerManychatApprovalFlow({
        driverId,
        force: alreadySent,
      })

      if (result.success) {
        toast.success('Flow ManyChat enviado correctamente')
        setIsOpen(false)
        onSuccess?.()
      } else if ('alreadySent' in result && result.alreadySent) {
        // Caso teórico — el botón debería haber pasado force=true, pero por las
        // dudas mostramos el mensaje correcto.
        toast.warning(
          `Ya se envió el ${new Date(result.sentAt).toLocaleString('es-PY')}. Confirmá nuevamente para reenviar.`,
        )
      } else {
        toast.error(result.error || 'No se pudo enviar el flow')
      }
    } catch (err) {
      console.error(err)
      toast.error('Error inesperado al disparar el flow')
    } finally {
      setIsSending(false)
    }
  }

  const triggerLabel = alreadySent ? 'Reenviar flow ManyChat' : 'Enviar flow ManyChat'

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        {inDropdown ? (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-left gap-2 h-auto py-2 px-2 font-normal"
            disabled={isSending}
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MessageSquare className="h-4 w-4" />
            )}
            <span className="flex-1">
              {isSending ? 'Enviando…' : triggerLabel}
            </span>
          </Button>
        ) : (
          <Button variant="outline" size="default" disabled={isSending}>
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <MessageSquare className="h-4 w-4 mr-2" />
                {triggerLabel}
              </>
            )}
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {alreadySent ? 'Reenviar flow de aprobación' : 'Enviar flow de aprobación'}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>
                Se va a disparar el flow <strong>capacitaciones</strong> de ManyChat al
                postulante <strong>{driverName}</strong>. Es el mismo mensaje que se envía
                automáticamente al aprobar todos los documentos.
              </p>
              {alreadySent && sentAtLabel && (
                <p className="text-warning font-medium">
                  ⚠️ Este flow ya se envió el <strong>{sentAtLabel}</strong>. Si confirmás,
                  se va a reenviar y se actualiza el registro de envío.
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleSend} disabled={isSending}>
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : alreadySent ? (
              'Reenviar'
            ) : (
              'Enviar'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
