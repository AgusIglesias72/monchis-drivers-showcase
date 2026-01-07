# 🧪 Cómo Probar el Sistema de Validación

## ✅ Cambios Implementados

### 1. Validación de Nombres MUY Flexible
- **Antes**: Requería coincidencia casi exacta (95% de similitud)
- **Ahora**: Solo requiere que **AL MENOS 1 NOMBRE** coincida entre documentos
- Ejemplos que ahora funcionan:
  - Cédula: "JUAN CARLOS PEREZ GOMEZ" vs Antecedentes: "JUAN PEREZ" ✅
  - Cédula: "MARIA JOSE RODRIGUEZ" vs Antecedentes: "MARIA RODRIGUEZ" ✅
  - Cédula: "CRISTIAN" vs Antecedentes: "CRISTIN" ✅ (tolerancia a 2 caracteres)
  - Cédula: "JUAN" vs Antecedentes: "PEDRO" ❌ (ningún nombre coincide)

### 2. Validación Robusta del Certificado
- **Antes**: Intentaba extraer datos sin verificar si era un certificado válido
- **Ahora**: Claude primero valida que la imagen sea un certificado oficial
- Rechaza automáticamente si detecta:
  - Fotos random que no son documentos
  - Otros documentos (licencia, cédula, etc.)
  - Imágenes en blanco o ilegibles
  - Screenshots de cosas random

### 3. Solo Validación Manual Activa
- ✅ **Botón "Validar" en admin**: ACTIVO y listo para usar
- ⏸️ **Cron job automático**: PREPARADO pero NO activo (para activar después)

## 🚀 Cómo Probar (Paso a Paso)

### Paso 1: Verificar que tengas la API key
```bash
# En tu .env o en Vercel
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxx
```

### Paso 2: Encuentra un conductor con documentos pendientes

1. Ve a `/admin/adquisicion/documentos` en tu navegador
2. Busca conductores que tengan:
   - ✅ Cédula (CEDULA_FRONT o CEDULA_BACK) en estado `PENDING`
   - ✅ Antecedentes (CRIMINAL_RECORD) en estado `PENDING`

### Paso 3: Click en "Validar"

1. Abre el conductor (click en la fila para expandir)
2. Verás el botón **"Validar"** al lado del nombre del conductor
3. Click en "Validar"
4. Espera 10-15 segundos (está procesando con Claude API)

### Paso 4: Ver resultados

El sistema automáticamente:
- ✅ Extrae datos de ambos documentos
- ✅ Valida las 5 reglas de negocio
- ✅ Decide APPROVED/REJECTED/NEEDS_REVIEW
- ✅ Actualiza el estado en la base de datos
- ✅ Crea nota de auditoría

**Ejemplo de resultado APPROVED**:
```
Status: approved
Score: 100/100
Errores: 0

Datos extraídos:
- CI: 1234567
- Nombre (Cédula): JUAN CARLOS PEREZ
- Nombre (Antecedentes): JUAN PEREZ
- ✓ Nombre coincide: "JUAN" encontrado en ambos documentos
- ✓ CI coincide
- ✓ Cédula vigente
- ✓ Certificado vigente
- ✓ Sin antecedentes
```

**Ejemplo de resultado REJECTED**:
```
Status: rejected
Score: 40/100
Errores: 2

❌ La cédula venció el 2023-01-15
❌ El certificado está vencido
```

## 🧪 Casos de Prueba Recomendados

### Caso 1: Documentos Válidos (Esperado: APPROVED)
- Cédula con CI 1234567, nombre "JUAN PEREZ", no vencida
- Antecedentes con CI 1234567, nombre "JUAN", vigente, "NO REGISTRA"
- **Resultado esperado**: ✅ APPROVED automáticamente

### Caso 2: Nombre Incompleto (Esperado: APPROVED)
- Cédula: "MARIA JOSE RODRIGUEZ GONZALEZ"
- Antecedentes: "MARIA RODRIGUEZ"
- **Resultado esperado**: ✅ APPROVED (coincide "MARIA" y "RODRIGUEZ")

### Caso 3: CI No Coincide (Esperado: REJECTED)
- Cédula con CI 1234567
- Antecedentes con CI 7654321
- **Resultado esperado**: ❌ REJECTED (error crítico)

### Caso 4: Cédula Vencida (Esperado: REJECTED)
- Cédula con vencimiento 2023-01-15
- **Resultado esperado**: ❌ REJECTED (error crítico)

### Caso 5: Con Antecedentes (Esperado: REJECTED)
- Certificado que dice "REGISTRA ANTECEDENTES"
- **Resultado esperado**: ❌ REJECTED (error crítico)

### Caso 6: No Es un Certificado (Esperado: REJECTED)
- Usuario sube una foto random, screenshot, o imagen en blanco
- **Resultado esperado**: ❌ REJECTED con mensaje "El documento no es un Certificado de Antecedentes válido"

### Caso 7: Ningún Nombre Coincide (Esperado: NEEDS_REVIEW)
- Cédula: "JUAN PEREZ"
- Antecedentes: "PEDRO GOMEZ"
- **Resultado esperado**: ⚠️ NEEDS_REVIEW (warning, requiere revisión manual)

## 📊 Dónde Ver los Resultados

### 1. En la Interfaz del Admin
- Los documentos cambian de `PENDING` a `APPROVED`, `REJECTED`, o `IN_REVIEW`
- El driver cambia `documentsStatus` a `APPROVED`, `CORRECTIONS`, o `IN_REVIEW`
- Se crea una nota de auditoría visible en el perfil del conductor

### 2. En la Consola del Navegador (F12)
```
🇵🇾 Iniciando validación de identidad paraguaya para driver abc123
  📄 Encontrados: 1 cédula(s), 1 antecedente(s)
  🤖 Extrayendo datos con Claude API...
     ✓ Cédula extraída: JUAN PEREZ - CI 1234567
     ✓ Antecedentes extraídos: JUAN PEREZ - CI 1234567
  📋 Validando reglas de negocio...
     ✓ Nombre coincide: "JUAN" encontrado en ambos documentos
     Errores críticos: 0
     Warnings: 0
     Decisión: APPROVED
  ✅ Validación completada: approved
     Score: 100
```

### 3. En la Base de Datos (metadata)
```sql
SELECT
  id,
  document_type,
  status,
  reviewed_by,
  metadata->'paraguayValidation'->>'status' as validation_status,
  metadata->'paraguayValidation'->>'score' as score,
  metadata->'paraguayValidation'->'errors' as errors,
  metadata->'paraguayValidation'->'extractedData' as extracted_data
FROM form_documents
WHERE reviewed_by = 'AI_PARAGUAY_VALIDATOR'
ORDER BY reviewed_at DESC
LIMIT 10;
```

## 🔧 Si Algo Sale Mal

### Error: "No se pudieron extraer los datos"
**Causa**: Imagen ilegible o API key inválida
**Solución**:
1. Verificar que la imagen sea clara y legible
2. Verificar que `ANTHROPIC_API_KEY` esté configurada
3. Ver logs en consola para más detalles

### Error: "El documento no es un Certificado de Antecedentes válido"
**Causa**: Claude detectó que la imagen no es un certificado oficial
**Solución**:
1. Ver la descripción del error (dice qué detectó Claude)
2. Pedir al usuario que suba el certificado correcto
3. Esto es esperado y correcto - protege contra uploads incorrectos

### El botón "Validar" no aparece
**Causa**: El conductor no tiene documentos de Cédula + Antecedentes en PENDING
**Solución**: El botón solo aparece si hay documentos pendientes

### Tarda mucho (más de 30 segundos)
**Causa**: La API de Claude puede estar lenta
**Solución**:
1. Esperar un poco más
2. Si falla, probar de nuevo
3. Verificar conexión a internet

## 🎯 Métricas de Éxito

Después de probar con 10-20 conductores, deberías ver:
- ✅ **80%+ aprobados automáticamente** si los documentos son válidos
- ❌ **10-15% rechazados automáticamente** por problemas reales (vencidos, antecedentes, etc.)
- ⚠️ **5-10% requieren revisión manual** por warnings no críticos

Si los números son muy diferentes, ajustaremos las reglas.

## 🔄 Activar Cron Job (Después de Probar)

Una vez que estés satisfecho con las validaciones manuales:

1. **Crear o actualizar `vercel.json`** en la raíz del proyecto:
```json
{
  "crons": [
    {
      "path": "/api/cron/validate-identity-documents",
      "schedule": "0 9-19 * * *"
    }
  ]
}
```

2. **Hacer commit y push**:
```bash
git add vercel.json
git commit -m "Activar cron job de validación de identidad (9am-7pm cada hora)"
git push
```

3. **Verificar en Vercel**:
- Ve a Settings → Cron Jobs
- Deberías ver el cron job listado
- Primera ejecución será en la próxima hora entre 9am-7pm

## 📞 Próximos Pasos

1. **Probar con 5-10 conductores reales** manualmente
2. **Revisar resultados** y ajustar si es necesario
3. **Capacitar al equipo** sobre cómo interpretar los resultados
4. **Activar cron job** cuando estés listo
5. **Monitorear** las primeras ejecuciones automáticas
6. **Iterar** basado en feedback del equipo

## ✅ Checklist de Testing

- [ ] Verificar que `ANTHROPIC_API_KEY` esté configurada
- [ ] Probar caso: Documentos válidos → APPROVED
- [ ] Probar caso: Nombre incompleto → APPROVED (gracias a flexibilidad)
- [ ] Probar caso: Cédula vencida → REJECTED
- [ ] Probar caso: CI no coincide → REJECTED
- [ ] Probar caso: Con antecedentes → REJECTED
- [ ] Probar caso: Imagen no es certificado → REJECTED
- [ ] Revisar metadata guardada en base de datos
- [ ] Confirmar que se crean notas de auditoría
- [ ] Verificar que mensajes automáticos de rechazo se envían (si ya está configurado)
