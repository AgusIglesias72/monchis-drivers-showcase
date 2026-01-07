# Sistema de Plantillas de WhatsApp

## 📋 Descripción

Sistema para gestionar plantillas de mensajes de WhatsApp desde la base de datos, permitiendo al equipo de ejecución crear, editar y gestionar sus propias plantillas sin necesidad de tocar código.

## 🎯 Beneficios

- ✅ **Configurables**: El equipo puede editar plantillas sin deployar código
- ✅ **Dinámicas**: Se cargan desde la BD en tiempo real
- ✅ **Estadísticas**: Contador de uso y última vez utilizada
- ✅ **Organizadas**: Por categoría y orden personalizable
- ✅ **Auditadas**: Registro de quién creó/modificó cada plantilla
- ✅ **Placeholders**: Soporte para variables como `{name}`

## 🗄️ Modelo de Datos

```prisma
model WhatsAppTemplate {
  id          String   @id @default(cuid())
  key         String   @unique          // capacitaciones, seguimiento_documentos
  name        String                    // "Info sobre Capacitaciones"
  description String?                   // Descripción de cuándo usar
  content     String                    // Mensaje con placeholders
  isActive    Boolean  @default(true)
  order       Int      @default(0)
  category    String?                   // general, documentos, pago
  usageCount  Int      @default(0)
  lastUsedAt  DateTime?

  createdBy   String?
  updatedBy   String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

## 🚀 Uso Rápido

### 1. Cargar plantillas iniciales

```bash
# Ejecutar seed (crea/actualiza las 6 plantillas por defecto)
npx tsx prisma/seed-templates.ts
```

### 2. Usar en el código

```typescript
import { getActiveTemplates, replaceTemplatePlaceholders } from '@/lib/services/whatsapp-templates.service'

// Obtener todas las plantillas activas
const templates = await getActiveTemplates()

// Usar una plantilla
const template = templates.find(t => t.key === 'capacitaciones')
const message = replaceTemplatePlaceholders(template.content, {
  name: 'Juan'
})

// Enviar mensaje registrando el uso
await sendQuickWhatsAppMessage({
  driverId: '...',
  driverName: 'Juan Pérez',
  phoneNumber: '+595981234567',
  message: message,
  templateId: template.id  // ✅ Registra el uso
})
```

## 📝 Plantillas Iniciales

Las siguientes plantillas se crean automáticamente:

| Key | Nombre | Categoría |
|-----|--------|-----------|
| `capacitaciones` | Info sobre Capacitaciones | capacitacion |
| `seguimiento_documentos` | Seguimiento de Documentos | documentos |
| `bienvenida_completo` | Bienvenida - Formulario Completo | general |
| `recordatorio_pago` | Recordatorio de Pago | pago |
| `consulta_general` | Consulta General / Disponibilidad | general |
| `info_zona_trabajo` | Info sobre Zona de Trabajo | general |

## 🎨 Placeholders Disponibles

Actualmente soporta:

- `{name}` - Nombre del conductor (primer nombre)

**Futuro**: Podrías agregar `{phone}`, `{fecha}`, `{zona}`, etc.

## 📊 Estadísticas

Cada vez que se usa una plantilla:

- ✅ Se incrementa `usageCount`
- ✅ Se actualiza `lastUsedAt`
- ✅ Se guarda `templateId` en metadata del mensaje

Esto permite:
- Ver qué plantillas son más populares
- Identificar plantillas sin uso
- Analizar patrones de comunicación

## 🔄 Próximos Pasos

### Fase 1: UI de Gestión ✅ HECHO
- [x] Modelo en BD
- [x] Servicio de plantillas
- [x] Script de seed
- [x] Integración con envío de mensajes

### Fase 2: Admin UI (Pendiente)
- [ ] Página `/admin/plantillas-whatsapp`
- [ ] Tabla con todas las plantillas
- [ ] Formulario para crear/editar
- [ ] Preview del mensaje con placeholders
- [ ] Estadísticas de uso

### Fase 3: ContactButton Dinámico (Pendiente)
- [ ] Modificar ContactButton para cargar plantillas de BD
- [ ] Remover constante MESSAGE_TEMPLATES hardcodeada
- [ ] Usar `getTemplatesForUI()` action

### Fase 4: Mejoras (Futuro)
- [ ] Versionamiento de plantillas
- [ ] Plantillas compartidas vs personales
- [ ] Más placeholders: `{phone}`, `{zona}`, etc.
- [ ] Preview en tiempo real con datos de prueba
- [ ] Importar/exportar plantillas
- [ ] Categorías personalizadas

## 📖 API Reference

### Servicio: `whatsapp-templates.service.ts`

#### `getActiveTemplates()`
Obtiene todas las plantillas activas ordenadas por `order`.

```typescript
const templates = await getActiveTemplates()
// Returns: WhatsAppTemplate[]
```

#### `getTemplateByKey(key: string)`
Obtiene una plantilla específica por su key.

```typescript
const template = await getTemplateByKey('capacitaciones')
```

#### `incrementTemplateUsage(templateId: string)`
Incrementa el contador de uso (llamado automáticamente al enviar).

```typescript
await incrementTemplateUsage(template.id)
```

#### `replaceTemplatePlaceholders(content: string, data: object)`
Reemplaza placeholders en el contenido.

```typescript
const message = replaceTemplatePlaceholders(template.content, {
  name: 'Juan'
})
```

### Actions: `whatsapp-templates.actions.ts`

#### `getTemplatesForUI()`
Action server para obtener plantillas en componentes cliente.

```typescript
const { success, templates } = await getTemplatesForUI()
```

## 🔒 Seguridad

- ✅ Solo admins pueden crear/editar plantillas (a implementar en UI)
- ✅ Auditoría completa: `createdBy`, `updatedBy`
- ✅ Soft delete: usar `isActive: false` en lugar de borrar
- ✅ Validación de placeholders antes de enviar

## 💡 Consejos

1. **Keys únicas**: Usa keys descriptivas y en snake_case
2. **Orden lógico**: Ordena plantillas por frecuencia de uso
3. **Categorías claras**: Agrupa plantillas similares
4. **Descripciones útiles**: Explica cuándo usar cada plantilla
5. **Testing**: Prueba placeholders antes de usar en producción

## 🐛 Troubleshooting

### Las plantillas no aparecen
```bash
# Verifica si existen en BD
npx prisma studio
# Busca tabla whatsapp_templates

# O ejecuta seed de nuevo
npx tsx prisma/seed-templates.ts
```

### Placeholders no se reemplazan
```typescript
// Asegúrate de usar llaves, no paréntesis
// ✅ Correcto: {name}
// ❌ Incorrecto: (name), {Name}, ${name}
```

### Contador de uso no aumenta
```typescript
// Verifica que pasas templateId
await sendQuickWhatsAppMessage({
  ...,
  templateId: template.id  // ✅ Importante
})
```

