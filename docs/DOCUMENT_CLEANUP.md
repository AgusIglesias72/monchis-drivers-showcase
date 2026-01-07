# Sistema de Limpieza de Documentos Duplicados

## 📋 Descripción

Sistema automático para limpiar documentos duplicados que los usuarios cargan múltiples veces con el mismo nombre de archivo.

## 🎯 Reglas de Limpieza

Para cada postulante, agrupa los documentos por `fileName` y aplica estas reglas:

1. **Mantiene TODOS los documentos APPROVED** (sin importar duplicados)
2. **Del resto (PENDING/REJECTED/IN_REVIEW)**: Mantiene solo el más reciente
3. **Elimina** los documentos duplicados más antiguos

### Ejemplo Real

```
Juan tiene estos documentos con fileName "cedula_frente.jpg":
├─ cedula_frente.jpg (APPROVED)   ✅ MANTENER - subido hace 2 días
├─ cedula_frente.jpg (PENDING)    ✅ MANTENER - subido hace 1 hora (más reciente)
├─ cedula_frente.jpg (REJECTED)   ❌ ELIMINAR - subido hace 5 días
└─ cedula_frente.jpg (PENDING)    ❌ ELIMINAR - subido hace 3 días (hay uno más reciente)

Resultado: Mantiene 2, elimina 2
```

## 🔒 Seguridad

El sistema incluye múltiples capas de seguridad:

1. **Dry-run por defecto**: Solo simula, no elimina realmente
2. **Límite de eliminaciones**: Máximo 100 documentos por ejecución
3. **Logs detallados**: Registra todo lo que hace
4. **Autenticación**: Requiere CRON_SECRET en producción

## 🚀 Uso

### 1. Probar con Simulación (Recomendado primero)

```bash
# Simula la limpieza sin eliminar nada
curl https://tu-app.vercel.app/api/cron/cleanup-duplicate-documents

# O con el secret configurado
curl -H "Authorization: Bearer tu-cron-secret" \
  https://tu-app.vercel.app/api/cron/cleanup-duplicate-documents
```

**Respuesta ejemplo:**
```json
{
  "success": true,
  "dryRun": true,
  "totalDocumentsAnalyzed": 450,
  "duplicatesFound": 23,
  "documentsDeleted": 23,
  "documentsKept": 427,
  "details": [
    {
      "driverId": "clx123abc",
      "driverName": "Juan Pérez",
      "fileName": "cedula_frente.jpg",
      "duplicatesFound": 2,
      "kept": [
        {
          "id": "doc1",
          "status": "APPROVED",
          "uploadedAt": "2025-01-05T10:00:00.000Z"
        },
        {
          "id": "doc2",
          "status": "PENDING",
          "uploadedAt": "2025-01-07T14:30:00.000Z"
        }
      ],
      "deleted": [
        {
          "id": "doc3",
          "status": "REJECTED",
          "uploadedAt": "2025-01-02T08:00:00.000Z"
        }
      ]
    }
  ],
  "message": "✅ Simulación completada. Usa ?dryRun=false para eliminar realmente."
}
```

### 2. Probar con Drivers Específicos

```bash
# Simular solo para algunos drivers
curl "https://tu-app.vercel.app/api/cron/cleanup-duplicate-documents?driverIds=clx123,clx456"
```

### 3. Ejecutar Limpieza Real

**⚠️ ADVERTENCIA: Esto eliminará documentos permanentemente**

```bash
# Ejecutar eliminación real
curl "https://tu-app.vercel.app/api/cron/cleanup-duplicate-documents?dryRun=false"

# Con límite personalizado
curl "https://tu-app.vercel.app/api/cron/cleanup-duplicate-documents?dryRun=false&maxDeletes=50"
```

## ⏰ Cron Automático

### Configuración Actual

El cron está configurado en `vercel.json`:

```json
{
  "path": "/api/cron/cleanup-duplicate-documents?dryRun=true",
  "schedule": "0 3 * * *"
}
```

- **Frecuencia**: Diariamente a las 3:00 AM (hora del servidor)
- **Modo**: `dryRun=true` (solo reporta, no elimina)

### Activar Eliminación Automática

Cuando estés seguro de que funciona correctamente:

1. Cambia `dryRun=true` a `dryRun=false` en `vercel.json`
2. Haz commit y push
3. Vercel desplegará automáticamente

```json
{
  "path": "/api/cron/cleanup-duplicate-documents?dryRun=false",
  "schedule": "0 3 * * *"
}
```

## 📊 Monitoreo

### Ver Logs en Vercel

1. Ve a tu proyecto en Vercel Dashboard
2. Click en "Logs"
3. Filtra por "cleanup-duplicate-documents"

### Logs a Buscar

```
[DOCUMENT CLEANUP] Analizando 150 drivers...
[DOCUMENT CLEANUP] Driver Juan Pérez: encontrados 3 documentos con nombre "cedula.jpg"
[DOCUMENT CLEANUP] [DRY-RUN] Se eliminarían 2 documentos duplicados...
[DOCUMENT CLEANUP] Resumen:
  - Modo: DRY-RUN (simulación)
  - Documentos analizados: 450
  - Duplicados encontrados: 23
  - Documentos eliminados: 23
  - Documentos mantenidos: 427
```

## 🔧 Parámetros de URL

| Parámetro | Valores | Por defecto | Descripción |
|-----------|---------|-------------|-------------|
| `dryRun` | `true` / `false` | `true` | Si es true, solo simula |
| `maxDeletes` | número | `100` | Máximo de documentos a eliminar |
| `driverIds` | `id1,id2,id3` | todos | Limitar a drivers específicos |

## 🛡️ Variables de Entorno

```env
# Opcional: Secret para autenticar requests al cron
CRON_SECRET=tu-secret-super-seguro
```

Si defines `CRON_SECRET`, todos los requests deberán incluir:
```
Authorization: Bearer tu-secret-super-seguro
```

## 🧪 Testing Recomendado

### Fase 1: Simulación Global
```bash
# Ver qué pasaría sin eliminar nada
curl "https://tu-app.vercel.app/api/cron/cleanup-duplicate-documents"
```

### Fase 2: Simulación de 1 Driver
```bash
# Elegir un driver con duplicados obvios
curl "https://tu-app.vercel.app/api/cron/cleanup-duplicate-documents?driverIds=clx123abc"
```

### Fase 3: Eliminar 1 Driver
```bash
# Eliminar realmente solo ese driver
curl "https://tu-app.vercel.app/api/cron/cleanup-duplicate-documents?dryRun=false&driverIds=clx123abc"
```

### Fase 4: Verificar en Admin
- Revisar en `/admin/postulaciones/[id]` que los documentos correctos fueron eliminados
- Verificar que los APPROVED siguen ahí
- Verificar que el más reciente de los PENDING sigue ahí

### Fase 5: Limpieza Global
```bash
# Si todo está OK, limpiar todo
curl "https://tu-app.vercel.app/api/cron/cleanup-duplicate-documents?dryRun=false"
```

### Fase 6: Activar Cron Automático
- Cambiar `dryRun=true` a `false` en `vercel.json`
- Commit y push

## ❓ FAQ

### ¿Puedo recuperar documentos eliminados?
No, la eliminación es permanente. Por eso recomendamos probar exhaustivamente con `dryRun=true` primero.

### ¿Qué pasa si un usuario tiene 5 versiones del mismo archivo aprobadas?
Todas se mantienen. El sistema nunca elimina documentos APPROVED.

### ¿Qué pasa si hay un error durante la ejecución?
- Se registra en `errors` del response
- Se detiene la limpieza para ese driver
- Continúa con los demás drivers
- No se alcanzan los límites de seguridad

### ¿Cómo desactivo el cron automático?
Elimina o comenta la entrada del cron en `vercel.json` y haz push.

## 📞 Soporte

Si algo sale mal o tienes dudas:
1. Revisa los logs en Vercel Dashboard
2. Ejecuta con `dryRun=true` para ver qué haría
3. Usa `driverIds` para probar con casos específicos
