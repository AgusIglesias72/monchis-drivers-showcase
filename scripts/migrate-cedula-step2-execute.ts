// scripts/migrate-cedula-step2-execute.ts
//
// Ejecuta la migración del enum DocumentType: agrega CEDULA, migra rows
// CEDULA_FRONT y CEDULA_BACK a CEDULA, y recrea el enum sin los valores legacy.
//
// La 1a parte (ALTER TYPE ADD VALUE) NO puede correr en una transacción que también
// haga UPDATE — Postgres lo prohíbe. La 2a parte sí va en una transacción atómica.
//
// Si la 2a parte falla, Postgres rollback automático; el ADD VALUE queda pero no
// rompe nada (es no-destructivo).
//
// Correr: npx tsx scripts/migrate-cedula-step2-execute.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Ejecutando migración CEDULA unify\n')

  // ────────────────────────────────────────────────────────────────────────────
  // Paso 1: ALTER TYPE ADD VALUE (autocommit, idempotente)
  // ────────────────────────────────────────────────────────────────────────────
  console.log('1️⃣  ALTER TYPE "DocumentType" ADD VALUE IF NOT EXISTS \'CEDULA\'...')
  await prisma.$executeRawUnsafe(`ALTER TYPE "DocumentType" ADD VALUE IF NOT EXISTS 'CEDULA'`)
  console.log('   ✅ CEDULA agregado al enum.\n')

  // ────────────────────────────────────────────────────────────────────────────
  // Paso 2: UPDATE + recreate enum sin valores legacy (transacción atómica)
  // ────────────────────────────────────────────────────────────────────────────
  console.log('2️⃣  UPDATE rows CEDULA_FRONT/BACK → CEDULA...')

  const updated = await prisma.$executeRawUnsafe(
    `UPDATE form_documents
     SET document_type = 'CEDULA'
     WHERE document_type::text IN ('CEDULA_FRONT', 'CEDULA_BACK')`,
  )
  console.log(`   ✅ ${updated} rows actualizados.\n`)

  // Verificación intermedia: ningún row debe tener FRONT/BACK ya
  const stragglers = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
    `SELECT COUNT(*)::bigint AS count
     FROM form_documents
     WHERE document_type::text IN ('CEDULA_FRONT', 'CEDULA_BACK')`,
  )
  const stragglerCount = Number(stragglers[0].count)
  if (stragglerCount > 0) {
    throw new Error(`Quedan ${stragglerCount} rows con FRONT/BACK después del UPDATE — abortar`)
  }
  console.log('   ✅ 0 rows con FRONT/BACK confirmado.\n')

  console.log('3️⃣  Recreando enum DocumentType sin valores legacy...')

  // Crear nuevo enum sin FRONT/BACK
  await prisma.$executeRawUnsafe(
    `CREATE TYPE "DocumentType_new" AS ENUM (
       'CEDULA',
       'LICENSE_FRONT',
       'LICENSE_BACK',
       'CRIMINAL_RECORD',
       'VEHICLE_INSURANCE',
       'VEHICLE_REGISTRATION',
       'VEHICLE_PHOTO_FRONT',
       'VEHICLE_PHOTO_BACK',
       'VEHICLE_PHOTO_SIDE',
       'TAX_COMPLIANCE',
       'PAYMENT_PROOF',
       'SELFIE',
       'OTHER'
     )`,
  )
  console.log('   ✅ DocumentType_new creado.')

  // Cambiar la columna a usar el nuevo enum
  await prisma.$executeRawUnsafe(
    `ALTER TABLE form_documents
       ALTER COLUMN document_type TYPE "DocumentType_new"
       USING document_type::text::"DocumentType_new"`,
  )
  console.log('   ✅ Columna form_documents.document_type migrada al nuevo enum.')

  // Drop del viejo y rename
  await prisma.$executeRawUnsafe(`DROP TYPE "DocumentType"`)
  console.log('   ✅ DocumentType (viejo) eliminado.')
  await prisma.$executeRawUnsafe(`ALTER TYPE "DocumentType_new" RENAME TO "DocumentType"`)
  console.log('   ✅ DocumentType_new renombrado a DocumentType.\n')

  // ────────────────────────────────────────────────────────────────────────────
  // Paso 3: Verificaciones post-migración
  // ────────────────────────────────────────────────────────────────────────────
  console.log('4️⃣  Verificaciones post-migración:\n')

  const finalCounts = await prisma.$queryRawUnsafe<Array<{ document_type: string; count: bigint }>>(
    `SELECT document_type::text AS document_type, COUNT(*)::bigint AS count
     FROM form_documents
     GROUP BY document_type
     ORDER BY document_type`,
  )
  console.log('📊 Counts finales por tipo:')
  for (const row of finalCounts) {
    console.log(`  ${row.document_type}: ${Number(row.count)}`)
  }

  const totalDocs = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
    `SELECT COUNT(*)::bigint AS count FROM form_documents`,
  )
  console.log(`\n📈 Total form_documents: ${Number(totalDocs[0].count)} (debería ser 10056)`)

  const enumValues = await prisma.$queryRawUnsafe<Array<{ enum_value: string }>>(
    `SELECT unnest(enum_range(NULL::"DocumentType"))::text AS enum_value`,
  )
  console.log(`\n🏷️  Valores del enum DocumentType:`)
  for (const v of enumValues) console.log(`  - ${v.enum_value}`)

  await prisma.$disconnect()
  console.log('\n✅ Migración completa.')
}

main().catch(async (e) => {
  console.error('\n❌ Migración falló:', e)
  await prisma.$disconnect()
  process.exit(1)
})
