// scripts/review-cron-run.ts
// READ-ONLY: revisión integral del comportamiento de los crons de mensajería en
// producción tras el deploy. No escribe nada.
//   npx tsx scripts/review-cron-run.ts [minutosVentana]

import { prisma } from '../lib/prisma'
import { hasCoreDocsApproved } from '../lib/services/onboarding-eligibility'

const WINDOW_MIN = parseInt(process.argv[2] || '240', 10)

function mask(p: string | null) {
  if (!p) return '—'
  const d = p.replace(/\D/g, '')
  return d.length >= 3 ? `•••${d.slice(-3)}` : p
}

async function main() {
  const now = new Date()
  const since = new Date(now.getTime() - WINDOW_MIN * 60 * 1000)
  console.log(`\n========= REVISIÓN CRONS — ventana ${WINDOW_MIN}min (desde ${since.toISOString()}) =========`)

  // 1) Todos los mensajes de la ventana
  const msgs = await prisma.whatsAppMessage.findMany({
    where: { createdAt: { gte: since } },
    select: {
      formDriverId: true, recipientName: true, recipientPhone: true,
      step: true, source: true, status: true, messageType: true,
      errorMessage: true, sentAt: true, createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  })
  const by = new Map<string, number>()
  for (const m of msgs) {
    const k = `${m.source} | ${m.step ?? '—'} | ${m.status}`
    by.set(k, (by.get(k) ?? 0) + 1)
  }
  console.log('\n[1] Resumen (source | step | status)')
  for (const [k, n] of [...by.entries()].sort()) console.log(`   ${String(n).padStart(3)}  ${k}`)
  console.log(`   TOTAL: ${msgs.length}`)

  // 2) Fallos
  const failed = msgs.filter((m) => m.status === 'FAILED')
  console.log(`\n[2] FAILED: ${failed.length}`)
  for (const m of failed.slice(0, 15)) console.log(`   ${m.step ?? '?'} → ${mask(m.recipientPhone)}: ${m.errorMessage ?? '(sin detalle)'}`)

  // 3) Duplicados: mismo formDriver con >1 mensaje en la ventana
  const perDriver = new Map<string, typeof msgs>()
  for (const m of msgs) {
    if (!m.formDriverId) continue
    const arr = perDriver.get(m.formDriverId) ?? []
    arr.push(m)
    perDriver.set(m.formDriverId, arr)
  }
  const dups = [...perDriver.entries()].filter(([, a]) => a.length > 1)
  console.log(`\n[3] Drivers con >1 mensaje en la ventana: ${dups.length}`)
  for (const [, a] of dups.slice(0, 10)) {
    console.log(`   ${a[0].recipientName ?? '?'} (${mask(a[0].recipientPhone)}): ${a.map((x) => x.step).join(', ')}`)
  }

  // 4) Validación del segmento "Pendiente de Agendar": ¿los enviados eran correctos? ¿backoff aplicado?
  const pendingMsgs = msgs.filter((m) => m.step === 'reengage_pendiente_agendar' && m.formDriverId)
  console.log(`\n[4] Validación 'Pendiente de Agendar' enviados (${pendingMsgs.length})`)
  for (const m of pendingMsgs) {
    const d = await prisma.formDriver.findUnique({
      where: { id: m.formDriverId! },
      select: {
        status: true, onboardingStatus: true, documentsStatus: true,
        messagesSentCount: true, noContactBefore: true,
        documents: { select: { documentType: true, status: true } },
        onboardingAttendances: { select: { status: true } },
      },
    })
    if (!d) { console.log(`   ${mask(m.recipientPhone)}: driver no encontrado`); continue }
    const core = hasCoreDocsApproved(d.documents)
    const activos = d.onboardingAttendances.filter((a) => ['INVITED', 'CONFIRMED', 'SCHEDULED', 'NO_SHOW'].includes(a.status)).length
    const ok = d.status === 'COMPLETED' && core && activos === 0 &&
      (d.onboardingStatus === null || ['NOT_READY', 'READY'].includes(d.onboardingStatus))
    const backoff = d.noContactBefore && d.noContactBefore > now ? `backoff→${d.noContactBefore.toISOString().slice(5, 16)}` : 'SIN backoff(!)'
    console.log(`   ${ok ? '✓' : '✗'} ${(m.recipientName ?? '?').slice(0, 16).padEnd(16)} status=${d.status} onb=${d.onboardingStatus ?? 'null'} core=${core} activos=${activos} msgs=${d.messagesSentCount} ${backoff}`)
  }

  // 5) Sesión: ¿por qué 0? eventos SCHEDULED próximos (72h) con asistentes activos y reminder pendiente
  const horizon = new Date(now.getTime() + 72 * 3600 * 1000)
  const ev = await prisma.onboardingEvent.findMany({
    where: { status: 'SCHEDULED', scheduledDate: { gt: now, lte: horizon } },
    select: {
      scheduledDate: true, reminderHoursBefore: true, reminderScheduled: true,
      attendees: { where: { status: { in: ['INVITED', 'CONFIRMED', 'SCHEDULED'] } }, select: { reminderSent: true } },
    },
    orderBy: { scheduledDate: 'asc' },
  })
  console.log(`\n[5] Eventos SCHEDULED próximos 72h: ${ev.length}`)
  for (const e of ev) {
    const activos = e.attendees.length
    const pend = e.attendees.filter((a) => !a.reminderSent).length
    const dueAt = new Date(e.scheduledDate.getTime() - e.reminderHoursBefore * 3600 * 1000)
    console.log(`   ${e.scheduledDate.toISOString().slice(5, 16)}  asistentes_activos=${activos} sin_recordar=${pend} ventana_recordatorio_abre=${dueAt.toISOString().slice(5, 16)} reminderScheduled=${e.reminderScheduled}`)
  }

  // 6) Impacto del bypass: de los documents_pending recientes, ¿cuántos YA tenían core docs aprobados?
  //    (esos NO recibirían el mensaje con el código nuevo — demuestra el bug que arregla el bypass)
  const docMsgs = msgs.filter((m) => m.step && m.step.includes('document'))
  let bypassWouldSkip = 0
  for (const m of docMsgs) {
    if (!m.formDriverId) continue
    const d = await prisma.formDriver.findUnique({
      where: { id: m.formDriverId },
      select: { documents: { select: { documentType: true, status: true } } },
    })
    if (d && hasCoreDocsApproved(d.documents)) bypassWouldSkip++
  }
  console.log(`\n[6] documents_pending en la ventana: ${docMsgs.length}; de esos, con core docs aprobados (el bypass nuevo los saltearía): ${bypassWouldSkip}`)

  console.log('\n========= FIN =========\n')
}

main()
  .catch((e) => { console.error('❌', e instanceof Error ? e.message : e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
