// scripts/migrate-cedula-step1-snapshot.ts
//
// Snapshot pre-migración: cuenta rows por tipo y exporta los rows afectados
// (CEDULA_FRONT + CEDULA_BACK) a JSON para poder reconstruir si hace falta.
//
// Correr: npx tsx scripts/migrate-cedula-step1-snapshot.ts

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Snapshot pre-migración CEDULA unify\n')

  // 1. Counts por tipo (incluye CEDULA por si ya existe — no debería pero por las dudas)
  const counts = await prisma.$queryRawUnsafe<Array<{ document_type: string; count: bigint }>>(
    `SELECT document_type::text AS document_type, COUNT(*)::bigint AS count
     FROM form_documents
     WHERE document_type::text IN ('CEDULA_FRONT', 'CEDULA_BACK', 'CEDULA')
     GROUP BY document_type
     ORDER BY document_type`,
  )

  console.log('📊 Counts actuales:')
  let totalAffected = 0
  for (const row of counts) {
    const n = Number(row.count)
    console.log(`  ${row.document_type}: ${n}`)
    if (row.document_type === 'CEDULA_FRONT' || row.document_type === 'CEDULA_BACK') {
      totalAffected += n
    }
  }
  console.log(`\n  Total a migrar (FRONT + BACK): ${totalAffected}\n`)

  if (totalAffected === 0) {
    console.log('✅ No hay rows que migrar. La migración será no-op para datos.')
  }

  // 2. Backup completo de rows afectados
  const affected = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `SELECT
       id,
       form_driver_id,
       document_type::text AS document_type,
       blob_url,
       file_name,
       mime_type,
       file_size,
       status::text AS status,
       reviewed_at,
       rejection_reason,
       metadata,
       created_at,
       updated_at,
       uploaded_at
     FROM form_documents
     WHERE document_type::text IN ('CEDULA_FRONT', 'CEDULA_BACK')
     ORDER BY created_at`,
  )

  const backupDir = path.join(process.cwd(), 'backups')
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true })
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupFile = path.join(backupDir, `cedula-migration-pre-${timestamp}.json`)

  fs.writeFileSync(
    backupFile,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        counts,
        totalAffected,
        rows: affected,
      },
      (_, v) => (typeof v === 'bigint' ? Number(v) : v),
      2,
    ),
  )

  console.log(`💾 Backup guardado: ${backupFile}`)
  console.log(`   ${affected.length} rows respaldados.\n`)

  // 3. Counts globales para sanity check post-migración
  const totalDocs = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
    `SELECT COUNT(*)::bigint AS count FROM form_documents`,
  )
  console.log(`📈 Total form_documents en DB: ${Number(totalDocs[0].count)}`)

  // 4. Sample de IDs para spot-check post
  const sampleIds = affected.slice(0, 5).map((r) => r.id)
  console.log(`\n🎯 Sample IDs para verificar post-migración:`)
  for (const id of sampleIds) console.log(`   ${id}`)

  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error('❌ Snapshot falló:', e)
  await prisma.$disconnect()
  process.exit(1)
})
