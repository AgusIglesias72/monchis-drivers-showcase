// scripts/migrate-cedula-step3-verify.ts
//
// Spot-check post-migración: verifica que los rows del backup ahora son CEDULA
// y que el total cuadra con lo respaldado.
//
// Correr: npx tsx scripts/migrate-cedula-step3-verify.ts <path-to-backup.json>

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'

const prisma = new PrismaClient()

async function main() {
  const backupPath = process.argv[2]
  if (!backupPath || !fs.existsSync(backupPath)) {
    console.error('❌ Pasá la ruta al backup JSON como argumento.')
    process.exit(1)
  }

  const backup = JSON.parse(fs.readFileSync(backupPath, 'utf-8'))
  const backupRows: Array<{ id: string; document_type: string }> = backup.rows
  console.log(`📦 Backup cargado: ${backupRows.length} rows respaldados.\n`)

  // Verificación 1: cada row del backup ahora debe ser CEDULA en DB
  const ids = backupRows.map((r) => r.id)
  const current = await prisma.formDocument.findMany({
    where: { id: { in: ids } },
    select: { id: true, documentType: true },
  })

  const currentMap = new Map(current.map((d) => [d.id, d.documentType]))

  let okCount = 0
  let mismatchCount = 0
  let missingCount = 0
  const mismatches: Array<{ id: string; was: string; now: string | undefined }> = []

  for (const row of backupRows) {
    const now = currentMap.get(row.id)
    if (!now) {
      missingCount++
    } else if (now === 'CEDULA') {
      okCount++
    } else {
      mismatchCount++
      if (mismatches.length < 10) {
        mismatches.push({ id: row.id, was: row.document_type, now })
      }
    }
  }

  console.log(`✅ Rows ahora con CEDULA: ${okCount} / ${backupRows.length}`)
  if (mismatchCount > 0) {
    console.log(`⚠️  Rows con tipo distinto: ${mismatchCount}`)
    console.log('   Primeros 10:')
    for (const m of mismatches) console.log(`     ${m.id}: ${m.was} → ${m.now}`)
  }
  if (missingCount > 0) {
    console.log(`⚠️  Rows del backup que YA NO existen en DB: ${missingCount}`)
  }

  // Verificación 2: el total CEDULA en DB debe ser >= el total del backup
  const cedulaCount = await prisma.formDocument.count({ where: { documentType: 'CEDULA' } })
  console.log(`\n📊 Total CEDULA actual en DB: ${cedulaCount}`)
  console.log(`📊 Total respaldado: ${backupRows.length}`)
  if (cedulaCount >= backupRows.length) {
    console.log('   ✅ Cuenta CEDULA actual >= respaldado (cero pérdida)')
  } else {
    console.log('   ❌ Cuenta CEDULA actual < respaldado — REVISAR')
  }

  // Verificación 3: integridad — todos los form_drivers afectados siguen existiendo
  const driverIdsAffected = Array.from(
    new Set(backupRows.map((r: any) => r.form_driver_id).filter(Boolean) as string[]),
  )
  const existingDrivers = await prisma.formDriver.count({
    where: { id: { in: driverIdsAffected } },
  })
  console.log(`\n👥 FormDrivers únicos afectados: ${driverIdsAffected.length}`)
  console.log(`   Existentes en DB: ${existingDrivers}`)
  if (existingDrivers === driverIdsAffected.length) {
    console.log('   ✅ Todos los drivers siguen existiendo')
  } else {
    console.log(`   ⚠️  ${driverIdsAffected.length - existingDrivers} drivers desaparecieron`)
  }

  await prisma.$disconnect()

  if (mismatchCount === 0 && missingCount === 0 && existingDrivers === driverIdsAffected.length) {
    console.log('\n🎉 Migración 100% exitosa, cero pérdida de información.')
  } else {
    console.log('\n⚠️  Hay anomalías — revisar los warnings de arriba.')
    process.exit(1)
  }
}

main().catch(async (e) => {
  console.error('❌ Verify falló:', e)
  await prisma.$disconnect()
  process.exit(1)
})
