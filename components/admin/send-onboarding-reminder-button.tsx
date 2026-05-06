// components/admin/send-onboarding-reminder-button.tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Bell, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { sendOnboardingReminderMessage } from "@/lib/actions/send-onboarding-list.actions"
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

interface SendOnboardingReminderButtonProps {
  driverId: string
  driverName: string
  phoneNumber: string
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
  inDropdown?: boolean
}

export function SendOnboardingReminderButton({
  driverId,
  driverName,
  phoneNumber,
  variant = "outline",
  size = "default",
  className,
  inDropdown = false,
}: SendOnboardingReminderButtonProps) {
  const [isSending, setIsSending] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const handleSend = async () => {
    setIsSending(true)

    try {
      const result = await sendOnboardingReminderMessage({
        driverId,
        driverName,
        phoneNumber,
      })

      if (result.success && 'eventsCount' in result) {
        toast.success(
          result.eventsCount === 0
            ? "Recordatorio enviado (sin capacitaciones disponibles)"
            : `Recordatorio enviado con ${result.eventsCount} capacitación${result.eventsCount !== 1 ? "es" : ""}`
        )
        setIsOpen(false)
      } else if (!result.success) {
        toast.error(result.error || "Error al enviar recordatorio")
      }
    } catch (error) {
      toast.error("Error inesperado al enviar recordatorio")
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
              <Bell className="h-4 w-4" />
            )}
            <span className="flex-1">
              {isSending ? 'Enviando…' : 'Recordar capacitación'}
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
                <Bell className="h-4 w-4 mr-2" />
                Recordar Capacitación
              </>
            )}
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Enviar recordatorio de capacitación</AlertDialogTitle>
          <AlertDialogDescription>
            Se enviará un mensaje de recordatorio a <strong>{driverName}</strong> indicando
            que cumple con los requisitos para ser repartidor en Monchis y compartiendo
            las capacitaciones disponibles.
            <br />
            <br />
            Este mensaje está pensado para conductores que ya fueron verificados pero
            no se agendaron en su momento.
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
              "Enviar Recordatorio"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
