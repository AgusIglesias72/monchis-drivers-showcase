// scripts/run-agent-on-recent.ts
//
// Corre el agente IA sobre los N postulantes completados más recientes.
// Antes de correr el agente, si al driver le falta el fetch de RUC, lo hace.
//
// Uso:
//   tsx scripts/run-agent-on-recent.ts [--limit N] [--mode DRY_RUN|REAL]
//
//   --limit N   cuántos postulantes procesar (default: 10)
//   --mode      DRY_RUN (default) o REAL
//
// Ejemplo: tsx scripts/run-agent-on-recent.ts --limit 10

import 'dotenv/config'
import { prisma } from '@/lib/prisma'
import { refreshRucForDriver } from '@/lib/services/turuc.service'
import { runAgentForDriver } from '@/lib/services/agent.service'

interface CliFlags {
  limit: number
  mode: 'DRY_RUN' | 'REAL'
}

function parseFlags(): CliFlags {
  const argv = process.argv.slice(2)
  const flags: CliFlags = { limit: 10, mode: 'DRY_RUN' }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--limit') flags.limit = Number(argv[++i])
    else if (arg === '--mode') {
      const v = argv[++i]
      flags.mode = v === 'REAL' ? 'REAL' : 'DRY_RUN'
    }
  }
  return flags
}

async function main() {
  const flags = parseFlags()
  console.log('[run-agent-on-recent] Config:', flags)

  // Traer los N postulantes COMPLETED más recientes
  const drivers = await prisma.formDriver.findMany({
    where: { status: 'COMPLETED' },
    orderBy: { completedAt: 'desc' },
    take: flags.limit,
    select: {
      id: true,
      fullName: true,
      firstName: true,
      lastName: true,
      cedula: true,
      rucStatus: true,
      rucName: true,
      rucLastCheckedAt: true,
      completedAt: true,
    },
  })

  console.log(`\nPostulantes a procesar: ${drivers.length}\n`)

  const summary: Array<{
    name: string
    cedula: string
    rucStatus: string
    decision: string
    costUsd: number
    actionsCount: number
  }> = []

  for (let i = 0; i < drivers.length; i++) {
    const d = drivers[i]
    const name =
      d.fullName ||
      `${d.firstName ?? ''} ${d.lastName ?? ''}`.trim() ||
      '(sin nombre)'

    console.log(`\n[${i + 1}/${drivers.length}] ${name} — cédula ${d.cedula}`)
    console.log(
      `  completedAt: ${d.completedAt ? new Date(d.completedAt).toLocaleString('es-PY') : '—'}`,
    )

    // 1. Refresh RUC si hace falta
    const needsRuc =
      !d.rucStatus || d.rucStatus === 'NOT_CHECKED' || d.rucStatus === 'ERROR'
    if (needsRuc) {
      console.log('  → Consultando RUC...')
      const rucResult = await refreshRucForDriver(d.id)
      if (rucResult) {
        console.log(
          `    RUC: ${rucResult.status}${rucResult.name ? ` — ${rucResult.name}` : ''}`,
        )
      } else {
        console.log('    RUC: fallo o skip')
      }
    } else {
      console.log(`  → RUC ya consultado: ${d.rucStatus}${d.rucName ? ` (${d.rucName})` : ''}`)
    }

    // 2. Correr el agente
    console.log(`  → Corriendo agente (${flags.mode})...`)
    try {
      const result = await runAgentForDriver({
        driverId: d.id,
        mode: flags.mode,
        triggeredBy: 'script:run-agent-on-recent',
      })

      console.log(`    decision: ${result.decision ?? '—'}`)
      console.log(`    acciones: ${result.actions.length}`)
      console.log(`    costo: $${(result.metrics.costMicroUsd / 1_000_000).toFixed(4)} USD`)
      if (result.error) console.log(`    ⚠️ error: ${result.error}`)

      summary.push({
        name,
        cedula: d.cedula,
        rucStatus: d.rucStatus ?? 'NOT_CHECKED',
        decision: result.decision ?? '—',
        costUsd: result.metrics.costMicroUsd / 1_000_000,
        actionsCount: result.actions.length,
      })
    } catch (err: any) {
      console.error(`    ❌ agente falló:`, err?.message ?? err)
      summary.push({
        name,
        cedula: d.cedula,
        rucStatus: d.rucStatus ?? 'NOT_CHECKED',
        decision: 'ERROR',
        costUsd: 0,
        actionsCount: 0,
      })
    }
  }

  // Resumen final
  console.log('\n' + '='.repeat(70))
  console.log('RESUMEN')
  console.log('='.repeat(70))

  const decisionCounts: Record<string, number> = {}
  let totalCost = 0
  for (const s of summary) {
    decisionCounts[s.decision] = (decisionCounts[s.decision] || 0) + 1
    totalCost += s.costUsd
  }

  console.log(`\nTotal procesados: ${summary.length}`)
  console.log('Distribución de decisiones:')
  for (const [decision, count] of Object.entries(decisionCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${decision}: ${count}`)
  }
  console.log(`\nCosto total: $${totalCost.toFixed(4)} USD`)
  console.log(`Costo promedio: $${(totalCost / summary.length).toFixed(4)} USD/corrida`)

  console.log('\nMirá los resultados en /admin/agent-runs')
}

main()
  .catch((err) => {
    console.error('[run-agent-on-recent] FATAL:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
