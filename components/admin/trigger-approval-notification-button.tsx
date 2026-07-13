// components/admin/trigger-approval-notification-button.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { MessageSquare, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { triggerApprovalNotification } from '@/lib/actions/whatsapp-approval-trigger.actions'
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

interface TriggerApprovalNotificationButtonProps {
  driverId: string
  driverName: string
  /** Timestamp ISO del último envío automático/manual, si existe. */
  approvalNotifiedAt?: string | Date | null
  inDropdown?: boolean
  onSuccess?: () => void
}

/**
 * Dispara manualmente el mensaje WhatsApp de aprobación ("capacitaciones") al
 * postulante. Si ya se envió antes (lock approvalNotifiedAt seteado), pide
 * confirmación extra para reenviar.
 */
export function TriggerApprovalNotificationButton({
  driverId,
  driverName,
  approvalNotifiedAt,
  inDropdown = false,
  onSuccess,
}: TriggerApprovalNotificationButtonProps) {
  const [isSending, setIsSending] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const alreadySent = !!approvalNotifiedAt
  const sentAtLabel = approvalNotifiedAt
    ? new Date(approvalNotifiedAt).toLocaleString('es-PY')
    : null

  const handleSend = async () => {
    setIsSending(true)
    try {
      const result = await triggerApprovalNotification({
        driverId,
        force: alreadySent,
      })

      if (result.success) {
        toast.success('Mensaje de aprobación enviado correctamente')
        setIsOpen(false)
        onSuccess?.()
      } else if ('alreadySent' in result && result.alreadySent) {
        toast.warning(
          `Ya se envió el ${new Date(result.sentAt).toLocaleString('es-PY')}. Confirmá nuevamente para reenviar.`,
        )
      } else {
        toast.error(result.error || 'No se pudo enviar el mensaje')
      }
    } catch (err) {
      console.error(err)
      toast.error('Error inesperado al disparar el mensaje')
    } finally {
      setIsSending(false)
    }
  }

  const triggerLabel = alreadySent ? 'Reenviar mensaje de aprobación' : 'Enviar mensaje de aprobación'

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        {inDropdown ? (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-left gap-2 h-auto whitespace-normal py-2 px-3 text-xs font-normal"
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
            {alreadySent ? 'Reenviar mensaje de aprobación' : 'Enviar mensaje de aprobación'}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>
                Se va a enviar el mensaje <strong>capacitaciones</strong> por WhatsApp al
                postulante <strong>{driverName}</strong>. Es el mismo mensaje que se envía
                automáticamente al aprobar todos los documentos.
              </p>
              {alreadySent && sentAtLabel && (
                <p className="text-warning font-medium">
                  ⚠️ Este mensaje ya se envió el <strong>{sentAtLabel}</strong>. Si confirmás,
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
