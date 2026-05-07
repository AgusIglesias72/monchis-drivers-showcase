// scripts/audit-manychat-approval-chain.ts
//
// Audit del happy path: postulante aprobado → ManyChat dispara flow `capacitaciones`.
//
// Mira los últimos N drivers con `finalApprovedAt` seteado y verifica que la
// cadena completa se ejecutó sin huecos:
//   1. Existe `manychatSubscriberId` (el lookup/creación funcionó)
//   2. Existe `manychatApprovalSentAt` (el lock de idempotencia se activó)
//   3. Existe un WhatsAppMessage con botId='manychat' y step='postulacion_aprobada'
//      (la auditoría se persistió)
//
// Reporta drivers con la cadena rota y los identifica para Vincular manual.
//
// Uso:
//   npx tsx --env-file=.env scripts/audit-manychat-approval-chain.ts [days=14]

import { prisma } from '../lib/prisma'

const DAYS_BACK = parseInt(process.argv[2] || '14', 10)

type Issue = 'no_subscriber' | 'no_approval_lock' | 'no_audit_message' | 'phone_format'

interface DriverFinding {
  id: string
  name: string
  phone: string
  finalApprovedAt: Date
  manychatSubscriberId: string | null
  manychatApprovalSentAt: Date | null
  approvalAuditCount: number
  issues: Issue[]
}

function detectPhoneIssue(phone: string): boolean {
  const digits = phone.replace(/\D/g, '')
  if (!digits) return true
  if (digits.startsWith('595')) return false
  if (digits.startsWith('54') && digits.length >= 12) return false
  if (digits.startsWith('0') && digits.length === 10) return false
  if (digits.length === 9) return false
  if (digits.length >= 12) return false
  return true
}

async function main() {
  const since = new Date(Date.now() - DAYS_BACK * 24 * 60 * 60 * 1000)
  console.log(`\n=== Audit ManyChat approval chain — últimos ${DAYS_BACK} días ===\n`)

  const drivers = await prisma.formDriver.findMany({
    where: {
      finalApprovedAt: { gte: since },
    },
    select: {
      id: true,
      fullName: true,
      firstName: true,
      lastName: true,
      phoneNumber: true,
      finalApprovedAt: true,
      manychatSubscriberId: true,
      manychatApprovalSentAt: true,
    },
    orderBy: { finalApprovedAt: 'desc' },
  })

  if (drivers.length === 0) {
    console.log(`No hay drivers aprobados en los últimos ${DAYS_BACK} días.`)
    await prisma.$disconnect()
    return
  }

  console.log(`Encontrados ${drivers.length} drivers aprobados.\n`)

  const findings: DriverFinding[] = []

  for (const d of drivers) {
    const issues: Issue[] = []

    if (detectPhoneIssue(d.phoneNumber)) issues.push('phone_format')
    if (!d.manychatSubscriberId) issues.push('no_subscriber')
    if (!d.manychatApprovalSentAt) issues.push('no_approval_lock')

    const approvalAuditCount = await prisma.whatsAppMessage.count({
      where: {
        formDriverId: d.id,
        botId: 'manychat',
        step: 'postulacion_aprobada',
      },
    })

    if (approvalAuditCount === 0) issues.push('no_audit_message')

    findings.push({
      id: d.id,
      name: d.fullName || `${d.firstName ?? ''} ${d.lastName ?? ''}`.trim() || '(sin nombre)',
      phone: d.phoneNumber,
      finalApprovedAt: d.finalApprovedAt!,
      manychatSubscriberId: d.manychatSubscriberId,
      manychatApprovalSentAt: d.manychatApprovalSentAt,
      approvalAuditCount,
      issues,
    })
  }

  // === Reporte agrupado ===
  const broken = findings.filter((f) => f.issues.length > 0)
  const ok = findings.filter((f) => f.issues.length === 0)

  console.log(`\n--- Resumen ---`)
  console.log(`OK (cadena completa): ${ok.length}/${findings.length}`)
  console.log(`Con issues:           ${broken.length}/${findings.length}`)

  if (broken.length === 0) {
    console.log(`\nHappy path está limpio en los últimos ${DAYS_BACK} días.\n`)
    await prisma.$disconnect()
    return
  }

  // Agrupar por tipo de issue
  const byIssue: Record<Issue, DriverFinding[]> = {
    no_subscriber: [],
    no_approval_lock: [],
    no_audit_message: [],
    phone_format: [],
  }
  for (const f of broken) {
    for (const issue of f.issues) byIssue[issue].push(f)
  }

  console.log(`\n--- Por tipo de issue ---`)
  console.log(`phone_format:      ${byIssue.phone_format.length} (teléfono no normaliza a E.164)`)
  console.log(`no_subscriber:     ${byIssue.no_subscriber.length} (manychatSubscriberId=null)`)
  console.log(`no_approval_lock:  ${byIssue.no_approval_lock.length} (manychatApprovalSentAt=null)`)
  console.log(`no_audit_message:  ${byIssue.no_audit_message.length} (sin WhatsAppMessage de auditoría)`)

  console.log(`\n--- Detalle de drivers con cadena rota ---`)
  for (const f of broken) {
    const date = f.finalApprovedAt.toISOString().slice(0, 10)
    console.log(
      `\n[${date}] ${f.name} (${f.phone})\n  driverId=${f.id}\n  issues=${f.issues.join(', ')}\n  manychatSubscriberId=${f.manychatSubscriberId ?? 'null'}\n  manychatApprovalSentAt=${f.manychatApprovalSentAt?.toISOString() ?? 'null'}\n  approvalAuditCount=${f.approvalAuditCount}`
    )
  }

  console.log(`\n--- Acciones sugeridas ---`)
  if (byIssue.phone_format.length > 0) {
    console.log(`• phone_format: corregir el phoneNumber del driver en DB antes de reintentar.`)
  }
  if (byIssue.no_subscriber.length > 0) {
    console.log(`• no_subscriber: usar el botón "Vincular ManyChat" en /admin/postulaciones/<id>`)
    console.log(`  o disparar manualmente desde la UI (re-corre getOrCreateManychatSubscriber).`)
  }
  if (byIssue.no_approval_lock.length > 0) {
    console.log(`• no_approval_lock: estos no se intentaron — probable que falló antes del lock.`)
    console.log(`  Disparar manualmente con "Reenviar ManyChat" tras vincular subscriber.`)
  }
  if (byIssue.no_audit_message.length > 0) {
    console.log(`• no_audit_message: el flow se intentó pero el WhatsAppMessage no se persistió.`)
    console.log(`  Si manychatApprovalSentAt está seteado, el flow probablemente sí se mandó.`)
    console.log(`  Si no, el lock se liberó por error antes de auditoría.`)
  }

  console.log()
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('Audit falló:', err)
  process.exit(1)
})
