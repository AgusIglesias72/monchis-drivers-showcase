// scripts/manychat-backfill-discovery.ts
//
// Discovery: drivers que necesitan vincularse a ManyChat (no tienen
// `manychatSubscriberId` pero podrían recibir el flow de aprobación cuando
// sus documentos lleguen a APPROVED).
//
// Por qué no auto-creamos:
// - Crear un subscriber requiere consentPhrase (Meta exige opt-in explícito).
// - Drivers legacy ya pueden tener subscriber en ManyChat (entraron por el bot).
//   Crearlo de nuevo tiraría 400 "already exists" y sin
//   MANYCHAT_WHATSAPP_PHONE_FIELD_ID configurado, el fallback findByCustomField
//   no resuelve.
//
// Flujo recomendado a partir del CSV:
// 1. Para los pocos drivers que están a punto de aprobarse (todos los docs
//    APPROVED salvo uno o dos), usar el botón "Vincular ManyChat" manual.
// 2. Para el batch grande, configurar MANYCHAT_WHATSAPP_PHONE_FIELD_ID en env
//    y crear una automation en ManyChat que populate ese campo en todos los
//    subscribers existentes.
//
// Uso:
//   npx tsx --env-file=.env scripts/manychat-backfill-discovery.ts > backfill.csv

import { prisma } from '../lib/prisma'

function normalizeE164(phone: string): { e164: string | null; ok: boolean } {
  const digits = phone.replace(/\D/g, '')
  if (!digits) return { e164: null, ok: false }
  if (digits.startsWith('595')) return { e164: `+${digits}`, ok: true }
  if (digits.startsWith('54') && digits.length >= 12) return { e164: `+${digits}`, ok: true }
  if (digits.startsWith('0') && digits.length === 10) return { e164: `+595${digits.substring(1)}`, ok: true }
  if (digits.length === 9) return { e164: `+595${digits}`, ok: true }
  if (digits.length >= 12) return { e164: `+${digits}`, ok: true }
  return { e164: `+595${digits}`, ok: false }
}

async function main() {
  const writeCsv = process.argv.includes('--csv')

  if (!writeCsv) {
    console.log('=== ManyChat backfill discovery ===\n')
  }

  // Candidatos: drivers que ya completaron el form (no IN_PROGRESS) y no
  // tienen manychatSubscriberId. Excluimos REJECTED (no van a recibir nada).
  const candidates = await prisma.formDriver.findMany({
    where: {
      manychatSubscriberId: null,
      status: { in: ['COMPLETED', 'SUBMITTED', 'UNDER_REVIEW', 'DOCS_PENDING', 'APPROVED', 'READY_ONBOARDING', 'ONBOARDING', 'ACTIVE'] },
    },
    select: {
      id: true,
      fullName: true,
      firstName: true,
      lastName: true,
      cedula: true,
      phoneNumber: true,
      status: true,
      documentsStatus: true,
      lastActivityAt: true,
    },
    orderBy: { lastActivityAt: 'desc' },
  })

  // Bucket por urgencia
  type Bucket = 'docs_approved' | 'docs_pending' | 'docs_corrections' | 'docs_incomplete' | 'other'
  const buckets: Record<Bucket, typeof candidates> = {
    docs_approved: [],
    docs_pending: [],
    docs_corrections: [],
    docs_incomplete: [],
    other: [],
  }

  let phoneIssueCount = 0

  for (const c of candidates) {
    const { ok } = normalizeE164(c.phoneNumber)
    if (!ok) phoneIssueCount++

    if (c.documentsStatus === 'APPROVED') buckets.docs_approved.push(c)
    else if (c.documentsStatus === 'PENDING') buckets.docs_pending.push(c)
    else if (c.documentsStatus === 'CORRECTIONS') buckets.docs_corrections.push(c)
    else if (c.documentsStatus === 'INCOMPLETE') buckets.docs_incomplete.push(c)
    else buckets.other.push(c)
  }

  if (writeCsv) {
    // CSV mode: para importar en spreadsheet o para la UI ManyChat
    process.stdout.write(
      'driver_id,name,cedula,phone_raw,phone_e164,phone_ok,status,documents_status,last_activity\n'
    )
    for (const c of candidates) {
      const { e164, ok } = normalizeE164(c.phoneNumber)
      const name = (c.fullName || `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || '').replace(/,/g, ' ')
      process.stdout.write(
        `${c.id},${name},${c.cedula},${c.phoneNumber},${e164 ?? ''},${ok},${c.status},${c.documentsStatus},${c.lastActivityAt.toISOString().slice(0, 10)}\n`
      )
    }
    return
  }

  console.log(`Total drivers sin manychatSubscriberId (no IN_PROGRESS, no REJECTED): ${candidates.length}\n`)

  console.log(`--- Por urgencia (documentsStatus) ---`)
  console.log(`docs_approved   : ${buckets.docs_approved.length}  ← Estos están a punto de gatillar el flow.`)
  console.log(`docs_pending    : ${buckets.docs_pending.length}  ← Documentos subidos, esperando revisión.`)
  console.log(`docs_corrections: ${buckets.docs_corrections.length}  ← Hay docs rechazados, vuelven al ruedo.`)
  console.log(`docs_incomplete : ${buckets.docs_incomplete.length}  ← Aún no subieron todo.`)
  console.log(`other           : ${buckets.other.length}\n`)

  if (phoneIssueCount > 0) {
    console.log(`Drivers con teléfono que NO normaliza a E.164 PY: ${phoneIssueCount}`)
    console.log(`(estos no van a poder vincularse hasta corregir el phoneNumber en DB)\n`)
  }

  if (buckets.docs_approved.length > 0) {
    console.log(`--- ALERTA: drivers con docs APPROVED pero sin subscriber ---`)
    for (const c of buckets.docs_approved.slice(0, 20)) {
      const name = c.fullName || `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || '(sin nombre)'
      const { e164, ok } = normalizeE164(c.phoneNumber)
      console.log(`  ${c.id}  ${name.padEnd(30)}  ${c.phoneNumber} → ${e164 ?? 'INVÁLIDO'}  ${ok ? '' : '⚠'}`)
    }
    if (buckets.docs_approved.length > 20) {
      console.log(`  ... y ${buckets.docs_approved.length - 20} más.`)
    }
    console.log()
  }

  console.log(`--- Para CSV completo ---`)
  console.log(`npx tsx --env-file=.env scripts/manychat-backfill-discovery.ts --csv > backfill.csv\n`)

  console.log(`--- Próximos pasos sugeridos ---`)
  console.log(`1. Para drivers en docs_approved (urgente): vincular vía UI antes del próximo approve.`)
  console.log(`2. Configurar MANYCHAT_WHATSAPP_PHONE_FIELD_ID + sembrar custom field espejo para`)
  console.log(`   habilitar fallback automático en getOrCreateManychatSubscriber.`)
  console.log(`3. Mientras no haya mirror field, los nuevos drivers se vinculan ok al crearse —`)
  console.log(`   este backfill solo afecta legacy.\n`)
}

main()
  .catch((err) => {
    console.error('Discovery falló:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
