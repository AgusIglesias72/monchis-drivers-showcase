// app/admin/comunicaciones/historial/page.tsx

import { AdminHeader } from '@/components/admin/admin-header'
import { MessagesHistoryContent } from '@/components/admin/comunicacion/MessagesHistoryContent'
import {
  getMessagesWithFilters,
  getMessageStats,
  type MessageStats,
} from '@/lib/services/messages-history.service'
import type { WhatsAppMessageStatus, WhatsAppMessageSource, WhatsAppMessageType } from '@prisma/client'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

function parseYmd(s?: string): Date | undefined {
  if (!s) return undefined
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (!m) return undefined
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

function resolveRanges(startStr?: string, endStr?: string) {
  const now = new Date()
  let from: Date
  let to: Date

  if (startStr || endStr) {
    from = parseYmd(startStr) ?? new Date(now.getTime() - 24 * 60 * 60 * 1000)
    to = parseYmd(endStr) ?? now
    if (startStr) from.setHours(0, 0, 0, 0)
    if (endStr) to.setHours(23, 59, 59, 999)
    if (!endStr) to.setHours(23, 59, 59, 999)
    if (!startStr) from = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 0, 0, 0, 0)
  } else {
    from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
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
    console.error('[historial page] query failed:', err instanceof Error ? err.message : err)
    return { value: fallback, ok: false }
  }
}

export default async function HistorialMensajesPage({ searchParams }: PageProps) {
  const params = await searchParams

  // Filtros
  const page = parseInt((params.page as string) || '1', 10)
  const pageSize = 20
  const search = (params.search as string) || undefined
  const messageType = (params.messageType as WhatsAppMessageType) || undefined
  const status = (params.status as WhatsAppMessageStatus) || undefined
  const source = (params.source as WhatsAppMessageSource) || undefined

  const startStr = params.dateFrom as string | undefined
  const endStr = params.dateTo as string | undefined
  const { current, previous, isDefault } = resolveRanges(startStr, endStr)

  const [messagesResult, statsCurrent, statsPrev] = await Promise.all([
    safe(
      getMessagesWithFilters(
        { search, messageType, status, source, dateFrom: current.from, dateTo: current.to },
        { page, pageSize },
      ),
      {
        messages: [],
        pagination: { page: 1, pageSize, total: 0, totalPages: 0 },
      },
    ),
    safe(getMessageStats({ dateFrom: current.from, dateTo: current.to }), EMPTY_STATS),
    safe(getMessageStats({ dateFrom: previous.from, dateTo: previous.to }), EMPTY_STATS),
  ])

  const dbError = !messagesResult.ok || !statsCurrent.ok

  return (
    <>
      <AdminHeader
        breadcrumbs={[
          { label: 'Comunicaciones', href: '/admin/comunicaciones' },
          { label: 'Historial' },
        ]}
      />

      <MessagesHistoryContent
        messages={messagesResult.value.messages as any}
        pagination={messagesResult.value.pagination}
        statsCurrent={statsCurrent.value}
        statsPrev={statsPrev.value}
        currentRange={current}
        isDefaultRange={isDefault}
        filters={{
          search,
          messageType,
          status,
          source,
          dateFrom: startStr,
          dateTo: endStr,
        }}
        dbError={dbError}
      />
    </>
  )
}
