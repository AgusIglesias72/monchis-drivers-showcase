// scripts/ruc-backfill.ts
// Itera FormDriver y consulta turuc.com.py para registrar estado RUC.
// Procesa en batches concurrentes, con delay entre batches.
// Uso:
//   tsx scripts/ruc-backfill.ts [--limit N] [--concurrency N] [--delay MS] [--dry-run] [--only-pending] [--force]
//
//   --limit N         máximo de drivers a procesar (default: sin límite)
//   --concurrency N   requests en paralelo por batch (default: 5)
//   --delay MS        delay entre batches en ms (default: 2000)
//   --dry-run         no persiste, solo imprime resultados
//   --only-pending    solo procesa los que tienen rucStatus NULL o 'NOT_CHECKED' (default)
//   --force           reprocesa TODOS, incluso los ya consultados

import 'dotenv/config'
import { prisma } from '@/lib/prisma'
import { checkRucStatus, normalizeCedula } from '@/lib/services/turuc.service'

interface CliFlags {
  limit: number | null
  delay: number
  concurrency: number
  dryRun: boolean
  force: boolean
}

function parseFlags(): CliFlags {
  const argv = process.argv.slice(2)
  const flags: CliFlags = { limit: null, delay: 2000, concurrency: 3, dryRun: false, force: false }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--dry-run') flags.dryRun = true
    else if (arg === '--force') flags.force = true
    else if (arg === '--only-pending') flags.force = false
    else if (arg === '--limit') flags.limit = Number(argv[++i])
    else if (arg === '--delay') flags.delay = Number(argv[++i])
    else if (arg === '--concurrency') flags.concurrency = Number(argv[++i])
    else if (arg.startsWith('--limit=')) flags.limit = Number(arg.split('=')[1])
    else if (arg.startsWith('--delay=')) flags.delay = Number(arg.split('=')[1])
    else if (arg.startsWith('--concurrency=')) flags.concurrency = Number(arg.split('=')[1])
  }

  if (!Number.isFinite(flags.concurrency) || flags.concurrency < 1) flags.concurrency = 1

  return flags
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main() {
  const flags = parseFlags()

  console.log('[ruc-backfill] Config:', flags)

  const where = flags.force
    ? {}
    : { OR: [{ rucStatus: null }, { rucStatus: 'NOT_CHECKED' }, { rucStatus: 'ERROR' }] }

  const total = await prisma.formDriver.count({ where })
  console.log(`[ruc-backfill] Drivers a procesar: ${total}${flags.limit ? ` (limit ${flags.limit})` : ''}`)

  if (total === 0) {
    console.log('[ruc-backfill] Nada que hacer. Saliendo.')
    return
  }

  const drivers = await prisma.formDriver.findMany({
    where,
    select: { id: true, cedula: true, firstName: true, lastName: true, rucStatus: true },
    orderBy: { startedAt: 'desc' },
    ...(flags.limit ? { take: flags.limit } : {}),
  })

  const counters: Record<string, number> = {}
  let processed = 0
  const start = Date.now()
  const totalBatches = Math.ceil(drivers.length / flags.concurrency)

  async function processDriver(driver: typeof drivers[number], idx: number) {
    const normalized = normalizeCedula(driver.cedula)

    if (!normalized) {
      counters['SKIP_NO_CEDULA'] = (counters['SKIP_NO_CEDULA'] || 0) + 1
      console.log(`[${idx}/${drivers.length}] ${driver.id} SKIP (cédula vacía)`)
      return
    }

    const result = await checkRucStatus(normalized)
    counters[result.status] = (counters[result.status] || 0) + 1

    const tag = `[${idx}/${drivers.length}] ced=${normalized}`
    const info = result.name ? ` — ${result.name}` : ''
    const err = result.error ? ` (${result.error})` : ''
    console.log(`${tag} → ${result.status}${info}${err}`)

    if (!flags.dryRun) {
      await prisma.formDriver.update({
        where: { id: driver.id },
        data: {
          rucStatus: result.status,
          rucName: result.name,
          rucDv: result.dv,
          rucIsLegalEntity: result.isLegalEntity,
          rucIsPublicEntity: result.isPublicEntity,
          rucLastCheckedAt: new Date(),
          rucApiRawResponse: result.raw as any,
        },
      })
    }
  }

  for (let i = 0; i < drivers.length; i += flags.concurrency) {
    const batch = drivers.slice(i, i + flags.concurrency)
    const batchNum = Math.floor(i / flags.concurrency) + 1
    console.log(`\n--- Batch ${batchNum}/${totalBatches} (${batch.length} en paralelo) ---`)

    await Promise.all(batch.map((driver, j) => processDriver(driver, i + j + 1)))
    processed += batch.length

    const isLastBatch = i + flags.concurrency >= drivers.length
    if (!isLastBatch && flags.delay > 0) {
      await sleep(flags.delay)
    }
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1)
  console.log('\n[ruc-backfill] Resumen:')
  console.log(`  Tiempo total: ${elapsed}s`)
  console.log(`  Procesados: ${processed}`)
  for (const [status, count] of Object.entries(counters).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${status}: ${count}`)
  }
  if (flags.dryRun) console.log('  (dry-run: no se persistió ningún cambio)')
}

main()
  .catch((err) => {
    console.error('[ruc-backfill] FATAL:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
