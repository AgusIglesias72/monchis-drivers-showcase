// scripts/drain-pedidos-queue.ts
//
// Drena la cola MonchisOrderImportQueue desde la línea de comandos, evitando
// pasar por el dev server de Next (que se cae con paralelismo + Prisma).
//
// Uso:
//   tsx scripts/drain-pedidos-queue.ts [--batches N] [--limit M] [--priority recent|oldest] [--delay MS]
//
//   --batches N       cuántos lotes consecutivos (default: 5)
//   --limit M         tamaño de lote (1..400, default: 400)
//   --priority        recent (más nuevos primero) | oldest (FIFO, default: recent)
//   --delay MS        pausa entre lotes en ms (default: 1000)
//
// Ejemplo: tsx scripts/drain-pedidos-queue.ts --batches 10 --limit 400

import "dotenv/config"

import { prisma } from "@/lib/prisma"
import { processOrderImportQueueBatch } from "@/lib/services/pedidos-import-queue.service"

interface CliFlags {
  batches: number
  limit: number
  priority: "recent" | "oldest"
  delayMs: number
}

function parseFlags(): CliFlags {
  const args = process.argv.slice(2)
  const flags: CliFlags = {
    batches: 5,
    limit: 400,
    priority: "recent",
    delayMs: 1000,
  }
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === "--batches") flags.batches = Number(args[++i]) || flags.batches
    else if (a === "--limit") flags.limit = Number(args[++i]) || flags.limit
    else if (a === "--priority") {
      const v = args[++i]
      flags.priority = v === "oldest" ? "oldest" : "recent"
    } else if (a === "--delay") flags.delayMs = Number(args[++i]) || flags.delayMs
  }
  flags.limit = Math.max(1, Math.min(flags.limit, 400))
  flags.batches = Math.max(1, flags.batches)
  return flags
}

async function main() {
  const flags = parseFlags()
  console.log(
    `🚀 Drenando: batches=${flags.batches} limit=${flags.limit} priority=${flags.priority} delay=${flags.delayMs}ms`,
  )

  let totalPicked = 0
  let totalDone = 0
  let totalNotFound = 0
  let totalFailed = 0
  const overallStart = Date.now()

  for (let i = 1; i <= flags.batches; i++) {
    const batchStart = Date.now()
    const result = await processOrderImportQueueBatch(flags.limit, flags.priority)
    totalPicked += result.picked
    totalDone += result.done
    totalNotFound += result.notFound
    totalFailed += result.failed
    const batchMs = Date.now() - batchStart
    console.log(
      `  [${i}/${flags.batches}] picked=${result.picked} done=${result.done} not_found=${result.notFound} failed=${result.failed} (${batchMs}ms)`,
    )
    if (result.picked === 0) {
      console.log("✅ Queue vacía — corto temprano.")
      break
    }
    if (i < flags.batches && flags.delayMs > 0) {
      await new Promise((r) => setTimeout(r, flags.delayMs))
    }
  }

  const totalMs = Date.now() - overallStart
  console.log(
    `\n📊 Total: picked=${totalPicked} done=${totalDone} not_found=${totalNotFound} failed=${totalFailed} (${(totalMs / 1000).toFixed(1)}s)`,
  )
}

main()
  .catch((err) => {
    console.error("❌ Error:", err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
