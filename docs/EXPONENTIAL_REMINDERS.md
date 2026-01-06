# Sistema de Recordatorios Exponenciales para Formularios Incompletos

## 📊 Resumen

Sistema automatizado de re-engagement que envía recordatorios periódicos a conductores con formularios incompletos, con intervalos exponenciales que aumentan progresivamente para evitar saturación.

---

## 🎯 Estrategia de Recordatorios

### Calendario de Mensajes

| Nivel | Tiempo desde último mensaje/actividad | Descripción |
|-------|--------------------------------------|-------------|
| 1 | **6 horas** | Primer recordatorio |
| 2 | **3 días** (72 horas) | Segundo recordatorio |
| 3 | **7 días** (168 horas) | Tercer recordatorio |
| 4 | **14 días** (336 horas) | Cuarto recordatorio |
| 5 | **30 días** (720 horas) | Quinto recordatorio |
| 6 | **60 días** (1440 horas) | Sexto recordatorio |
| 7 | **90 días** (2160 horas) | Séptimo recordatorio |
| 8-10 | **30 días** cada uno | Recordatorios finales |

**Máximo total:** 10 mensajes por conductor

**Después del nivel 7:** Los recordatorios continúan cada 30 días hasta alcanzar el máximo

---

## ⚙️ Funcionamiento Técnico

### 1. Detección de Candidatos

El cron job analiza conductores con:
- ✅ Estado: `IN_PROGRESS` (formulario empezado)
- ✅ `assistedCompletion: false` (no completado con asistencia)
- ✅ Tienen teléfono y nombre
- ✅ Tiempo suficiente desde último mensaje/actividad

### 2. Cálculo del Nivel de Recordatorio

```typescript
// Para cada conductor:
1. Obtener último mensaje FORM_INCOMPLETE enviado
2. Extraer reminderLevel del metadata (o 0 si es el primero)
3. Calcular horas desde ese mensaje
4. Verificar si cumple intervalo del siguiente nivel
5. Si cumple → Enviar mensaje con nivel incrementado
```

### 3. Metadata de Cada Mensaje

```json
{
  "reminderLevel": 3,
  "previousReminderLevel": 2,
  "hoursSinceLastReminder": 170,
  "inactiveHours": 504,
  "lastActivityAt": "2025-12-20T10:30:00.000Z",
  "lastReminderSentAt": "2025-12-27T12:00:00.000Z",
  "cronExecutedAt": "2026-01-05T10:00:00.000Z",
  "currentStep": 3
}
```

---

## 🔄 Reset del Contador

### ¿Cuándo se resetea?

El contador se **resetea automáticamente** cuando el conductor **avanza en el formulario** (completa un nuevo step).

### Implementación

**Archivo:** `app/api/form/submit-step/route.ts`

```typescript
// Al completar un step > 1:
if (submission.formDriverId && step > 1) {
  // Eliminar todos los mensajes FORM_INCOMPLETE previos
  await prisma.whatsAppMessage.deleteMany({
    where: {
      formDriverId: submission.formDriverId,
      type: WhatsAppMessageType.FORM_INCOMPLETE
    }
  });

  console.log(`🔄 Reset reminder counter (step ${step} completed)`);
}
```

### Ejemplo

```
Juan recibe recordatorios:
- Nivel 1 (6h) → Enviado
- Nivel 2 (3 días después) → Enviado
- Juan completa el paso 3 → ✅ CONTADOR RESETEADO
- Nivel 1 (6h desde nueva actividad) → Se enviará de nuevo
```

---

## 🚫 Condiciones para DETENER Mensajes

Los recordatorios se **detienen** cuando:

1. ✅ **Completa el formulario** → Estado cambia a `COMPLETED`
2. ✅ **Postulación rechazada** → Estado cambia a `REJECTED`
3. ✅ **Alcanza 10 recordatorios** → Límite máximo
4. ✅ **Avanza en el formulario** → Contador se resetea (sigue recibiendo desde nivel 1)

Los recordatorios **NO se detienen** por:
- ❌ Responder al WhatsApp (no tenemos forma de detectarlo)
- ❌ Abrir el formulario sin completar steps
- ❌ Contacto manual del admin (los crons siguen corriendo)

---

## 📝 Configuración del Cron Job

### Archivo
`app/api/cron/check-pending-applications/route.ts`

### Rate Limits (sin cambios)

```typescript
MAX_MESSAGES_PER_EXECUTION = 30
DELAY_BETWEEN_MESSAGES_MS = 8000  // 8 segundos
BATCH_SIZE = 5
DELAY_BETWEEN_BATCHES_MS = 60000  // 60 segundos
MAX_TOTAL_REMINDERS = 10
```

### Configuración de Intervalos

```typescript
const REMINDER_INTERVALS = [
  { level: 1, hours: 6, description: '6 horas' },
  { level: 2, hours: 72, description: '3 días' },
  { level: 3, hours: 168, description: '7 días' },
  { level: 4, hours: 336, description: '14 días' },
  { level: 5, hours: 720, description: '30 días' },
  { level: 6, hours: 1440, description: '60 días' },
  { level: 7, hours: 2160, description: '90 días' },
  { level: 8, hours: 720, description: '30 días (8)' },
  { level: 9, hours: 720, description: '30 días (9)' },
  { level: 10, hours: 720, description: '30 días (10)' },
];
```

---

## 🤖 Configuración del Bot de WhatsApp

### NO SE REQUIEREN CAMBIOS

El mensaje sigue siendo el mismo tipo: `FORM_INCOMPLETE`

El bot ya está configurado para manejar este tipo de mensaje con los siguientes steps:
- `personal_info` - Pasos 1-3
- `documents` - Paso 4
- `bank_info` - Paso 5
- `equipment_payment` - Paso 6

### Lo que SÍ se envía adicional

El `metadata` del mensaje ahora incluye el `reminderLevel`, lo cual permite analytics pero **no afecta el contenido del mensaje**.

Si quieres mensajes **diferentes por nivel**, podrías modificar el bot para que detecte `metadata.reminderLevel` y cambie el texto:

```javascript
// Ejemplo en el bot (OPCIONAL):
if (metadata.reminderLevel === 1) {
  message = "Hola! Vemos que empezaste...";
} else if (metadata.reminderLevel >= 5) {
  message = "Última oportunidad...";
} else {
  message = "Recordatorio: completa tu postulación...";
}
```

**Por ahora:** El bot envía el mismo mensaje en todos los niveles.

---

## 📊 Monitoreo y Analytics

### Queries Útiles

**Ver distribución de niveles:**
```sql
SELECT
  (metadata->>'reminderLevel')::int as level,
  COUNT(*) as count
FROM whatsapp_messages
WHERE type = 'FORM_INCOMPLETE'
  AND sent_at > NOW() - INTERVAL '30 days'
GROUP BY level
ORDER BY level;
```

**Conductores en cada nivel:**
```sql
WITH last_reminders AS (
  SELECT DISTINCT ON (form_driver_id)
    form_driver_id,
    (metadata->>'reminderLevel')::int as level,
    sent_at
  FROM whatsapp_messages
  WHERE type = 'FORM_INCOMPLETE'
  ORDER BY form_driver_id, sent_at DESC
)
SELECT
  level,
  COUNT(*) as conductors_at_this_level
FROM last_reminders
GROUP BY level
ORDER BY level;
```

**Tasa de conversión por nivel:**
```sql
-- Conductores que completaron después de cada nivel
SELECT
  (wm.metadata->>'reminderLevel')::int as reminder_level,
  COUNT(DISTINCT CASE WHEN fd.status = 'COMPLETED' THEN fd.id END) as completed,
  COUNT(DISTINCT fd.id) as total,
  ROUND(100.0 * COUNT(DISTINCT CASE WHEN fd.status = 'COMPLETED' THEN fd.id END) / COUNT(DISTINCT fd.id), 2) as completion_rate
FROM whatsapp_messages wm
JOIN form_drivers fd ON wm.form_driver_id = fd.id
WHERE wm.type = 'FORM_INCOMPLETE'
GROUP BY reminder_level
ORDER BY reminder_level;
```

---

## 🧪 Testing

### Preview Endpoint

```bash
GET /api/cron/preview-pending
```

Muestra quiénes recibirían mensajes en la próxima ejecución (sin enviarlos).

### Test Manual

1. Crear un conductor de prueba que se quede en paso 2
2. Esperar 6 horas (o modificar `REMINDER_INTERVALS` temporalmente)
3. Ejecutar el cron manualmente
4. Verificar que recibe mensaje con `reminderLevel: 1`
5. Completar paso 3
6. Verificar que los mensajes previos se eliminaron
7. Esperar nuevamente y verificar que vuelve a recibir nivel 1

### Logs Esperados

```bash
🔄 [CRON] Starting check-pending-applications job (Exponential Re-engagement)...
🤖 [CRON] Using bot: bot-adquisicion-prod
📊 [CRON] Reminder intervals: L1:6 horas, L2:3 días, L3:7 días...
   📋 Driver Juan Perez: Level 2 → 3 (170h since last reminder)
📦 [CRON] Processing batch 1 (5 drivers)...
   → [Level 3] Sending to Juan Perez (1/5)...
✅ [CRON] Job completed: 5 sent, 0 failed, 0 skipped
```

---

## 🔧 Troubleshooting

### Problema: "No drivers eligible for reminders"

**Causas:**
- Ningún conductor cumple el intervalo de tiempo
- Todos ya alcanzaron el máximo de 10 recordatorios
- Todos completaron el formulario

**Solución:** Revisar la BD para ver en qué nivel están

### Problema: Conductor no recibe más mensajes

**Verificar:**
1. ¿Alcanzó los 10 recordatorios? → Normal
2. ¿Completó el formulario? → Normal
3. ¿Su status cambió a REJECTED? → Normal
4. ¿Tiene reminderLevel pero no ha pasado suficiente tiempo? → Esperar

### Problema: Se resetea el contador cuando no debería

**Causa:** El conductor está editando steps ya completados

**Comportamiento actual:** Cualquier submit de un step > 1 resetea el contador

**Si es un problema:** Modificar la lógica para solo resetear cuando se completa un **nuevo** step (no cuando se edita uno anterior)

---

## 📈 Mejoras Futuras (Opcional)

1. **Mensajes personalizados por nivel**
   - Nivel 1: Amigable
   - Nivel 5+: Más urgente
   - Nivel 10: Última oportunidad

2. **Segmentación por paso incompleto**
   - Mensaje diferente si está en paso 2 vs paso 5
   - Mencionar específicamente qué falta

3. **Dashboard de analytics**
   - Ver conductores en cada nivel
   - Tasa de conversión por nivel
   - Tiempo promedio hasta completar

4. **A/B Testing**
   - Probar diferentes intervalos
   - Diferentes mensajes
   - Medir qué funciona mejor

---

## ✅ Checklist Post-Deploy

- [ ] Verificar que el cron está configurado para ejecutarse periódicamente
- [ ] Revisar logs de la primera ejecución
- [ ] Verificar en la BD que los `reminderLevel` se están guardando correctamente
- [ ] Probar que el reset funciona al avanzar en el formulario
- [ ] Configurar alertas si el cron falla
- [ ] Monitorear tasas de conversión por nivel durante el primer mes

---

**🎉 Sistema implementado y listo para usar!**
