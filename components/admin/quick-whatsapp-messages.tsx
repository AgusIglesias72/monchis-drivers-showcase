// components/admin/quick-whatsapp-messages.tsx
"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { MessageSquare, Send, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { sendQuickWhatsAppMessage } from "@/lib/actions/quick-whatsapp.actions"

interface QuickWhatsAppMessagesProps {
  driverId: string
  driverName: string
  phoneNumber: string
}

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

export function QuickWhatsAppMessages({
  driverId,
  driverName,
  phoneNumber
}: QuickWhatsAppMessagesProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("")
  const [customMessage, setCustomMessage] = useState("")
  const [isPending, startTransition] = useTransition()

  // Obtener solo el primer nombre
  const firstName = driverName.split(' ')[0]

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId)
    if (templateId && MESSAGE_TEMPLATES[templateId as keyof typeof MESSAGE_TEMPLATES]) {
      const template = MESSAGE_TEMPLATES[templateId as keyof typeof MESSAGE_TEMPLATES]
      setCustomMessage(template.template(firstName))
    } else {
      setCustomMessage("")
    }
  }

  const handleSendMessage = () => {
    if (!customMessage.trim()) {
      toast.error("Por favor escribe un mensaje")
      return
    }

    if (!phoneNumber) {
      toast.error("No hay número de teléfono disponible")
      return
    }

    startTransition(async () => {
      try {
        const result = await sendQuickWhatsAppMessage({
          driverId,
          driverName: firstName,
          phoneNumber,
          message: customMessage,
        })

        if (result.success) {
          toast.success("Mensaje enviado correctamente! ✅")
          setSelectedTemplate("")
          setCustomMessage("")
        } else {
          toast.error(result.error || "Error al enviar el mensaje")
        }
      } catch (error) {
        console.error("Error sending message:", error)
        toast.error("Error al enviar el mensaje")
      }
    })
  }

  return (
    <Card>
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-base font-bold flex items-center gap-2 tracking-tight">
          <MessageSquare className="h-4 w-4" />
          Mensajes Rápidos
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {/* Selector de plantilla */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Seleccionar mensaje predefinido</label>
          <Select
            value={selectedTemplate}
            onValueChange={handleTemplateChange}
            disabled={isPending}
          >
            <SelectTrigger>
              <SelectValue placeholder="Elige un mensaje..." />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(MESSAGE_TEMPLATES).map(([key, template]) => (
                <SelectItem key={key} value={key}>
                  {template.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Preview/Editor del mensaje */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Mensaje a enviar</label>
          <Textarea
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            placeholder="Escribe o edita el mensaje aquí..."
            className="min-h-[200px] font-mono text-sm"
            disabled={isPending}
          />
          <p className="text-xs text-muted-foreground">
            Puedes editar el mensaje antes de enviarlo
          </p>
        </div>

        {/* Info del destinatario */}
        <div className="bg-muted/50 rounded-lg p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Enviar a:</span>
            <span className="font-medium">{driverName}</span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-muted-foreground">Teléfono:</span>
            <span className="font-medium">{phoneNumber}</span>
          </div>
        </div>

        {/* Botón de envío */}
        <Button
          onClick={handleSendMessage}
          disabled={!customMessage.trim() || isPending}
          className="w-full"
          size="lg"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Enviar Mensaje
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
