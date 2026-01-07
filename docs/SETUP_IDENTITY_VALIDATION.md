# Guía de Configuración - Sistema de Validación de Identidad

## 🚀 Pasos de Configuración

### 1. Variables de Entorno

Asegúrate de tener estas variables en tu `.env` o en Vercel:

```bash
# API de Claude (Anthropic) - REQUERIDA
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxx

# Secret para proteger cron jobs (opcional pero recomendado)
CRON_SECRET=un-secret-aleatorio-seguro-123
```

### 2. Configurar Cron Job en Vercel

**Opción A: Usando vercel.json (Recomendado)**

Agrega esto a tu `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/validate-identity-documents",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

Schedules disponibles:
- `"0 */6 * * *"` - Cada 6 horas
- `"0 */3 * * *"` - Cada 3 horas
- `"0 */1 * * *"` - Cada 1 hora
- `"0 9 * * *"` - Todos los días a las 9am
- `"0 9,15,21 * * *"` - 3 veces al día (9am, 3pm, 9pm)

**Opción B: Configurar manualmente en Vercel Dashboard**

1. Ve a tu proyecto en Vercel
2. Settings → Cron Jobs
3. Click "Add Cron Job"
4. Path: `/api/cron/validate-identity-documents`
5. Schedule: Elige la frecuencia (ej: "Every 6 hours")
6. Save

### 3. Probar el Sistema

#### Probar validación manual (desde admin)

1. Ve a `/admin/adquisicion/documentos` en tu app
2. Busca un conductor con documentos de Cédula y Antecedentes en estado `PENDING`
3. Click en el botón "Validar"
4. Espera el resultado (puede tardar 10-15 segundos)
5. Verifica que:
   - Los documentos cambiaron de estado
   - Se creó una nota de auditoría
   - La metadata contiene los datos extraídos

#### Probar cron job manualmente

Desde tu terminal o Postman:

```bash
curl -X GET https://tu-dominio.vercel.app/api/cron/validate-identity-documents \
  -H "Authorization: Bearer $CRON_SECRET"
```

Ejemplo de respuesta exitosa:
```json
{
  "success": true,
  "message": "Processed 3 drivers: 2 approved, 1 rejected, 0 need review",
  "stats": {
    "totalProcessed": 3,
    "approved": 2,
    "rejected": 1,
    "needsReview": 0,
    "errors": 0,
    "executionTimeMs": 24530
  },
  "details": [
    {
      "driverId": "abc123",
      "driverName": "Juan Pérez",
      "status": "approved",
      "score": 100,
      "errors": 0
    }
  ]
}
```

### 4. Monitorear en Producción

#### Ver logs en Vercel

1. Ve a tu proyecto en Vercel
2. Logs → Realtime
3. Filtra por `/api/cron/validate-identity-documents`
4. Busca los emojis 🇵🇾 para identificar las validaciones

#### Ver resultados en la base de datos

```sql
-- Ver documentos validados recientemente
SELECT
  fd.id,
  fd.document_type,
  fd.status,
  fd.reviewed_by,
  fd.reviewed_at,
  fd.metadata->'paraguayValidation'->>'status' as validation_status,
  fd.metadata->'paraguayValidation'->>'score' as score
FROM form_documents fd
WHERE fd.reviewed_by = 'AI_PARAGUAY_VALIDATOR'
ORDER BY fd.reviewed_at DESC
LIMIT 20;
```

### 5. Ajustar Parámetros (Opcional)

Puedes modificar estos valores en los archivos:

**En `/lib/services/paraguay-identity-validator.service.ts`:**
```typescript
// Línea ~474: Cambiar delay entre validaciones
await new Promise(resolve => setTimeout(resolve, 2000)); // 2 segundos

// Línea ~749: Cambiar límite de batch
async processPendingValidationsBatch(limit: number = 5) // Procesa 5 drivers
```

**En `/app/api/cron/validate-identity-documents/route.ts`:**
```typescript
// Línea 8: Cambiar límite de drivers por ejecución
const MAX_DRIVERS_PER_EXECUTION = 10;

// Línea 9: Cambiar delay entre validaciones
const DELAY_BETWEEN_VALIDATIONS_MS = 3000; // 3 segundos
```

## 🧪 Casos de Prueba

### Caso 1: Documentos válidos y coincidentes

**Esperado**: `APPROVED` automáticamente

**Requisitos**:
- CI coincidente en ambos documentos
- Nombre coincidente (tolerancia a 2 caracteres)
- Cédula no vencida
- Antecedentes vigente (dentro del período)
- "NO REGISTRA ANTECEDENTES"

### Caso 2: CI no coincidente

**Esperado**: `REJECTED` automáticamente

**Error**:
```json
{
  "code": "CI_MISMATCH",
  "field": "numeroCI",
  "message": "El número de CI no coincide. Cédula: 1234567, Antecedentes: 7654321",
  "severity": "critical"
}
```

### Caso 3: Cédula vencida

**Esperado**: `REJECTED` automáticamente

**Error**:
```json
{
  "code": "CEDULA_EXPIRED",
  "field": "fechaVencimiento",
  "message": "La cédula venció el 2023-01-15",
  "severity": "critical"
}
```

### Caso 4: Con antecedentes penales

**Esperado**: `REJECTED` automáticamente

**Error**:
```json
{
  "code": "HAS_ANTECEDENTES",
  "field": "registraAntecedentes",
  "message": "El certificado indica que la persona REGISTRA ANTECEDENTES",
  "severity": "critical"
}
```

## 🔧 Troubleshooting

### "No se pudieron extraer los datos de los documentos"

**Posibles causas**:
- Imagen demasiado borrosa o de baja calidad
- Documento en formato no soportado
- Error de red con Claude API
- Prompt mal interpretado por Claude

**Solución**:
1. Verificar que la imagen sea legible
2. Revisar logs para ver el error exacto
3. Verificar que `ANTHROPIC_API_KEY` sea válida
4. Probar con otra imagen de mejor calidad

### "Error 401 Unauthorized"

**Causa**: `ANTHROPIC_API_KEY` inválida o no configurada

**Solución**:
1. Verificar que la variable esté en `.env`
2. Reiniciar el servidor de desarrollo
3. En producción, verificar en Vercel → Settings → Environment Variables

### El cron job no se ejecuta

**Posibles causas**:
- Cron job no configurado en Vercel
- Schedule incorrecto
- Error en el código del endpoint

**Solución**:
1. Verificar configuración en Vercel → Settings → Cron Jobs
2. Probar endpoint manualmente con curl
3. Ver logs en Vercel para errores

### Validación muy lenta

**Causa**: La API de Claude puede tardar 5-10 segundos por imagen

**Solución**:
- Es normal, el delay es por la API externa
- Considera reducir el `MAX_DRIVERS_PER_EXECUTION` si hay timeouts
- Asegúrate de tener delays entre validaciones para no saturar la API

## 📊 Costos Estimados

**Claude API (Anthropic)**:
- Modelo: `claude-sonnet-4-20250514`
- ~$3 USD por 1M de tokens input
- ~$15 USD por 1M de tokens output

**Por validación**:
- 2 imágenes (cédula + antecedentes)
- ~2000 tokens input por imagen ≈ 4000 tokens
- ~500 tokens output ≈ 500 tokens
- **Costo aproximado: $0.02 USD por validación**

**Ejemplo mensual** (100 validaciones):
- 100 validaciones × $0.02 = **$2 USD/mes**

## ✅ Checklist de Deployment

- [ ] `ANTHROPIC_API_KEY` configurada en Vercel
- [ ] `CRON_SECRET` configurada (opcional pero recomendado)
- [ ] Cron job configurado en `vercel.json` o Vercel Dashboard
- [ ] Probado endpoint manualmente con curl
- [ ] Verificado que el botón "Validar" funciona en el admin
- [ ] Revisado logs para confirmar que no hay errores
- [ ] Documentación compartida con el equipo operativo

## 🎯 Próximos Pasos

1. **Monitorear primeras validaciones** en producción
2. **Ajustar parámetros** según volumen real
3. **Configurar alertas** si hay muchos errores
4. **Capacitar al equipo** sobre cómo interpretar los resultados
5. **Iterar** basado en feedback del equipo operativo
