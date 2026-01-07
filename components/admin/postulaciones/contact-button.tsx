// components/admin/postulaciones/contact-button.tsx
'use client'

import { useState, useTransition } from 'react'
import { MessageCircle, Phone, Loader2, Send } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
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
import { registerDriverContact } from '@/lib/actions/postulacion-contact.actions'
import { sendQuickWhatsAppMessage } from '@/lib/actions/quick-whatsapp.actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import {
  getContactStatusConfig,
  canContactDriver,
  type ContactStatus
} from '@/lib/utils/contact-status.utils'

// Componente de logo de WhatsApp
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="currentColor"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
)

// Plantillas de mensajes predefinidos
const MESSAGE_TEMPLATES = {
  capacitaciones: {
    label: "Info sobre Capacitaciones",
    template: (name: string) => `Hola ${name}! 👋

¿Cómo estás? Te escribo para contarte sobre nuestras capacitaciones.

📅 Tenemos eventos todos los días de la semana donde te explicamos todo lo que necesitas saber para trabajar con nosotros.

¿Te gustaría agendar una fecha? Estamos a tu disposición para cualquier consulta o duda que tengas.

¡Saludos! 😊`
  },
  seguimiento_documentos: {
    label: "Seguimiento de Documentos",
    template: (name: string) => `Hola ${name}! 👋

Te escribo para hacer un seguimiento de tu postulación.

Veo que aún faltan algunos documentos por completar. ¿Hay algo en lo que pueda ayudarte?

Estoy aquí para resolver cualquier duda que tengas.

¡Saludos! 😊`
  },
  bienvenida_completo: {
    label: "Bienvenida - Formulario Completo",
    template: (name: string) => `¡Felicitaciones ${name}! 🎉

Completaste exitosamente tu postulación. Ahora vamos a revisar tu información y documentos.

📋 Próximos pasos:
1. Revisión de documentos (24-48 hs)
2. Te contactaremos para agendar tu capacitación
3. Una vez capacitado, ¡podrás empezar a trabajar!

¿Tienes alguna pregunta? Estoy aquí para ayudarte.

¡Bienvenido al equipo! 💪`
  },
  recordatorio_pago: {
    label: "Recordatorio de Pago",
    template: (name: string) => `Hola ${name}! 👋

Te escribo para recordarte que aún falta que completes el pago de equipamiento.

💳 Una vez que realices el pago, no olvides subir el comprobante en el formulario.

Si ya realizaste el pago y no pudiste cargar el comprobante, podés enviármelo por aquí.

¿Necesitas ayuda con algo?

¡Saludos! 😊`
  },
  consulta_general: {
    label: "Consulta General / Disponibilidad",
    template: (name: string) => `Hola ${name}! 👋

¿Cómo estás? Te escribo para saber si seguís interesado en trabajar con nosotros.

Veo que empezaste tu postulación pero quedó pendiente de completar.

Si tenés alguna duda o necesitás ayuda con algo, estoy aquí para ayudarte. 😊

¿Seguimos adelante?`
  },
  info_zona_trabajo: {
    label: "Info sobre Zona de Trabajo",
    template: (name: string) => `Hola ${name}! 👋

Te escribo para contarte más sobre cómo funciona la zona de trabajo.

🗺️ Actualmente tenemos disponibilidad en varias zonas de Asunción y alrededores.
Una vez que completes tu capacitación, vos elegís en qué zona preferís trabajar según tu ubicación.

¿Te interesa alguna zona en particular? Puedo darte más información.

¡Saludos! 😊`
  },
}

interface ContactButtonProps {
  driverId: string
  driverName: string
  phoneNumber: string
  contactStatus: ContactStatus
  showLabel?: boolean // Si es true, muestra el texto del botón
  size?: 'sm' | 'default' // Tamaño del botón
  inDropdown?: boolean // ✅ NUEVO: Si está dentro de un dropdown "Acciones"
}

export function ContactButton({
  driverId,
  driverName,
  phoneNumber,
  contactStatus,
  showLabel = false,
  size = 'sm',
  inDropdown = false // ✅ NUEVO
}: ContactButtonProps) {
  const router = useRouter()
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [isPending, startTransition] = useTransition()

  const config = getContactStatusConfig(contactStatus)
  const isDisabled = !canContactDriver(contactStatus)

  // Obtener solo el primer nombre
  const firstName = driverName.split(' ')[0]

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation()
    const cleanPhone = phoneNumber.replace(/\D/g, '')
    window.open(`https://wa.me/595${cleanPhone}`, '_blank')
  }

  const handleSendQuickMessage = async (templateKey: string, e: React.MouseEvent) => {
    e.stopPropagation()

    const template = MESSAGE_TEMPLATES[templateKey as keyof typeof MESSAGE_TEMPLATES]
    if (!template) return

    setIsSendingMessage(true)
    try {
      const result = await sendQuickWhatsAppMessage({
        driverId,
        driverName: firstName,
        phoneNumber,
        message: template.template(firstName),
      })

      if (result.success) {
        toast.success(`Mensaje "${template.label}" enviado correctamente! ✅`)
        startTransition(() => {
          router.refresh()
        })
      } else {
        toast.error(result.error || "Error al enviar el mensaje")
      }
    } catch (error) {
      console.error("Error sending message:", error)
      toast.error("Error al enviar el mensaje")
    } finally {
      setIsSendingMessage(false)
    }
  }

  const handleRegister = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowConfirmDialog(true)
  }

  const confirmRegister = async () => {
    setIsRegistering(true)
    try {
      const result = await registerDriverContact(driverId, 'WHATSAPP')
      
      if (result.success) {
        toast.success('Contacto registrado exitosamente')
        setShowConfirmDialog(false)
        
        startTransition(() => {
          router.refresh()
        })
      } else {
        toast.error(result.error || 'Error al registrar contacto')
        setIsRegistering(false)
      }
    } catch (error) {
      toast.error('Error al registrar contacto')
      console.error(error)
      setIsRegistering(false)
    }
  }

  // ✅ CASO 1: Con label (página de detalle, fuera de dropdown)
  if (showLabel) {
    return (
      <>
        {(isPending || isSendingMessage) && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 shadow-xl flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium">
                {isSendingMessage ? "Enviando mensaje..." : "Actualizando datos..."}
              </p>
            </div>
          </div>
        )}

        <TooltipProvider>
          <Tooltip>
            <DropdownMenu>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={contactStatus === 'urgent' ? 'default' : 'outline'}
                    size={size}
                    disabled={isDisabled || isPending}
                    className={`gap-2 ${
                      contactStatus === 'contacted' 
                        ? 'bg-green-50 text-green-700 hover:bg-green-100 border-green-200' 
                        : contactStatus === 'urgent'
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : ''
                    }`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MessageCircle className="h-4 w-4" />
                    Contactar
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem
                  onClick={handleWhatsApp}
                  className="cursor-pointer"
                >
                  <WhatsAppIcon className="mr-2 h-4 w-4 text-green-600" />
                  <span>Abrir WhatsApp</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Mensajes Rápidos
                </DropdownMenuLabel>

                {Object.entries(MESSAGE_TEMPLATES).map(([key, template]) => (
                  <DropdownMenuItem
                    key={key}
                    onClick={(e) => handleSendQuickMessage(key, e)}
                    className="cursor-pointer"
                    disabled={isSendingMessage}
                  >
                    <Send className="mr-2 h-4 w-4 text-blue-600" />
                    <span>{template.label}</span>
                  </DropdownMenuItem>
                ))}

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={handleRegister}
                  className="cursor-pointer"
                  disabled={contactStatus === 'contacted'}
                >
                  <Phone className="mr-2 h-4 w-4 text-blue-600" />
                  <span>Registrar Contacto</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <TooltipContent>
              <p>{config.tooltip}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Contacto</AlertDialogTitle>
              <AlertDialogDescription>
                ¿Confirmas que contactaste a <strong>{driverName}</strong>?
                <br />
                <span className="text-xs text-muted-foreground mt-2 block">
                  Se registrará este contacto en el historial del driver.
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isRegistering}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmRegister}
                disabled={isRegistering}
              >
                {isRegistering ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registrando...
                  </>
                ) : (
                  'Confirmar'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    )
  }

  // ✅ CASO 2: Sin label, dentro del dropdown "Acciones" (página de detalle)
  if (inDropdown) {
    return (
      <>
        {(isPending || isSendingMessage) && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 shadow-xl flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium">
                {isSendingMessage ? "Enviando mensaje..." : "Actualizando datos..."}
              </p>
            </div>
          </div>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              disabled={isDisabled || isPending}
              className="w-full justify-start text-left gap-2 h-auto py-2 px-2"
              onClick={(e) => e.stopPropagation()}
            >
              <MessageCircle className="h-4 w-4" />
              <span className="flex-1">Contactar</span>
            </Button>
          </DropdownMenuTrigger>
          
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem
              onClick={handleWhatsApp}
              className="cursor-pointer"
            >
              <WhatsAppIcon className="mr-2 h-4 w-4 text-green-600" />
              <span>Abrir WhatsApp</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Mensajes Rápidos
            </DropdownMenuLabel>

            {Object.entries(MESSAGE_TEMPLATES).map(([key, template]) => (
              <DropdownMenuItem
                key={key}
                onClick={(e) => handleSendQuickMessage(key, e)}
                className="cursor-pointer"
                disabled={isSendingMessage}
              >
                <Send className="mr-2 h-4 w-4 text-blue-600" />
                <span>{template.label}</span>
              </DropdownMenuItem>
            ))}

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={handleRegister}
              className="cursor-pointer"
              disabled={contactStatus === 'contacted'}
            >
              <Phone className="mr-2 h-4 w-4 text-blue-600" />
              <span>Registrar Contacto</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Contacto</AlertDialogTitle>
              <AlertDialogDescription>
                ¿Confirmas que contactaste a <strong>{driverName}</strong>?
                <br />
                <span className="text-xs text-muted-foreground mt-2 block">
                  Se registrará este contacto en el historial del driver.
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isRegistering}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmRegister}
                disabled={isRegistering}
              >
                {isRegistering ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registrando...
                  </>
                ) : (
                  'Confirmar'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    )
  }

  // ✅ CASO 3: Sin label, en la tabla (botón simple con tooltip)
  return (
    <>
      {(isPending || isSendingMessage) && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 shadow-xl flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">
              {isSendingMessage ? "Enviando mensaje..." : "Actualizando datos..."}
            </p>
          </div>
        </div>
      )}

      <TooltipProvider>
        <Tooltip>
          <DropdownMenu>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size={size}
                  disabled={isDisabled || isPending}
                  className={`h-8 w-8 p-0 rounded-full ${config.bg} ${config.text} ${config.hoverBg}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <MessageCircle className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem
                onClick={handleWhatsApp}
                className="cursor-pointer"
              >
                <WhatsAppIcon className="mr-2 h-4 w-4 text-green-600" />
                <span>Abrir WhatsApp</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Mensajes Rápidos
              </DropdownMenuLabel>

              {Object.entries(MESSAGE_TEMPLATES).map(([key, template]) => (
                <DropdownMenuItem
                  key={key}
                  onClick={(e) => handleSendQuickMessage(key, e)}
                  className="cursor-pointer"
                  disabled={isSendingMessage}
                >
                  <Send className="mr-2 h-4 w-4 text-blue-600" />
                  <span>{template.label}</span>
                </DropdownMenuItem>
              ))}

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={handleRegister}
                className="cursor-pointer"
                disabled={contactStatus === 'contacted'}
              >
                <Phone className="mr-2 h-4 w-4 text-blue-600" />
                <span>Registrar Contacto</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <TooltipContent>
            <p>{config.tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Contacto</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Confirmas que contactaste a <strong>{driverName}</strong>?
              <br />
              <span className="text-xs text-muted-foreground mt-2 block">
                Se registrará este contacto en el historial del driver.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRegistering}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmRegister}
              disabled={isRegistering}
            >
              {isRegistering ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registrando...
                </>
              ) : (
                'Confirmar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}