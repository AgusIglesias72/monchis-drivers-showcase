// prisma/seed-templates.ts
// Script para inicializar las plantillas de WhatsApp

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const INITIAL_TEMPLATES = [
  {
    key: 'capacitaciones',
    name: 'Info sobre Capacitaciones',
    description: 'Información general sobre las capacitaciones disponibles',
    content: `Hola {name}! 👋

¿Cómo estás? Te escribo para contarte sobre nuestras capacitaciones.

📅 Tenemos eventos todos los días de la semana donde te explicamos todo lo que necesitas saber para trabajar con nosotros.

¿Te gustaría agendar una fecha? Estamos a tu disposición para cualquier consulta o duda que tengas.

¡Saludos! 😊`,
    category: 'capacitacion',
    order: 1,
  },
  {
    key: 'seguimiento_documentos',
    name: 'Seguimiento de Documentos',
    description: 'Mensaje para hacer seguimiento de documentos pendientes',
    content: `Hola {name}! 👋

Te escribo para hacer un seguimiento de tu postulación.

Veo que aún faltan algunos documentos por completar. ¿Hay algo en lo que pueda ayudarte?

Estoy aquí para resolver cualquier duda que tengas.

¡Saludos! 😊`,
    category: 'documentos',
    order: 2,
  },
  {
    key: 'bienvenida_completo',
    name: 'Bienvenida - Formulario Completo',
    description: 'Mensaje de bienvenida cuando el conductor completa el formulario',
    content: `¡Felicitaciones {name}! 🎉

Completaste exitosamente tu postulación. Ahora vamos a revisar tu información y documentos.

📋 Próximos pasos:
1. Revisión de documentos (24-48 hs)
2. Te contactaremos para agendar tu capacitación
3. Una vez capacitado, ¡podrás empezar a trabajar!

¿Tienes alguna pregunta? Estoy aquí para ayudarte.

¡Bienvenido al equipo! 💪`,
    category: 'general',
    order: 3,
  },
  {
    key: 'recordatorio_pago',
    name: 'Recordatorio de Pago',
    description: 'Recordatorio para completar el pago de equipamiento',
    content: `Hola {name}! 👋

Te escribo para recordarte que aún falta que completes el pago de equipamiento.

💳 Una vez que realices el pago, no olvides subir el comprobante en el formulario.

Si ya realizaste el pago y no pudiste cargar el comprobante, podés enviármelo por aquí.

¿Necesitas ayuda con algo?

¡Saludos! 😊`,
    category: 'pago',
    order: 4,
  },
  {
    key: 'consulta_general',
    name: 'Consulta General / Disponibilidad',
    description: 'Consulta sobre el interés del conductor en continuar',
    content: `Hola {name}! 👋

¿Cómo estás? Te escribo para saber si seguís interesado en trabajar con nosotros.

Veo que empezaste tu postulación pero quedó pendiente de completar.

Si tenés alguna duda o necesitás ayuda con algo, estoy aquí para ayudarte. 😊

¿Seguimos adelante?`,
    category: 'general',
    order: 5,
  },
  {
    key: 'info_zona_trabajo',
    name: 'Info sobre Zona de Trabajo',
    description: 'Información sobre las zonas de trabajo disponibles',
    content: `Hola {name}! 👋

Te escribo para contarte más sobre cómo funciona la zona de trabajo.

🗺️ Actualmente tenemos disponibilidad en varias zonas de Asunción y alrededores.
Una vez que completes tu capacitación, vos elegís en qué zona preferís trabajar según tu ubicación.

¿Te interesa alguna zona en particular? Puedo darte más información.

¡Saludos! 😊`,
    category: 'general',
    order: 6,
  },
]

async function main() {
  console.log('🌱 Iniciando seed de plantillas de WhatsApp...')

  for (const template of INITIAL_TEMPLATES) {
    const existing = await prisma.whatsAppTemplate.findUnique({
      where: { key: template.key },
    })

    if (existing) {
      console.log(`⚠️  Plantilla "${template.key}" ya existe, actualizando...`)
      await prisma.whatsAppTemplate.update({
        where: { key: template.key },
        data: {
          name: template.name,
          description: template.description,
          content: template.content,
          category: template.category,
          order: template.order,
        },
      })
    } else {
      console.log(`✅ Creando plantilla "${template.key}"...`)
      await prisma.whatsAppTemplate.create({
        data: template,
      })
    }
  }

  console.log('✨ Seed de plantillas completado!')
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
