// prisma/seed-templates.ts
// Seed de plantillas WhatsApp. Las `key`s deben matchear con las que el código
// del Next.js consume (ver lib/constants/whatsapp-template-keys.ts).
//
// Set consolidado: 5 plantillas para los momentos clave del funnel.
// Tono: cercano, voseo paraguayo, sin emojis. Variables: {nombre}, {fullname}, etc.
//
// Comportamiento:
//   - Por defecto: SKIP si la key ya existe (no pisa lo que edites en la UI).
//   - Con SEED_FORCE=true: ACTUALIZA el contenido de las existentes.
//       SEED_FORCE=true npx tsx prisma/seed-templates.ts

import { prisma } from '../lib/prisma'

const INITIAL_TEMPLATES = [
  {
    key: 'form_completed',
    name: 'Postulación completada',
    description: 'Confirmación post-form. Se dispara desde /api/form/complete.',
    content: `¡Felicitaciones, {nombre}!

Ya recibimos tu postulación para sumarte como repartidor de Monchis.

Qué sigue:
1. Revisamos tus documentos (24-48 hs)
2. Te avisamos por acá para agendar tu capacitación
3. Capacitás y arrancás a repartir

Cualquier duda, escribinos por acá. ¡Bienvenido al equipo!`,
    category: 'general',
    order: 1,
  },
  {
    key: 'capacitaciones',
    name: 'Postulación aprobada - agendar capacitación',
    description:
      'Se dispara al aprobar todos los documentos. Incluye link de autoagendamiento + identificación.',
    content: `¡Buenas, {nombre}!

Tu postulación ya está aprobada. Ahora elegí el día de tu capacitación así arrancás a repartir con Monchis.

Entrá a: https://monchisdrivers.com/capacitaciones

Para reservar, identificate con tu cédula y los últimos 4 dígitos del teléfono que usaste al postularte. Elegís el día que mejor te queda y listo.

Cualquier duda respondé este mensaje.`,
    category: 'capacitacion',
    order: 2,
  },
  {
    key: 'form_incomplete',
    name: 'Form incompleto (recordatorio)',
    description:
      'Cron. Postulante que empezó el form y lo dejó a medias (cualquier step) o seguimiento genérico.',
    content: `Hola {nombre}, ¿cómo andás?

Vimos que empezaste tu postulación para Monchis pero te quedó a medias. ¿Seguís interesado en sumarte?

Es rápido terminarla. Si querés retomarla o tenés alguna duda, escribinos por acá y te damos una mano.`,
    category: 'recordatorio',
    order: 3,
  },
  {
    key: 'documents_pending',
    name: 'Pasos pendientes post-form (documentos / pago)',
    description:
      'Cron. Postulante que completó el form pero le faltan pasos: subir/corregir documentos o el pago de equipamiento.',
    content: `Hola {nombre},

Estamos revisando tu postulación y te faltan algunos pasos para terminar (puede ser documentación por subir o corregir, o el pago del equipamiento).

Entrá al portal para ver el detalle y completarlo. Si tenés alguna duda, escribinos por acá.`,
    category: 'documentos',
    order: 4,
  },
  {
    key: 'capacitacion_reminder',
    name: 'Recordatorio de capacitación agendada',
    description: 'Cron. Recordatorio para postulantes con capacitación próxima.',
    content: `Hola {nombre},

Te recordamos que tenés tu capacitación de Monchis agendada.

Confirmanos tu asistencia respondiendo este mensaje. ¡Te esperamos!`,
    category: 'capacitacion',
    order: 5,
  },
  {
    key: 'capacitacion_no_show',
    name: 'No asistió a la capacitación - reagendar',
    description:
      'Se dispara al marcar no-show. Invita al postulante a volver a elegir un día.',
    content: `Hola {nombre},

Vimos que no pudiste venir a tu capacitación de Monchis. ¡No pasa nada!

Podés elegir un nuevo día acá: https://monchisdrivers.com/capacitaciones

Te identificás con tu cédula y los últimos 4 dígitos de tu teléfono, y reservás el día que mejor te quede. Cualquier duda, respondé este mensaje.`,
    category: 'capacitacion',
    order: 6,
  },
]

// Keys que ya no usamos — se borran de la DB al correr con SEED_FORCE para
// dejar el set limpio en 5.
const DEPRECATED_KEYS = [
  'form_step_1',
  'form_step_2',
  'form_step_3',
  'form_step_4',
  'documents_corrections',
  'payment_pending',
  'general_followup',
  'schedule_capacitacion',
  // Keys legacy del seed viejo (por si quedaron en alguna DB):
  'seguimiento_documentos',
  'bienvenida_completo',
  'recordatorio_pago',
  'consulta_general',
  'info_zona_trabajo',
]

const FORCE = process.env.SEED_FORCE === 'true'

async function main() {
  console.log(`🌱 Seed de plantillas WhatsApp${FORCE ? ' (FORCE)' : ''}...`)

  let created = 0
  let updated = 0
  let skipped = 0

  for (const template of INITIAL_TEMPLATES) {
    const existing = await prisma.whatsAppTemplate.findUnique({
      where: { key: template.key },
    })

    if (existing) {
      if (!FORCE) {
        console.log(`⏭️  "${template.key}" ya existe — skip`)
        skipped++
        continue
      }
      await prisma.whatsAppTemplate.update({
        where: { key: template.key },
        data: {
          name: template.name,
          description: template.description,
          content: template.content,
          category: template.category,
          order: template.order,
          isActive: true,
        },
      })
      console.log(`♻️  "${template.key}" actualizada`)
      updated++
      continue
    }

    await prisma.whatsAppTemplate.create({ data: template })
    console.log(`✅ "${template.key}" creada`)
    created++
  }

  // Limpieza de keys deprecadas (solo con FORCE para no borrar sin querer).
  let deleted = 0
  if (FORCE) {
    const res = await prisma.whatsAppTemplate.deleteMany({
      where: { key: { in: DEPRECATED_KEYS } },
    })
    deleted = res.count
    if (deleted > 0) console.log(`🗑️  ${deleted} plantillas deprecadas eliminadas`)
  }

  console.log(
    `\n✨ Seed completado: ${created} creadas, ${updated} actualizadas, ${skipped} saltadas, ${deleted} borradas.`,
  )
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
