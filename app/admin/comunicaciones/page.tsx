// app/admin/comunicaciones/page.tsx

import { AdminHeader } from '@/components/admin/admin-header'
import { ComunicacionesContent } from '@/components/admin/comunicacion/ComunicacionesContent'
import {
  getMessageStats,
  getRecentMessages,
  type MessageStats,
} from '@/lib/services/messages-history.service'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{
    startDate?: string
    endDate?: string
  }>
}

function parseYmd(s?: string): Date | undefined {
  if (!s) return undefined
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (!m) return undefined
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

/**
 * Resuelve el rango actual y el "rango anterior" de igual duración para comparar.
 * - Sin filtro: últimas 24h vs 24-48h atrás.
 * - Con filtro: usa el rango y el período inmediatamente anterior de misma duración.
 */
function resolveRanges(startStr?: string, endStr?: string) {
  const now = new Date()
  let from: Date
  let to: Date

  if (startStr || endStr) {
    from = parseYmd(startStr) ?? new Date(now.getTime() - 24 * 60 * 60 * 1000)
    to = parseYmd(endStr) ?? now
    // Normalizar a inicio/fin de día para que el rango sea inclusivo.
    if (startStr) from.setHours(0, 0, 0, 0)
    if (endStr) to.setHours(23, 59, 59, 999)
    // Si solo vino startDate, el "to" es hoy a fin de día.
    if (!endStr) to.setHours(23, 59, 59, 999)
    // Si solo vino endDate, el "from" arranca a las 00:00 del to.
    if (!startStr) from = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 0, 0, 0, 0)
  } else {
    from = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    to = now
  }

  const durationMs = to.getTime() - from.getTime()
  const prevTo = new Date(from.getTime())
  const prevFrom = new Date(prevTo.getTime() - durationMs)

  return {
    current: { from, to },
    previous: { from: prevFrom, to: prevTo },
    isDefault: !startStr && !endStr,
  }
}

const EMPTY_STATS: MessageStats = {
  total: 0,
  successful: 0,
  failed: 0,
  pending: 0,
  successRate: '0',
  byBot: {},
  byType: {},
  bySource: {},
}

async function safe<T>(p: Promise<T>, fallback: T): Promise<{ value: T; ok: boolean }> {
  try {
    return { value: await p, ok: true }
  } catch (err) {
    console.error('[comunicaciones page] query failed:', err instanceof Error ? err.message : err)
    return { value: fallback, ok: false }
  }
}

export default async function ComunicacionesPage({ searchParams }: PageProps) {
  const params = await searchParams
  const { current, previous, isDefault } = resolveRanges(params.startDate, params.endDate)

  const [statsCurrent, statsPrev, recentData, templatesCount, topTemplates] = await Promise.all([
    safe(getMessageStats({ dateFrom: current.from, dateTo: current.to }), EMPTY_STATS),
    safe(getMessageStats({ dateFrom: previous.from, dateTo: previous.to }), EMPTY_STATS),
    safe(getRecentMessages({ limit: 15 }), { messages: [] }),
    safe(prisma.whatsAppTemplate.count({ where: { isActive: true } }), 0),
    safe(
      prisma.whatsAppTemplate.findMany({
        where: { isActive: true, usageCount: { gt: 0 } },
        orderBy: { usageCount: 'desc' },
        take: 5,
        select: { id: true, key: true, name: true, usageCount: true },
      }),
      [],
    ),
  ])

  const dbError = !statsCurrent.ok || !recentData.ok

  return (
    <>
      <AdminHeader breadcrumbs={[{ label: 'Comunicaciones' }]} />

      <ComunicacionesContent
        statsCurrent={statsCurrent.value}
        statsPrev={statsPrev.value}
        recentMessages={recentData.value.messages}
        templatesCount={templatesCount.value}
        topTemplates={topTemplates.value}
        currentRange={current}
        isDefaultRange={isDefault}
        currentStartDate={params.startDate}
        currentEndDate={params.endDate}
        dbError={dbError}
      />
    </>
  )
}
