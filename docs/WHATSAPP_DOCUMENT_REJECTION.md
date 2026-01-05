# Configuración de Notificaciones WhatsApp - Rechazo de Antecedentes Penales

## Resumen

Cuando se rechaza un Certificado de Antecedentes Penales desde el panel de administración, se envía automáticamente un mensaje de WhatsApp al conductor informándole del rechazo y el motivo.

## Flujo de la Notificación

1. **Admin rechaza documento** → Modal con motivos predefinidos o personalizados
2. **Backend procesa rechazo** → Actualiza estado del documento a `REJECTED`
3. **Detección automática** → Sistema detecta que es un documento de Antecedentes Penales
4. **Envío de WhatsApp** → Mensaje automático al conductor
5. **Registro en base de datos** → Se guarda en tabla `WhatsAppMessage`

## Datos Enviados al Bot

### Endpoint del Bot
```
POST {BOT_URL}/send-contextual-message
```

### Payload
```json
{
  "phone": "595XXXXXXXXX",
  "name": "Juan",
  "type": "document_rejected",
  "metadata": {
    "documentType": "CRIMINAL_RECORD",
    "documentTypeName": "Certificado de Antecedentes Penales",
    "rejectionReason": "Documento Vencido",
    "rejectedAt": "2025-01-05T12:30:00.000Z",
    "documentId": "clxxxxxxxxxxxxxx",
    "triggeredBy": "document_rejection",
    "adminId": "user_xxxxxxxxxxxxx"
  }
}
```

## Configuración en el Bot de WhatsApp

### Variables Disponibles en el Template

El bot debe tener configurado un template para el tipo de mensaje `document_rejected` que soporte las siguientes variables:

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `{{name}}` | Primer nombre del conductor | "Juan" |
| `{{documentTypeName}}` | Nombre del documento rechazado | "Certificado de Antecedentes Penales" |
| `{{rejectionReason}}` | Motivo del rechazo | "Documento Vencido" |
| `{{rejectedAt}}` | Fecha y hora del rechazo (ISO) | "2025-01-05T12:30:00.000Z" |

### Template Sugerido

```
Hola {{name}},

Tu documento de {{documentTypeName}} ha sido rechazado por el siguiente motivo:

📋 *Motivo:* {{rejectionReason}}

Por favor, envianos por este medio el documento corregido para avanzar con tu postulación.

Si necesitas ayuda, contáctanos respondiendo a este mensaje.
```

### Motivos Rápidos Predefinidos

Los administradores pueden seleccionar rápidamente estos motivos:

1. **Documento Vencido** - El certificado ya no es válido
2. **No corresponde a lo solicitado** - El documento cargado no es un Certificado de Antecedentes Penales

Los administradores también pueden escribir motivos personalizados si ninguno de los predefinidos aplica.

## Implementación Técnica

### Archivo: `app/api/postulaciones/documents/[id]/reject/route.ts`

```typescript
// Detecta si es Antecedentes Penales
const isCriminalRecord =
  updatedDoc.documentType === 'CRIMINAL_RECORD' ||
  updatedDoc.documentType === 'ANTECEDENTES';

// Solo envía WhatsApp para Antecedentes Penales
if (isCriminalRecord) {
  await messagesService.sendWhatsAppMessage({
    phone: driver.phoneNumber,
    name: firstName,
    type: WhatsAppMessageType.DOCUMENT_REJECTED,
    formDriverId: driver.id,
    source: WhatsAppMessageSource.TRIGGER,
    botId: 'bot-adquisicion-prod',
    metadata: { /* ... */ }
  });
}
```

### Enum: `prisma/schema.prisma`

```prisma
enum WhatsAppMessageType {
  // ... otros tipos
  DOCUMENT_REJECTED // Documento rechazado
}
```

## Base de Datos

Cada mensaje enviado se registra en la tabla `WhatsAppMessage`:

```sql
SELECT
  phone,
  name,
  type,
  status,
  metadata->>'rejectionReason' as rejection_reason,
  sent_at
FROM whatsapp_messages
WHERE type = 'DOCUMENT_REJECTED'
ORDER BY sent_at DESC;
```

## Configuración del Bot Backend

### Archivo de Configuración (ejemplo)

El bot backend debe tener una entrada en su configuración de templates:

```javascript
const messageTemplates = {
  // ... otros templates
  'document_rejected': {
    template: `Hola {{name}},

Tu documento de {{documentTypeName}} ha sido rechazado por el siguiente motivo:

📋 *Motivo:* {{rejectionReason}}

Por favor, envianos por este medio el documento corregido para avanzar con tu postulación.

Si necesitas ayuda, contáctanos respondiendo a este mensaje.`,

    requiredFields: ['name', 'documentTypeName', 'rejectionReason'],

    format: (data) => {
      return template
        .replace('{{name}}', data.name)
        .replace('{{documentTypeName}}', data.metadata.documentTypeName)
        .replace('{{rejectionReason}}', data.metadata.rejectionReason);
    }
  }
};
```

## Monitoreo y Logs

### Ver mensajes enviados

En el panel de administración, los mensajes se pueden ver en:
- Historial de mensajes WhatsApp
- Filtrar por tipo: `DOCUMENT_REJECTED`
- Ver metadata completa con motivo de rechazo

### Logs del servidor

```bash
# Mensaje exitoso
WhatsApp message sent for document rejection: {
  success: true,
  messageId: 'msg_xxxxx',
  botUsed: 'bot-adquisicion-prod'
}

# Error (no interrumpe el rechazo del documento)
Error al enviar mensaje de WhatsApp: [error details]
No se pudo enviar WhatsApp: conductor sin teléfono o nombre
```

## Consideraciones Importantes

1. **No bloquea el rechazo**: Si falla el envío del WhatsApp, el documento se rechaza igualmente
2. **Solo Antecedentes Penales**: Por ahora, solo se envían notificaciones para este tipo de documento
3. **Motivos personalizables**: Los admins pueden escribir cualquier motivo, no solo los predefinidos
4. **Formato de teléfono**: El sistema maneja automáticamente el formato de teléfonos de Paraguay (595) y Argentina (549)
5. **Bot específico**: Usa `bot-adquisicion-prod` para estos mensajes

## Próximos Pasos (Expansión Futura)

Para agregar notificaciones a otros tipos de documentos:

1. Modificar la condición `isCriminalRecord` en el archivo `route.ts`
2. Agregar tipos de documentos adicionales
3. Opcionalmente, crear templates específicos por tipo de documento

```typescript
// Ejemplo para múltiples tipos
const shouldNotify = [
  'CRIMINAL_RECORD',
  'ANTECEDENTES',
  'CEDULA_FRONT',  // Agregar más si es necesario
  'CEDULA_BACK'
].includes(updatedDoc.documentType);
```

## Contacto y Soporte

Para modificar los templates o agregar nuevos tipos de mensajes, contactar al equipo de desarrollo o modificar directamente la configuración del bot backend.
