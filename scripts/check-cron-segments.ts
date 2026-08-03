// scripts/check-cron-segments.ts
// READ-ONLY: estado de templates y tamaño de los segmentos de reenganche.
//   npx tsx scripts/check-cron-segments.ts

import { prisma } from '../lib/prisma'
import { hasCoreDocsApproved } from '../lib/services/onboarding-eligibility'

async function main() {
  const now = new Date()

  // 1. Templates que usan los crons
  const keys = ['capacitaciones', 'capacitacion_reminder', 'capacitacion_no_show', 'documents_pending', 'form_incomplete']
  const templates = await prisma.whatsAppTemplate.findMany({
    where: { key: { in: keys } },
    select: { key: true, isActive: true },
  })
  console.log('\n=== Templates ===')
  for (const k of keys) {
    const t = templates.find((x) => x.key === k)
    console.log(`  ${k.padEnd(22)} ${t ? (t.isActive ? '✅ activo' : '⚠️ INACTIVO') : '❌ NO EXISTE (se skipea)'}`)
  }

  // 2. Segmento "No Asistieron": attendance NO_SHOW, sin reserva activa, no COMPLETED
  const noShowAll = await prisma.formDriver.count({
    where: {
      status: 'COMPLETED',
      phoneNumber: { not: '' },
      NOT: { onboardingStatus: 'COMPLETED' },
      onboardingAttendances: {
        some: { status: 'NO_SHOW' },
        none: { status: { in: ['INVITED', 'CONFIRMED', 'SCHEDULED'] } },
      },
    },
  })
  const noShowEligibleNow = await prisma.formDriver.count({
    where: {
      status: 'COMPLETED',
      phoneNumber: { not: '' },
      NOT: { onboardingStatus: 'COMPLETED' },
      OR: [{ noContactBefore: null }, { noContactBefore: { lte: now } }],
      onboardingAttendances: {
        some: { status: 'NO_SHOW' },
        none: { status: { in: ['INVITED', 'CONFIRMED', 'SCHEDULED'] } },
      },
    },
  })
  console.log('\n=== Segmento "No Asistieron" ===')
  console.log(`  total en el segmento:        ${noShowAll}`)
  console.log(`  elegibles ahora (sin backoff): ${noShowEligibleNow}`)

  // 3. Segmento "Pendiente de Agendar": onboarding pendiente, sin reserva/no-show, core docs aprobados
  const pendingRaw = await prisma.formDriver.findMany({
    where: {
      status: 'COMPLETED',
      phoneNumber: { not: '' },
      AND: [
        { OR: [{ onboardingStatus: null }, { onboardingStatus: { in: ['NOT_READY', 'READY'] } }] },
      ],
      onboardingAttendances: {
        none: { status: { in: ['INVITED', 'CONFIRMED', 'SCHEDULED', 'NO_SHOW'] } },
      },
    },
    select: { noContactBefore: true, documents: { select: { documentType: true, status: true } } },
  })
  const pendingTotal = pendingRaw.filter((d) => hasCoreDocsApproved(d.documents)).length
  const pendingEligibleNow = pendingRaw.filter(
    (d) => hasCoreDocsApproved(d.documents) && (!d.noContactBefore || d.noContactBefore <= now),
  ).length
  console.log('\n=== Segmento "Pendiente de Agendar" ===')
  console.log(`  total en el segmento:        ${pendingTotal}`)
  console.log(`  elegibles ahora (sin backoff): ${pendingEligibleNow}`)
  console.log('')
}

main()
  .catch((e) => {
    console.error('❌ Error:', e instanceof Error ? e.message : e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
