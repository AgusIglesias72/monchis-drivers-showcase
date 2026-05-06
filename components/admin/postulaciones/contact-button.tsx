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
import { replaceTemplatePlaceholders } from '@/lib/services/whatsapp-templates.service'

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

// Logo ManyChat — usado en el badge sobre el botón Contactar cuando se envió flow.
const ManyChatIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 80.6 57.6"
    className={className}
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M68.2,0h-0.6C51.2,0,43.2,24.6,43.2,24.6V5.7H0v51.9h17.3V23h9.2v34.6H45c0,0,9.5-41,18.4-38c6,2.3-10.9,37.9-10.9,37.9H77c0,0,3.4-23.2,3.4-31.3C81.2,12.6,79,0,68.2,0" />
  </svg>
)

/**
 * Badge ManyChat absoluto que se monta sobre el botón Contactar cuando se
 * envió el flow de aprobación (manychatApprovalSentAt seteado). Sirve como
 * indicador visual rápido sin abrir el detalle.
 */
const ManyChatSentBadge = ({ sentAt }: { sentAt: Date | string }) => {
  const date = typeof sentAt === 'string' ? new Date(sentAt) : sentAt
  const label = `Mensaje ManyChat enviado el ${date.toLocaleString('es-PY')}`
  return (
    <span
      title={label}
      aria-label={label}
      className="absolute -top-1 -right-1 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-[#0084FF] ring-2 ring-background pointer-events-none"
    >
      <ManyChatIcon className="h-2.5 w-2.5 text-white" />
    </span>
  )
}

// Tipo para las plantillas
export interface WhatsAppTemplateForContact {
  id: string
  key: string
  name: string
  content: string
}

interface ContactButtonProps {
  driverId: string
  driverName: string
  phoneNumber: string
  contactStatus: ContactStatus
  templates: WhatsAppTemplateForContact[] // ✅ NUEVO: Plantillas desde la BD
  showLabel?: boolean // Si es true, muestra el texto del botón
  size?: 'sm' | 'default' // Tamaño del botón
  inDropdown?: boolean // ✅ NUEVO: Si está dentro de un dropdown "Acciones"
  /** Timestamp del último envío de flow ManyChat. Si está, muestra badge sobre el botón. */
  manychatApprovalSentAt?: string | Date | null
}

export function ContactButton({
  driverId,
  driverName,
  phoneNumber,
  contactStatus,
  templates,
  showLabel = false,
  size = 'sm',
  inDropdown = false,
  manychatApprovalSentAt = null,
}: ContactButtonProps) {
  const showManychatBadge = !!manychatApprovalSentAt
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

  const handleSendQuickMessage = async (template: WhatsAppTemplateForContact, e: React.MouseEvent) => {
    e.stopPropagation()

    setIsSendingMessage(true)
    try {
      // Reemplazar placeholders en el contenido de la plantilla
      const messageContent = replaceTemplatePlaceholders(template.content, {
        name: firstName,
      })

      const result = await sendQuickWhatsAppMessage({
        driverId,
        driverName: firstName,
        phoneNumber,
        message: messageContent,
        templateId: template.id, // ✅ Pasar el ID de la plantilla para trackear uso
      })

      if (result.success) {
        toast.success(`Mensaje "${template.name}" enviado correctamente! ✅`)
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
                  <div className="relative inline-flex">
                    <Button
                      size={size}
                      disabled={isDisabled || isPending}
                      className="gap-2 bg-[#25D366] text-white hover:bg-[#1fb955] border-[#25D366]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <WhatsAppIcon className="h-4 w-4" />
                      Contactar
                    </Button>
                    {showManychatBadge && manychatApprovalSentAt && (
                      <ManyChatSentBadge sentAt={manychatApprovalSentAt} />
                    )}
                  </div>
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

                {templates.length === 0 ? (
                  <DropdownMenuItem disabled className="text-muted-foreground text-sm">
                    No hay plantillas disponibles
                  </DropdownMenuItem>
                ) : (
                  templates.map((template) => (
                    <DropdownMenuItem
                      key={template.id}
                      onClick={(e) => handleSendQuickMessage(template, e)}
                      className="cursor-pointer"
                      disabled={isSendingMessage}
                    >
                      <Send className="mr-2 h-4 w-4 text-blue-600" />
                      <span>{template.name}</span>
                    </DropdownMenuItem>
                  ))
                )}

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

            {templates.length === 0 ? (
              <DropdownMenuItem disabled className="text-muted-foreground text-sm">
                No hay plantillas disponibles
              </DropdownMenuItem>
            ) : (
              templates.map((template) => (
                <DropdownMenuItem
                  key={template.id}
                  onClick={(e) => handleSendQuickMessage(template, e)}
                  className="cursor-pointer"
                  disabled={isSendingMessage}
                >
                  <Send className="mr-2 h-4 w-4 text-blue-600" />
                  <span>{template.name}</span>
                </DropdownMenuItem>
              ))
            )}

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
                <div className="relative inline-flex">
                  <Button
                    variant="ghost"
                    size={size}
                    disabled={isDisabled || isPending}
                    className={`h-8 w-8 p-0 rounded-full ${config.bg} ${config.text} ${config.hoverBg}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                  {showManychatBadge && manychatApprovalSentAt && (
                    <ManyChatSentBadge sentAt={manychatApprovalSentAt} />
                  )}
                </div>
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

              {templates.length === 0 ? (
                <DropdownMenuItem disabled className="text-muted-foreground text-sm">
                  No hay plantillas disponibles
                </DropdownMenuItem>
              ) : (
                templates.map((template) => (
                  <DropdownMenuItem
                    key={template.id}
                    onClick={(e) => handleSendQuickMessage(template, e)}
                    className="cursor-pointer"
                    disabled={isSendingMessage}
                  >
                    <Send className="mr-2 h-4 w-4 text-blue-600" />
                    <span>{template.name}</span>
                  </DropdownMenuItem>
                ))
              )}

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