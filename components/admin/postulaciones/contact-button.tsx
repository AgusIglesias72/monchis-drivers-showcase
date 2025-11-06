// components/admin/postulaciones/contact-button.tsx
'use client'

import { useState, useTransition } from 'react'
import { MessageCircle, Phone, Loader2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { 
  getContactStatusConfig, 
  canContactDriver,
  type ContactStatus 
} from '@/lib/utils/contact-status.utils'

interface ContactButtonProps {
  driverId: string
  driverName: string
  phoneNumber: string
  contactStatus: ContactStatus
  showLabel?: boolean // Si es true, muestra el texto del botón
  size?: 'sm' | 'default' // Tamaño del botón
}

export function ContactButton({ 
  driverId, 
  driverName, 
  phoneNumber,
  contactStatus,
  showLabel = false,
  size = 'sm'
}: ContactButtonProps) {
  const router = useRouter()
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [isPending, startTransition] = useTransition()
  
  const config = getContactStatusConfig(contactStatus)
  const isDisabled = !canContactDriver(contactStatus)

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation()
    const cleanPhone = phoneNumber.replace(/\D/g, '')
    window.open(`https://wa.me/595${cleanPhone}`, '_blank')
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
        
        // Usar startTransition para mostrar spinner mientras recarga
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

  return (
    <>
      {/* Overlay de loading */}
      {isPending && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 shadow-xl flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Actualizando datos...</p>
          </div>
        </div>
      )}

      <TooltipProvider>
        <Tooltip>
          <DropdownMenu>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={showLabel ? (contactStatus === 'urgent' ? 'default' : 'outline') : 'ghost'}
                  size={size}
                  disabled={isDisabled || isPending}
                  className={
                    showLabel 
                      ? `gap-2 ${
                          contactStatus === 'contacted' 
                            ? 'bg-green-50 text-green-700 hover:bg-green-100 border-green-200' 
                            : contactStatus === 'urgent'
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : ''
                        }`
                      : `h-8 w-8 p-0 rounded-full ${config.bg} ${config.text} ${config.hoverBg}`
                  }
                  onClick={(e) => e.stopPropagation()}
                >
                  <MessageCircle className="h-4 w-4" />
                  {showLabel && 'Contactar'}
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem 
                onClick={handleWhatsApp}
                className="cursor-pointer"
              >
                <MessageCircle className="mr-2 h-4 w-4 text-green-600" />
                <span>Abrir WhatsApp</span>
              </DropdownMenuItem>
              
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

      {/* Modal de confirmación */}
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