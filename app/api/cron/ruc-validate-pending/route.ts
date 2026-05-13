// app/api/cron/ruc-validate-pending/route.ts
//
// Cron de validación de RUC: garantiza que todo FormDriver tenga rucStatus
// cargado. Procesa drivers con rucStatus null / NOT_CHECKED / ERROR contra
// turuc.com.py en batches concurrentes con rate-limit awareness.
//
// Decisiones:
// - BATCH_LIMIT 100: con concurrency 3 + delay 2s entre batches da ~70-100s
//   por corrida, holgado dentro de los 300s de Vercel.
// - Cédulas extranjeras (con letras) → marcamos NOT_APPLICABLE local sin
//   pegarle al SET paraguayo.
// - Cédulas vacías → SKIP_NO_CEDULA, requieren intervención admin (no podemos
//   inventar el dato).
// - rucStatus=ERROR entra en la cola para reintentar (transitorio: 5xx, 429,
//   timeout).
//
// Idempotente: cada corrida persiste rucLastCheckedAt; si vuelve a entrar a la
// cola por algún error, simplemente lo retomamos.
//
// Schedule: cada 10 minutos.
// Vercel maxDuration: 300s.

import { NextRequest, NextResponse } from 'next/server'
import { requireCronAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkRucStatus, isForeignCedula } from '@/lib/services/turuc.service'
import type { Prisma } from '@prisma/client'

export const maxDuration = 300

const BATCH_LIMIT = 100
const CONCURRENCY = 3
const DELAY_BETWEEN_BATCHES_MS = 2000

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

export async function GET(request: NextRequest) {
  const cronError = requireCronAuth(request)
  if (cronError) return cronError

  const t0 = Date.now()

  // Drivers que aún no tienen RUC validado (priorizar más recientes para que
  // postulaciones nuevas tengan el dato disponible cuanto antes).
  const candidates = await prisma.formDriver.findMany({
    where: {
      OR: [
        { rucStatus: null },
        { rucStatus: 'NOT_CHECKED' },
        { rucStatus: 'ERROR' },
      ],
    },
    select: {
      id: true,
      cedula: true,
      fullName: true,
      firstName: true,
      rucStatus: true,
    },
    orderBy: { startedAt: 'desc' },
    take: BATCH_LIMIT,
  })

  if (candidates.length === 0) {
    console.log('[cron:ruc-validate-pending] Sin candidatos pendientes.')
    return NextResponse.json({ success: true, processed: 0, message: 'Sin candidatos' })
  }

  const counters: Record<string, number> = {}
  let processed = 0

  const processOne = async (driver: (typeof candidates)[number]) => {
    const tag = `${driver.fullName ?? driver.firstName ?? '(sin nombre)'} (${driver.cedula ?? 'sin cédula'})`

    // Cédula vacía → no podemos consultar, marcamos para que admin lo trate
    if (!driver.cedula || driver.cedula.trim() === '') {
      counters['SKIP_NO_CEDULA'] = (counters['SKIP_NO_CEDULA'] ?? 0) + 1
      console.log(`[cron:ruc] ${tag} → SKIP (cédula vacía)`)
      return
    }

    // Cédula extranjera → NOT_APPLICABLE local
    if (isForeignCedula(driver.cedula)) {
      await prisma.formDriver.update({
        where: { id: driver.id },
        data: {
          rucStatus: 'NOT_APPLICABLE',
          rucName: null,
          rucDv: null,
          rucIsLegalEntity: null,
          rucIsPublicEntity: null,
          rucLastCheckedAt: new Date(),
          rucApiRawResponse: {
            reason: 'foreign_cedula',
            cedula: driver.cedula,
          } as Prisma.InputJsonValue,
        },
      })
      counters['NOT_APPLICABLE'] = (counters['NOT_APPLICABLE'] ?? 0) + 1
      console.log(`[cron:ruc] ${tag} → NOT_APPLICABLE (extranjero)`)
      return
    }

    try {
      const result = await checkRucStatus(driver.cedula)
      counters[result.status] = (counters[result.status] ?? 0) + 1

      await prisma.formDriver.update({
        where: { id: driver.id },
        data: {
          rucStatus: result.status,
          rucName: result.name,
          rucDv: result.dv,
          rucIsLegalEntity: result.isLegalEntity,
          rucIsPublicEntity: result.isPublicEntity,
          rucLastCheckedAt: new Date(),
          rucApiRawResponse: result.raw as Prisma.InputJsonValue,
        },
      })

      const info = result.name ? ` — ${result.name}` : ''
      const err = result.error ? ` (${result.error})` : ''
      console.log(`[cron:ruc] ${tag} → ${result.status}${info}${err}`)
    } catch (err) {
      counters['EXCEPTION'] = (counters['EXCEPTION'] ?? 0) + 1
      const errMsg = err instanceof Error ? err.message : String(err)
      console.error(`[cron:ruc] ${tag} → EXCEPTION: ${errMsg}`)
    }
  }

  for (let i = 0; i < candidates.length; i += CONCURRENCY) {
    const batch = candidates.slice(i, i + CONCURRENCY)
    await Promise.all(batch.map(processOne))
    processed += batch.length
    if (i + CONCURRENCY < candidates.length) {
      await sleep(DELAY_BETWEEN_BATCHES_MS)
    }
  }

  const elapsedMs = Date.now() - t0

  console.log('[cron:ruc-validate-pending] Resumen', {
    processed,
    elapsedMs,
    counters,
  })

  return NextResponse.json({
    success: true,
    processed,
    elapsedMs,
    counters,
  })
}
