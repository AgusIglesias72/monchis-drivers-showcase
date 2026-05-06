// components/admin/send-onboarding-list-button.tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Calendar, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { sendOnboardingListMessage } from "@/lib/actions/send-onboarding-list.actions"
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
} from "@/components/ui/alert-dialog"

interface SendOnboardingListButtonProps {
  driverId: string
  driverName: string
  phoneNumber: string
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
  inDropdown?: boolean
}

export function SendOnboardingListButton({
  driverId,
  driverName,
  phoneNumber,
  variant = "outline",
  size = "default",
  className,
  inDropdown = false,
}: SendOnboardingListButtonProps) {
  const [isSending, setIsSending] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const handleSend = async () => {
    setIsSending(true)

    try {
      const result = await sendOnboardingListMessage({
        driverId,
        driverName,
        phoneNumber,
      })

      if (result.success) {
        toast.success(
          result.eventsCount === 0
            ? "Mensaje enviado (sin capacitaciones disponibles)"
            : `Mensaje enviado con ${result.eventsCount} capacitación${result.eventsCount !== 1 ? "es" : ""}`
        )
        setIsOpen(false)
      } else {
        toast.error(result.error || "Error al enviar mensaje")
      }
    } catch (error) {
      toast.error("Error inesperado al enviar mensaje")
      console.error(error)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        {inDropdown ? (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-left gap-2 h-auto py-1.5 px-2 text-sm font-normal"
            disabled={isSending}
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Calendar className="h-4 w-4" />
            )}
            <span className="flex-1">
              {isSending ? 'Enviando…' : 'Enviar listado de capacitaciones'}
            </span>
          </Button>
        ) : (
          <Button
            variant={variant}
            size={size}
            className={className}
            disabled={isSending}
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Calendar className="h-4 w-4 mr-2" />
                Enviar Capacitaciones
              </>
            )}
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Enviar listado de capacitaciones</AlertDialogTitle>
          <AlertDialogDescription>
            Se enviará un mensaje por WhatsApp a <strong>{driverName}</strong> con
            el listado de capacitaciones disponibles en los próximos 7 días.
            <br />
            <br />
            El mensaje se generará automáticamente con las capacitaciones
            actualizadas al momento del envío.
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
            ) : (
              "Enviar Mensaje"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
