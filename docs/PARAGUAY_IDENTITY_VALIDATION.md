# Sistema de Validación de Documentos de Identidad Paraguayos

## 📋 Descripción General

Sistema híbrido de validación de documentos de identidad paraguayos que combina:
- **Extracción de datos con IA** (Claude API): Para leer y estructurar información de imágenes
- **Validación de reglas de negocio en TypeScript**: Para aplicar lógica de validación sin IA

## 🎯 Documentos Soportados

1. **Cédula de Identidad Civil** (Paraguay)
   - Número de CI
   - Nombre completo
   - Fecha de nacimiento
   - Fecha de vencimiento
   - Sexo

2. **Certificado de Antecedentes Penales** (Policía Nacional)
   - Número de CI
   - Nombre completo
   - Fecha de emisión
   - Período de validez (en meses)
   - Si registra antecedentes o no

## ✅ Reglas de Validación

El sistema valida automáticamente las siguientes reglas:

1. **Coincidencia de CI**: El número de cédula debe ser idéntico en ambos documentos
2. **Coincidencia de nombre**: Los nombres deben coincidir (con tolerancia a errores de hasta 2 caracteres)
3. **Cédula vigente**: La cédula no debe estar vencida
4. **Antecedentes vigente**: El certificado debe estar dentro del período de validez
5. **Sin antecedentes**: El certificado debe indicar "NO REGISTRA ANTECEDENTES"

## 🚦 Decisiones Automáticas

### ✅ APPROVED (Aprobado automáticamente)
- Todas las validaciones pasan
- Score ≥ 85/100
- Los documentos se marcan como `APPROVED`
- El driver se actualiza a `documentsStatus: APPROVED`

### ❌ REJECTED (Rechazado automáticamente)
- Al menos una validación crítica falla
- Score < 60/100
- Los documentos se marcan como `REJECTED`
- El driver se actualiza a `documentsStatus: CORRECTIONS`
- Se guarda el motivo del rechazo en `rejectionReason`

### ⚠️ NEEDS_REVIEW (Requiere revisión manual)
- Validaciones pasan pero con warnings
- Score entre 60-84/100
- Los documentos se marcan como `IN_REVIEW`
- El driver se actualiza a `documentsStatus: IN_REVIEW`

## 🔧 Uso del Sistema

### 1. Validación Manual desde Admin

El botón "Validar" en la tabla de documentos ([documents-table.tsx](../components/admin/documents-table.tsx)) ya está configurado.

Cuando un conductor tiene documentos de Cédula y Antecedentes pendientes:
1. Click en "Validar"
2. El sistema automáticamente:
   - Detecta que son documentos de identidad paraguaya
   - Usa el validador especializado
   - Extrae datos con Claude API
   - Valida reglas de negocio
   - Actualiza estados automáticamente
   - Crea nota de auditoría

### 2. Cron Job Automático

**Endpoint**: `/api/cron/validate-identity-documents`

**Configuración en Vercel**:
```bash
# Configurar cron job en vercel.json
{
  "crons": [
    {
      "path": "/api/cron/validate-identity-documents",
      "schedule": "0 */6 * * *"  # Cada 6 horas
    }
  ]
}
```

**Probar manualmente**:
```bash
curl -X GET https://tu-dominio.com/api/cron/validate-identity-documents \
  -H "Authorization: Bearer $CRON_SECRET"
```

**Comportamiento**:
- Procesa hasta 10 conductores por ejecución (configurable)
- Solo procesa drivers con documentos `PENDING`
- Pausa de 3 segundos entre validaciones para no saturar la API
- Retorna estadísticas completas

### 3. Mediante Server Action (Programático)

```typescript
import { validateParaguayIdentityDocuments } from '@/lib/actions/identity-validation.actions';

// Validar un conductor específico
const result = await validateParaguayIdentityDocuments(formDriverId);

if (result.success) {
  console.log('Status:', result.data.status);
  console.log('Errores:', result.data.errors);
  console.log('Score:', result.data.validationMetadata.validationScore);
}
```

## 📊 Metadata Guardada

El sistema guarda metadata completa en `FormDocument.metadata`:

```json
{
  "paraguayValidation": {
    "status": "approved|rejected|needs_review",
    "validatedAt": "2025-01-05T10:30:00Z",
    "score": 95,
    "ciMatch": true,
    "nameMatch": true,
    "cedulaExpired": false,
    "antecedentesExpired": false,
    "hasAntecedentes": false,
    "errors": [
      {
        "code": "CI_MISMATCH",
        "field": "numeroCI",
        "message": "El número de CI no coincide...",
        "severity": "critical"
      }
    ],
    "extractedData": {
      "cedula": {
        "numeroCI": "1234567",
        "nombreCompleto": "JUAN PEREZ",
        "fechaNacimiento": "1990-01-15",
        "fechaVencimiento": "2028-01-15",
        "sexo": "M"
      },
      "antecedentes": {
        "numeroCI": "1234567",
        "nombreCompleto": "JUAN PEREZ",
        "fechaEmision": "2024-12-01",
        "periodoValidezMeses": 6,
        "registraAntecedentes": false
      }
    }
  }
}
```

## 🛡️ Tolerancia a Errores

### Nombres con variaciones menores
El sistema tolera diferencias de hasta 2 caracteres:
- ✅ "MARIA" vs "MARÍA"
- ✅ "CRISTIAN" vs "CRISTIN"
- ✅ "JUAN PEREZ" vs "JUAN PÉREZ"
- ❌ "JUAN" vs "PEDRO" (diferencia mayor)

### Cálculo de similitud
Usa el algoritmo de Levenshtein con 95% de similitud requerida.

## 📁 Archivos del Sistema

```
lib/
├── services/
│   └── paraguay-identity-validator.service.ts  # Servicio principal
├── actions/
│   └── identity-validation.actions.ts          # Server actions
app/
├── api/
│   ├── admin/drivers/[id]/validate-documents/
│   │   └── route.ts                            # Endpoint de validación manual
│   └── cron/validate-identity-documents/
│       └── route.ts                            # Cron job automático
components/
└── admin/
    └── documents-table.tsx                     # UI con botón "Validar"
```

## ⚙️ Variables de Entorno Requeridas

```bash
# API de Claude (Anthropic)
ANTHROPIC_API_KEY=sk-ant-api03-...

# Secret para cron jobs
CRON_SECRET=tu-secret-aqui
```

## 🧪 Testing

### Probar extracción de datos

```typescript
import { paraguayIdentityValidator } from '@/lib/services/paraguay-identity-validator.service';

// Validar un conductor
const result = await paraguayIdentityValidator.validateIdentityDocuments('driver-id-123');

console.log('Status:', result.status);
console.log('Datos extraídos:', result.extractedData);
console.log('Errores:', result.errors);
console.log('Score:', result.validationMetadata.validationScore);
```

### Probar batch de validaciones

```typescript
const batchResults = await paraguayIdentityValidator.processPendingValidationsBatch(5);

console.log(`Procesados: ${batchResults.totalProcessed}`);
console.log(`Aprobados: ${batchResults.approved}`);
console.log(`Rechazados: ${batchResults.rejected}`);
```

## 📈 Monitoreo y Logs

Todos los logs incluyen:
- 🇵🇾 Emoji para identificar el validador de Paraguay
- Score de validación (0-100)
- Errores encontrados
- Tiempo de procesamiento
- Metadata completa

Ejemplo:
```
🇵🇾 Iniciando validación de identidad paraguaya para driver abc123
  📄 Encontrados: 1 cédula(s), 1 antecedente(s)
  🤖 Extrayendo datos con Claude API...
     ✓ Cédula extraída: JUAN PEREZ - CI 1234567
     ✓ Antecedentes extraídos: JUAN PEREZ - CI 1234567
  📋 Validando reglas de negocio...
     Errores críticos: 0
     Warnings: 0
     Decisión: APPROVED
  ✅ Validación completada: approved
     Score: 100
     Errores: 0
```

## 🔄 Flujo de Trabajo Típico

1. **Usuario sube documentos** → Estado: `PENDING`
2. **Admin clickea "Validar"** (o cron job ejecuta)
3. **Sistema extrae datos** con Claude API
4. **Sistema valida reglas** en TypeScript
5. **Decisión automática**:
   - ✅ APPROVED → Driver listo para onboarding
   - ❌ REJECTED → Notificar al conductor para resubir
   - ⚠️ NEEDS_REVIEW → Admin revisa manualmente
6. **Metadata guardada** para auditoría

## 🚨 Manejo de Errores

### Si falla la extracción con Claude
- Estado: `REJECTED`
- Error: "No se pudieron extraer los datos de los documentos"
- Score: 0

### Si la imagen es ilegible
- Claude retorna error en el parsing
- Se guarda en metadata
- El documento queda en `IN_REVIEW` para revisión manual

### Si falla la conexión a la API
- El error se propaga
- No se actualizan estados
- Se puede reintentar manualmente

## 💡 Mejoras Futuras

- [ ] Enviar notificación WhatsApp automática al aprobar/rechazar
- [ ] Dashboard de estadísticas de validación
- [ ] Soporte para otros tipos de documentos (licencia, registro vehicular)
- [ ] Validación cruzada con API de Identificaciones Paraguay (si existe)
- [ ] OCR fallback si Claude API falla

## 📞 Soporte

Si tienes dudas o problemas:
1. Revisa los logs en la consola
2. Verifica que `ANTHROPIC_API_KEY` esté configurada
3. Chequea que los documentos sean imágenes legibles
4. Revisa la metadata en la base de datos para ver qué falló
