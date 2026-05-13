// scripts/backfill-pedidos-timestamps.ts
//
// Recomputa confirmedAt, endToEndSeconds y acceptanceSeconds desde rawData
// para todos los pedidos cacheados. Necesario porque el código viejo usaba
// `new Date(s)` sobre el string sin TZ "YYYY-MM-DD HH:MM:SS" del campo
// data_origin.confirmed_at, lo que producía shifts según el TZ del runtime
// (ingest en runtime UTC-3 corría confirmedAt +3h y daba endToEndSeconds=0).
//
// Uso:
//   tsx --require ./scripts/_disable-server-only.cjs scripts/backfill-pedidos-timestamps.ts [--dry] [--batch N]
//
//   --dry      no escribe a la DB, solo reporta cambios
//   --batch N  cuántos por lote (default: 500)
//
// Idempotente: si los timestamps ya están correctos, el update es no-op.

import "dotenv/config"

import { prisma } from "@/lib/prisma"
import { computeKpis } from "@/lib/services/pedidos-kpis"
import { parseApiDate } from "@/lib/utils/pedidos-time"
import type { RawOrder } from "@/lib/types/pedidos.types"

interface CliFlags {
  dry: boolean
  batch: number
}

function parseFlags(): CliFlags {
  const args = process.argv.slice(2)
  const flags: CliFlags = { dry: false, batch: 500 }
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--dry") flags.dry = true
    else if (args[i] === "--batch")
      flags.batch = Math.max(1, Number(args[++i]) || flags.batch)
  }
  return flags
}

function tsEqual(a: Date | null, b: Date | null): boolean {
  if (a === null && b === null) return true
  if (a === null || b === null) return false
  return a.getTime() === b.getTime()
}

async function main() {
  const flags = parseFlags()
  console.log(
    `🔧 Backfill pedidos timestamps — dry=${flags.dry} batch=${flags.batch}`,
  )

  const total = await prisma.monchisOrderCache.count()
  console.log(`📦 Total rows en cache: ${total}`)

  let cursor: string | undefined = undefined
  let scanned = 0
  let changedConfirmed = 0
  let changedFinalized = 0
  let changedE2E = 0
  let changedAccept = 0
  const start = Date.now()

  while (true) {
    const rows: Array<{
      requestId: string
      confirmedAt: Date | null
      finalizedAt: Date | null
      endToEndSeconds: number | null
      acceptanceSeconds: number | null
      rawData: unknown
    }> = await prisma.monchisOrderCache.findMany({
      take: flags.batch,
      ...(cursor ? { cursor: { requestId: cursor }, skip: 1 } : {}),
      orderBy: { requestId: "asc" },
      select: {
        requestId: true,
        confirmedAt: true,
        finalizedAt: true,
        endToEndSeconds: true,
        acceptanceSeconds: true,
        rawData: true,
      },
    })

    if (rows.length === 0) break

    for (const r of rows) {
      const raw = r.rawData as unknown as RawOrder
      const newConfirmedAt = parseApiDate(raw.data_origin?.confirmed_at)
      const histories = raw.histories || []
      let newFinalizedAt: Date | null = null
      for (let i = histories.length - 1; i >= 0; i--) {
        if (histories[i].request_state === "FINALIZED") {
          newFinalizedAt = parseApiDate(histories[i].date)
          break
        }
      }
      const kpis = computeKpis(raw)
      const newE2E = kpis.endToEnd.seconds
      const newAccept = kpis.accepting.seconds

      const updates: Record<string, unknown> = {}
      if (!tsEqual(newConfirmedAt, r.confirmedAt)) {
        updates.confirmedAt = newConfirmedAt
        changedConfirmed += 1
      }
      if (!tsEqual(newFinalizedAt, r.finalizedAt)) {
        updates.finalizedAt = newFinalizedAt
        changedFinalized += 1
      }
      if (newE2E !== r.endToEndSeconds) {
        updates.endToEndSeconds = newE2E
        changedE2E += 1
      }
      if (newAccept !== r.acceptanceSeconds) {
        updates.acceptanceSeconds = newAccept
        changedAccept += 1
      }

      if (Object.keys(updates).length > 0 && !flags.dry) {
        await prisma.monchisOrderCache.update({
          where: { requestId: r.requestId },
          data: updates,
        })
      }
    }

    scanned += rows.length
    cursor = rows[rows.length - 1].requestId
    process.stdout.write(
      `\r  scanned ${scanned}/${total} | confirmed=${changedConfirmed} finalized=${changedFinalized} e2e=${changedE2E} accept=${changedAccept}`,
    )
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1)
  console.log(
    `\n✅ Done. ${scanned} rows en ${elapsed}s. Cambios: confirmed=${changedConfirmed} finalized=${changedFinalized} e2e=${changedE2E} accept=${changedAccept}`,
  )
}

main()
  .catch((err) => {
    console.error("❌ Error:", err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
