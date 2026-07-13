// components/admin/whatsapp-messages-history.tsx
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MessageCircle, Bot, Clock, CheckCircle2, AlertCircle, User } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

interface WhatsAppMessage {
  id: string
  messageType: string
  sentAt: string
  status: string
  source: string
  metadata?: any
}

interface WhatsAppMessagesHistoryProps {
  messages: WhatsAppMessage[]
}

// Mapeo de tipos de mensaje a labels legibles
const MESSAGE_TYPE_LABELS: Record<string, string> = {
  FORM_INCOMPLETE: "Formulario Incompleto",
  APPLICATION_RECEIVED: "Postulación Recibida",
  DOCUMENT_REJECTED: "Documento Rechazado",
  CAPACITATION_REMINDER: "Recordatorio de Capacitación",
  CAPACITATION_NO_SHOW: "No Asistió a Capacitación",
  ONBOARDING_REMINDER: "Recordatorio de Onboarding",
  WELCOME: "Bienvenida",
  CUSTOM: "Personalizado",
}

// Mapeo de fuentes
const SOURCE_LABELS: Record<string, string> = {
  MANUAL: "Manual",
  CRON: "Automático",
  TRIGGER: "Trigger",
  API: "API",
  TEST: "Prueba",
}

// Mapeo de estados
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  SENT: { label: "Enviado", color: "bg-info-soft text-info border-info", icon: CheckCircle2 },
  DELIVERED: { label: "Entregado", color: "bg-success-soft text-success border-success", icon: CheckCircle2 },
  READ: { label: "Leído", color: "bg-purple-50 text-purple-700 border-purple-200", icon: CheckCircle2 },
  FAILED: { label: "Fallido", color: "bg-danger-soft text-destructive border-destructive", icon: AlertCircle },
  PENDING: { label: "Pendiente", color: "bg-warning-soft text-warning border-warning", icon: Clock },
}

export function WhatsAppMessagesHistory({ messages }: WhatsAppMessagesHistoryProps) {
  if (!messages || messages.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base font-bold flex items-center gap-2 tracking-tight">
            <MessageCircle className="h-4 w-4" />
            Historial de Mensajes
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="text-center text-sm text-muted-foreground py-8">
            <MessageCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
            <p>No se han enviado mensajes a este conductor</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-base font-bold flex items-center gap-2 tracking-tight">
          <MessageCircle className="h-4 w-4" />
          Historial de Mensajes
          <Badge variant="secondary" className="ml-auto">
            {messages.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="max-h-[60vh] overflow-y-auto pr-1">
          <div className="space-y-3">
          {messages.map((message, index) => {
            const statusConfig = STATUS_CONFIG[message.status] || STATUS_CONFIG.SENT
            const StatusIcon = statusConfig.icon
            const reminderLevel = message.metadata?.reminderLevel

            return (
              <div
                key={message.id}
                className={`relative pl-6 pb-3 ${
                  index < messages.length - 1 ? "border-l-2 border-border" : ""
                }`}
              >
                {/* Dot indicator */}
                <div className="absolute left-0 top-1.5 w-3 h-3 rounded-full bg-info border-2 border-card -translate-x-[7px]" />

                <div className="bg-muted rounded-lg p-3 space-y-2">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-foreground">
                          {MESSAGE_TYPE_LABELS[message.messageType] || message.messageType}
                        </span>
                        {reminderLevel && (
                          <Badge variant="outline" className="text-xs bg-info-soft text-info border-info">
                            Recordatorio #{reminderLevel}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <Clock className="h-3 w-3" />
                        <span>
                          {formatDistanceToNow(new Date(message.sentAt), {
                            addSuffix: true,
                            locale: es,
                          })}
                        </span>
                        <span className="text-muted-foreground/50">•</span>
                        <span>
                          {new Date(message.sentAt).toLocaleDateString("es-ES", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status and Source */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant="outline"
                      className={`text-xs ${statusConfig.color} flex items-center gap-1`}
                    >
                      <StatusIcon className="h-3 w-3" />
                      {statusConfig.label}
                    </Badge>
                    <Badge variant="outline" className="text-xs bg-muted text-muted-foreground border-border flex items-center gap-1">
                      {message.source === "MANUAL" ? (
                        <User className="h-3 w-3" />
                      ) : (
                        <Bot className="h-3 w-3" />
                      )}
                      {SOURCE_LABELS[message.source] || message.source}
                    </Badge>
                  </div>
                </div>
              </div>
            )
          })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
