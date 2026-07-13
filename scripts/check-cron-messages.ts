// scripts/check-cron-messages.ts
// READ-ONLY: inspecciona los WhatsAppMessage recientes para verificar que los
// crons de capacitación están enviando bien. No escribe nada.
//   npx tsx scripts/check-cron-messages.ts [minutosVentana]

import { prisma } from '../lib/prisma'

const WINDOW_MIN = parseInt(process.argv[2] || '150', 10)
const NEW_CRON_STEPS = [
  'reengage_pendiente_agendar',
  'reengage_no_asistieron',
  'recordatorio_pre_sesion',
]

function mask(phone: string | null): string {
  if (!phone) return '—'
  const d = phone.replace(/\D/g, '')
  return d.length >= 3 ? `•••${d.slice(-3)}` : phone
}

async function main() {
  const since = new Date(Date.now() - WINDOW_MIN * 60 * 1000)
  console.log(`\n🔎 WhatsAppMessage desde ${since.toISOString()} (últimos ${WINDOW_MIN} min)\n`)

  const msgs = await prisma.whatsAppMessage.findMany({
    where: { createdAt: { gte: since } },
    select: {
      recipientName: true,
      recipientPhone: true,
      step: true,
      source: true,
      status: true,
      messageType: true,
      message: true,
      errorMessage: true,
      sentAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  if (msgs.length === 0) {
    console.log('  (sin mensajes en la ventana)\n')
    return
  }

  // Resumen por step + status
  const summary = new Map<string, number>()
  for (const m of msgs) {
    const key = `${m.source} | ${m.step ?? '(sin step)'} | ${m.status}`
    summary.set(key, (summary.get(key) ?? 0) + 1)
  }
  console.log('=== Resumen (source | step | status) ===')
  for (const [k, n] of [...summary.entries()].sort()) console.log(`  ${n.toString().padStart(3)}  ${k}`)

  // Detalle de los steps de los crons nuevos
  const nuevos = msgs.filter((m) => m.step && NEW_CRON_STEPS.includes(m.step))
  console.log(`\n=== Detalle crons nuevos (${nuevos.length}) ===`)
  if (nuevos.length === 0) console.log('  (todavía ninguno)')
  for (const m of nuevos) {
    const when = (m.sentAt ?? m.createdAt).toISOString().slice(11, 19)
    console.log(
      `  ${when}  ${m.status.padEnd(7)}  ${m.step}  →  ${(m.recipientName ?? '?').slice(0, 18).padEnd(18)} ${mask(m.recipientPhone)}`,
    )
    if (m.status === 'FAILED' && m.errorMessage) console.log(`         ⚠️  ${m.errorMessage}`)
  }

  // Cualquier FAILED en la ventana
  const failed = msgs.filter((m) => m.status === 'FAILED')
  if (failed.length > 0) {
    console.log(`\n=== FAILED en la ventana (${failed.length}) ===`)
    for (const m of failed.slice(0, 10)) {
      console.log(`  ${m.step ?? '?'} → ${mask(m.recipientPhone)}: ${m.errorMessage ?? '(sin detalle)'}`)
    }
  }

  // Muestra de contenido de un mensaje de cada step nuevo (para verificar render)
  console.log('\n=== Muestra de contenido por step nuevo ===')
  for (const step of NEW_CRON_STEPS) {
    const sample = nuevos.find((m) => m.step === step && m.status === 'SENT')
    if (sample) {
      console.log(`\n  [${step}]`)
      console.log('  ' + (sample.message ?? '').split('\n').join('\n  '))
    }
  }
  console.log('')
}

main()
  .catch((e) => {
    console.error('❌ Error consultando DB:', e instanceof Error ? e.message : e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
