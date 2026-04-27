// scripts/test-emails.ts
//
// Envía un mail de ejemplo de cada tipo configurado en emailService.
// No consulta la DB — usa datos fake para mostrar el aspecto de cada template.
//
// Uso:
//   tsx scripts/test-emails.ts
//   tsx scripts/test-emails.ts --only=daily   (solo reporte diario)

import 'dotenv/config'
import { emailService } from '@/lib/services/email.service'

const onlyArg = process.argv.find((a) => a.startsWith('--only='))?.split('=')[1]

async function sendProcessCompleted() {
  console.log('→ Enviando "Proceso completado"...')
  await emailService.sendProcessCompletedEmail({
    startDate: '2026-04-15',
    endDate: '2026-04-22',
    reportsStats: {
      totalRows: 1247,
      dataRows: 1198,
      processedRanges: 4,
    },
    driversStats: {
      successful: 42,
      failed: 3,
      total: 45,
      errors: [
        { driver: 'Juan Carlos Pérez (CI: 1234567)', error: 'Timeout al consultar API' },
        { driver: 'María Elena González (CI: 7654321)', error: 'Cuenta ueno no encontrada' },
        { driver: 'Pedro Silva Martínez (CI: 9876543)', error: 'Validación fallida: RUC inactivo' },
      ],
    },
    spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1example',
  })
}

async function sendProcessFailed() {
  console.log('→ Enviando "Proceso fallido"...')
  await emailService.sendProcessFailedEmail({
    startDate: '2026-04-15',
    endDate: '2026-04-22',
    error:
      'ECONNREFUSED: No se pudo conectar a la API de Google Sheets. Detalle: Request failed after 3 retries. Stack: at SheetsService.fetchRange (/app/lib/google-sheets.ts:142)',
  })
}

async function sendBonusExecuted() {
  console.log('→ Enviando "Bonos procesados (EXECUTE)"...')
  await emailService.sendBonusProcessCompletedEmail({
    bonusDate: '2026-04-22',
    executionMode: 'EXECUTE',
    stats: {
      totalOrders: 847,
      driversProcessed: 63,
      extrasCreated: 58,
      assignmentsSuccessful: 58,
      assignmentsFailed: 0,
      totalPayoutAmount: 12_450_000,
    },
  })
}

async function sendBonusDryRun() {
  console.log('→ Enviando "Bonos (DRY RUN con errores)"...')
  await emailService.sendBonusProcessCompletedEmail({
    bonusDate: '2026-04-22',
    executionMode: 'DRY_RUN',
    stats: {
      totalOrders: 847,
      driversProcessed: 63,
      extrasCreated: 58,
      assignmentsSuccessful: 56,
      assignmentsFailed: 2,
      totalPayoutAmount: 12_450_000,
    },
    errors: [
      { driver: 'Juan Pérez (CI: 1234567)', error: 'No se encontró cuenta ueno activa' },
      { driver: 'Carlos Méndez (CI: 2345678)', error: 'Driver no existe en sistema de pedidos' },
    ],
  })
}

async function sendDailyReport() {
  console.log('→ Enviando "Reporte diario de postulaciones"...')
  await emailService.sendDailyPostulacionesReport({
    data: {
      reportDate: new Date('2026-04-22T12:00:00-03:00'),
      periodStart: new Date('2026-04-22T03:00:00Z'),
      periodEnd: new Date('2026-04-23T02:59:59Z'),

      newPostulaciones: 14,
      completedToday: 8,
      approvedToday: 3,
      readyForOnboarding: 2,

      statusBreakdown: {
        IN_PROGRESS: 23,
        COMPLETED: 45,
        ABANDONED: 12,
        SUBMITTED: 8,
        UNDER_REVIEW: 14,
        DOCS_PENDING: 9,
        APPROVED: 6,
        READY_ONBOARDING: 4,
        ONBOARDING: 7,
        ACTIVE: 127,
        REJECTED: 11,
      },

      monthNewPostulaciones: 178,
      monthApproved: 32,
      monthActive: 127,

      newPostulacionesList: [
        {
          id: 'cla1example',
          fullName: 'Juan Carlos Pérez González',
          phoneNumber: '0981 234 567',
          status: 'IN_PROGRESS',
          createdAt: new Date('2026-04-22T14:32:00-03:00'),
          adminUrl: 'https://www.monchisdrivers.com/admin/postulaciones/cla1example',
        },
        {
          id: 'cla2example',
          fullName: 'María Elena González Rodríguez',
          phoneNumber: '0982 345 678',
          status: 'SUBMITTED',
          createdAt: new Date('2026-04-22T11:15:00-03:00'),
          adminUrl: 'https://www.monchisdrivers.com/admin/postulaciones/cla2example',
        },
        {
          id: 'cla3example',
          fullName: 'Pedro Silva Martínez',
          phoneNumber: '0983 456 789',
          status: 'IN_PROGRESS',
          createdAt: new Date('2026-04-22T09:48:00-03:00'),
          adminUrl: 'https://www.monchisdrivers.com/admin/postulaciones/cla3example',
        },
        {
          id: 'cla4example',
          fullName: 'Ana Beatriz Torres',
          phoneNumber: '0984 567 890',
          status: 'COMPLETED',
          createdAt: new Date('2026-04-22T08:22:00-03:00'),
          adminUrl: 'https://www.monchisdrivers.com/admin/postulaciones/cla4example',
        },
        {
          id: 'cla5example',
          fullName: 'Roberto Benítez Villalba',
          phoneNumber: '0985 678 901',
          status: 'UNDER_REVIEW',
          createdAt: new Date('2026-04-22T07:10:00-03:00'),
          adminUrl: 'https://www.monchisdrivers.com/admin/postulaciones/cla5example',
        },
      ],
    },
  })
}

async function main() {
  const tasks: Record<string, () => Promise<void>> = {
    'process-completed': sendProcessCompleted,
    'process-failed': sendProcessFailed,
    'bonus-executed': sendBonusExecuted,
    'bonus-dryrun': sendBonusDryRun,
    'daily': sendDailyReport,
  }

  const toRun = onlyArg ? [onlyArg] : Object.keys(tasks)

  for (const key of toRun) {
    const fn = tasks[key]
    if (!fn) {
      console.error(`❌ Tarea desconocida: "${key}". Opciones: ${Object.keys(tasks).join(', ')}`)
      process.exit(1)
    }
    await fn()
    await new Promise((r) => setTimeout(r, 300)) // pequeño delay para no saturar
  }

  console.log('\n✅ Todos los mails de prueba fueron enviados.')
}

main()
  .catch((err) => {
    console.error('❌ Error:', err)
    process.exit(1)
  })
  .finally(() => process.exit(0))
