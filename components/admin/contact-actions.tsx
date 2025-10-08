// components/admin/contact-actions.tsx

"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Phone, Mail, MessageSquare, Copy, Check } from "lucide-react"

interface ContactActionsProps {
  phoneNumber: string
  email: string
  name: string
}

// Plantillas de mensajes predefinidas
const MESSAGE_TEMPLATES = {
  bienvenida: {
    title: "Mensaje de Bienvenida",
    whatsapp: `Hola {name}, gracias por tu postulación para ser driver de nuestra plataforma. Hemos recibido tu información y la estamos revisando. Te contactaremos pronto.`,
    email: {
      subject: "Bienvenida - Postulación recibida",
      body: `Hola {name},\n\nGracias por tu postulación para ser driver de nuestra plataforma.\n\nHemos recibido tu información y la estamos revisando cuidadosamente. Te contactaremos pronto con los próximos pasos.\n\nSaludos cordiales,\nEquipo de Reclutamiento`
    }
  },
  documentos_pendientes: {
    title: "Solicitud de Documentos Pendientes",
    whatsapp: `Hola {name}, hemos revisado tu postulación y necesitamos que completes algunos documentos. Por favor, ingresa nuevamente al formulario para subirlos. ¡Gracias!`,
    email: {
      subject: "Documentos Pendientes - Postulación",
      body: `Hola {name},\n\nHemos revisado tu postulación y necesitamos que completes algunos documentos faltantes.\n\nPor favor, ingresa nuevamente al formulario de postulación para subirlos.\n\nSi tienes alguna duda, no dudes en contactarnos.\n\nSaludos,\nEquipo de Reclutamiento`
    }
  },
  aprobacion: {
    title: "Aprobación de Postulación",
    whatsapp: `¡Felicitaciones {name}! Tu postulación ha sido aprobada. Te contactaremos pronto para coordinar los próximos pasos y comenzar tu capacitación.`,
    email: {
      subject: "¡Felicitaciones! Tu postulación fue aprobada",
      body: `¡Felicitaciones {name}!\n\nTu postulación ha sido aprobada exitosamente.\n\nTe contactaremos en las próximas 24-48 horas para coordinar:\n- Capacitación inicial\n- Entrega de materiales\n- Activación en la plataforma\n\n¡Bienvenido al equipo!\n\nSaludos,\nEquipo de Reclutamiento`
    }
  },
  entrevista: {
    title: "Invitación a Entrevista",
    whatsapp: `Hola {name}, queremos conocerte mejor. ¿Podrías confirmar tu disponibilidad para una entrevista esta semana? Responde este mensaje con tu horario preferido.`,
    email: {
      subject: "Invitación a Entrevista - Postulación Driver",
      body: `Hola {name},\n\nNos gustaría conocerte mejor y hablar sobre tu postulación.\n\n¿Podrías confirmar tu disponibilidad para una entrevista durante esta semana?\n\nPor favor responde con tus horarios disponibles y nos pondremos en contacto.\n\nSaludos,\nEquipo de Reclutamiento`
    }
  },
  seguimiento: {
    title: "Seguimiento General",
    whatsapp: `Hola {name}, queremos hacerte un seguimiento de tu postulación. ¿Tienes alguna pregunta o necesitas ayuda con algo?`,
    email: {
      subject: "Seguimiento de tu Postulación",
      body: `Hola {name},\n\nQueremos hacer un seguimiento de tu postulación y asegurarnos de que todo esté en orden.\n\n¿Tienes alguna pregunta sobre el proceso?\n¿Necesitas ayuda con algún documento?\n\nEstamos aquí para ayudarte.\n\nSaludos,\nEquipo de Reclutamiento`
    }
  }
}

export function ContactActions({ phoneNumber, email, name }: ContactActionsProps) {
  const [showWhatsAppDialog, setShowWhatsAppDialog] = useState(false)
  const [showEmailDialog, setShowEmailDialog] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<keyof typeof MESSAGE_TEMPLATES>('bienvenida')
  const [copiedPhone, setCopiedPhone] = useState(false)
  const [copiedEmail, setCopiedEmail] = useState(false)

  const copyToClipboard = (text: string, type: 'phone' | 'email') => {
    navigator.clipboard.writeText(text)
    if (type === 'phone') {
      setCopiedPhone(true)
      setTimeout(() => setCopiedPhone(false), 2000)
    } else {
      setCopiedEmail(true)
      setTimeout(() => setCopiedEmail(false), 2000)
    }
  }

  const replaceVariables = (text: string) => {
    return text.replace('{name}', name)
  }

  const sendWhatsApp = (templateKey: keyof typeof MESSAGE_TEMPLATES) => {
    const template = MESSAGE_TEMPLATES[templateKey]
    const message = replaceVariables(template.whatsapp)
    const whatsappUrl = `https://wa.me/${phoneNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
    setShowWhatsAppDialog(false)
  }

  const sendEmail = (templateKey: keyof typeof MESSAGE_TEMPLATES) => {
    const template = MESSAGE_TEMPLATES[templateKey].email
    const subject = encodeURIComponent(template.subject)
    const body = encodeURIComponent(replaceVariables(template.body))
    const mailtoUrl = `mailto:${email}?subject=${subject}&body=${body}`
    window.location.href = mailtoUrl
    setShowEmailDialog(false)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Contactar
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => setShowWhatsAppDialog(true)}>
            <Phone className="h-4 w-4 mr-2" />
            WhatsApp (Mensaje predefinido)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowEmailDialog(true)}>
            <Mail className="h-4 w-4 mr-2" />
            Email (Plantilla)
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => copyToClipboard(phoneNumber, 'phone')}>
            {copiedPhone ? (
              <>
                <Check className="h-4 w-4 mr-2 text-green-600" />
                Teléfono copiado
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copiar teléfono
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => copyToClipboard(email, 'email')}>
            {copiedEmail ? (
              <>
                <Check className="h-4 w-4 mr-2 text-green-600" />
                Email copiado
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copiar email
              </>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialog WhatsApp */}
      <Dialog open={showWhatsAppDialog} onOpenChange={setShowWhatsAppDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Enviar mensaje por WhatsApp</DialogTitle>
            <DialogDescription>
              Selecciona una plantilla de mensaje para {name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {Object.entries(MESSAGE_TEMPLATES).map(([key, template]) => (
              <div
                key={key}
                className={`p-4 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                  selectedTemplate === key ? 'border-primary bg-muted/30' : ''
                }`}
                onClick={() => setSelectedTemplate(key as keyof typeof MESSAGE_TEMPLATES)}
              >
                <h4 className="font-semibold text-sm mb-2">{template.title}</h4>
                <p className="text-sm text-muted-foreground">
                  {replaceVariables(template.whatsapp)}
                </p>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWhatsAppDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={() => sendWhatsApp(selectedTemplate)} className="gap-2">
              <Phone className="h-4 w-4" />
              Abrir WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Email */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Enviar email</DialogTitle>
            <DialogDescription>
              Selecciona una plantilla de email para {name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {Object.entries(MESSAGE_TEMPLATES).map(([key, template]) => (
              <div
                key={key}
                className={`p-4 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                  selectedTemplate === key ? 'border-primary bg-muted/30' : ''
                }`}
                onClick={() => setSelectedTemplate(key as keyof typeof MESSAGE_TEMPLATES)}
              >
                <h4 className="font-semibold text-sm mb-1">{template.title}</h4>
                <p className="text-xs text-muted-foreground font-medium mb-2">
                  Asunto: {template.email.subject}
                </p>
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {replaceVariables(template.email.body)}
                </p>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmailDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={() => sendEmail(selectedTemplate)} className="gap-2">
              <Mail className="h-4 w-4" />
              Abrir cliente de email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}