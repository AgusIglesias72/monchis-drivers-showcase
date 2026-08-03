// components/admin/comunicacion/ComunicacionesContent.tsx

import Link from 'next/link'
import { formatDistanceToNow, format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  ArrowUpRight,
  FileText,
  Send,
  FlaskConical,
  History,
  Plus,
  TrendingUp,
  TrendingDown,
  Minus,
  DatabaseZap,
} from 'lucide-react'
import type { WhatsAppMessageStatus } from '@prisma/client'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { BotPanel } from './BotPanel'
import { ComunicacionesDateFilter } from './comunicaciones-date-filter'

interface MessageStatsLike {
  total: number
  successful: number
  failed: number
  successRate: string
}

interface RecentMessage {
  id: string
  recipientName: string
  recipientPhone: string
  messageType: string
  status: WhatsAppMessageStatus
  sentAt: Date
  metadata: any
  formDriver: { id: string; fullName: string | null } | null
}

interface TopTemplate {
  id: string
  key: string
  name: string
  usageCount: number
}

interface Props {
  statsCurrent: MessageStatsLike
  statsPrev: MessageStatsLike
  recentMessages: RecentMessage[]
  templatesCount: number
  topTemplates: TopTemplate[]
  currentRange: { from: Date; to: Date }
  isDefaultRange: boolean
  currentStartDate?: string
  currentEndDate?: string
  dbError: boolean
}

const BOT_ID = 'whatsapp-bot'

const statusCopy: Record<string, { label: string; tone: 'ok' | 'pending' | 'bad' }> = {
  SENT: { label: 'Enviado', tone: 'ok' },
  DELIVERED: { label: 'Entregado', tone: 'ok' },
  READ: { label: 'Leído', tone: 'ok' },
  SENDING: { label: 'Enviando', tone: 'pending' },
  FAILED: { label: 'Falló', tone: 'bad' },
  PENDING: { label: 'Pendiente', tone: 'pending' },
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('595') && digits.length >= 11) {
    return `+595 ${digits.slice(3, 6)} ${digits.slice(6, 9)}-${digits.slice(9)}`
  }
  if (digits.startsWith('54') && digits.length >= 12) {
    return `+54 9 ${digits.slice(2, 4)} ${digits.slice(4, 8)}-${digits.slice(8)}`
  }
  return `+${digits}`
}

function rangeLabel(range: { from: Date; to: Date }, isDefault: boolean): string {
  if (isDefault) return 'últimas 24h'
  const sameYear = range.from.getFullYear() === range.to.getFullYear()
  const sameDay =
    sameYear &&
    range.from.getMonth() === range.to.getMonth() &&
    range.from.getDate() === range.to.getDate()
  if (sameDay) return format(range.from, "d 'de' MMM", { locale: es })
  return `${format(range.from, 'd MMM', { locale: es })} – ${format(range.to, 'd MMM', { locale: es })}`
}

function computeDelta(curr: number, prev: number): {
  pct: number | null
  direction: 'up' | 'down' | 'flat'
} {
  if (prev === 0 && curr === 0) return { pct: null, direction: 'flat' }
  if (prev === 0) return { pct: null, direction: 'up' } // de 0 a algo: no calculamos %
  const change = ((curr - prev) / prev) * 100
  if (Math.abs(change) < 1) return { pct: 0, direction: 'flat' }
  return {
    pct: Math.abs(Math.round(change)),
    direction: change > 0 ? 'up' : 'down',
  }
}

function groupByDay(messages: RecentMessage[]) {
  const groups = new Map<string, RecentMessage[]>()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  for (const m of messages) {
    const d = new Date(m.sentAt)
    let label: string
    if (d >= today) label = 'Hoy'
    else if (d >= yesterday) label = 'Ayer'
    else label = format(d, "EEEE d 'de' MMMM", { locale: es })
    const cap = label.charAt(0).toUpperCase() + label.slice(1)
    if (!groups.has(cap)) groups.set(cap, [])
    groups.get(cap)!.push(m)
  }
  return Array.from(groups.entries())
}

export function ComunicacionesContent({
  statsCurrent,
  statsPrev,
  recentMessages,
  templatesCount,
  topTemplates,
  currentRange,
  isDefaultRange,
  currentStartDate,
  currentEndDate,
  dbError,
}: Props) {
  const sentDelta = computeDelta(statsCurrent.total, statsPrev.total)
  const periodLabel = rangeLabel(currentRange, isDefaultRange)
  const groupedMessages = groupByDay(recentMessages)

  return (
    <div className="container mx-auto px-6 py-8 space-y-8">
      {dbError && (
        <Alert variant="destructive">
          <DatabaseZap className="h-4 w-4" />
          <AlertTitle>No pudimos conectar con la base de datos</AlertTitle>
          <AlertDescription>
            Las métricas y mensajes recientes pueden estar vacíos hasta que la
            DB vuelva. El bot y los envíos no se ven afectados directamente,
            pero los logs no se persisten mientras la conexión esté caída.
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Comunicaciones</h1>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-xl">
            Bot único de WhatsApp para mensajes automáticos a postulantes. El
            contenido vive en plantillas que editás abajo.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/admin/plantillas-whatsapp">
              <FileText className="mr-2 h-4 w-4" />
              Plantillas
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/comunicaciones/masivo">
              <Send className="mr-2 h-4 w-4" />
              Envío masivo
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/admin/comunicaciones/pruebas?bot=${BOT_ID}`}>
              <FlaskConical className="mr-2 h-4 w-4" />
              Probar
            </Link>
          </Button>
        </div>
      </header>

      {/* Sub-header: rango + filtro */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-y py-3">
        <div className="text-xs text-muted-foreground">
          Métricas de{' '}
          <span className="font-medium text-foreground">{periodLabel}</span>
        </div>
        <ComunicacionesDateFilter
          currentStartDate={currentStartDate}
          currentEndDate={currentEndDate}
        />
      </div>

      {/* KPI strip */}
      <section className="grid grid-cols-2 gap-x-8 gap-y-6 pb-6 border-b sm:grid-cols-4">
        <Kpi
          label="Enviados"
          value={statsCurrent.total.toLocaleString('es-AR')}
          delta={sentDelta}
          prevValue={statsPrev.total}
        />
        <Kpi
          label="Tasa de éxito"
          value={`${parseFloat(statsCurrent.successRate).toFixed(0)}%`}
          hint={
            statsCurrent.total === 0
              ? 'sin datos en el período'
              : `${statsCurrent.successful} de ${statsCurrent.total}`
          }
          tone={
            statsCurrent.total > 0 && statsCurrent.failed > 0 && parseFloat(statsCurrent.successRate) < 90
              ? 'warn'
              : 'default'
          }
        />
        <Kpi
          label="Fallidos"
          value={statsCurrent.failed.toLocaleString('es-AR')}
          hint={
            statsCurrent.failed === 0
              ? 'todo OK'
              : statsPrev.failed > 0
              ? `${statsPrev.failed} en el período anterior`
              : 'ninguno en período anterior'
          }
          tone={statsCurrent.failed > 0 ? 'warn' : 'default'}
        />
        <Kpi
          label="Plantillas activas"
          value={templatesCount.toString()}
          hint={
            <Link
              href="/admin/plantillas-whatsapp"
              className="inline-flex items-center gap-0.5 text-foreground/70 hover:text-foreground"
            >
              gestionar <ArrowUpRight className="h-3 w-3" />
            </Link>
          }
        />
      </section>

      {/* Main grid */}
      <section className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        {/* Mensajes recientes */}
        <div>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-base font-semibold">Últimos envíos</h2>
            <Link
              href="/admin/comunicaciones/historial"
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5"
            >
              Ver historial completo <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          {recentMessages.length === 0 ? (
            <EmptyMessages />
          ) : (
            <div className="space-y-6">
              {groupedMessages.map(([day, msgs]) => (
                <div key={day}>
                  <h3 className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground/70 font-medium">
                    {day}
                  </h3>
                  <ul className="divide-y border-y">
                    {msgs.map(msg => (
                      <MessageRow key={msg.id} msg={msg} />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-8">
          <BotPanel botId={BOT_ID} />

          <div>
            <h2 className="mb-3 text-base font-semibold">Plantillas más usadas</h2>
            {topTemplates.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-xs text-muted-foreground">
                Cuando el bot empiece a mandar mensajes vas a ver acá las plantillas con más uso.
              </div>
            ) : (
              <ul className="divide-y border-y">
                {topTemplates.map(t => (
                  <li key={t.id} className="flex items-center justify-between py-2.5">
                    <div className="min-w-0">
                      <div className="text-sm truncate" title={t.name}>
                        {t.name}
                      </div>
                      <code className="text-[11px] text-muted-foreground">{t.key}</code>
                    </div>
                    <span className="text-sm tabular-nums font-medium">{t.usageCount}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3 flex gap-2">
              <Button asChild variant="outline" size="sm" className="flex-1">
                <Link href="/admin/plantillas-whatsapp">
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Nueva
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="flex-1">
                <Link href="/admin/comunicaciones/historial">
                  <History className="mr-1 h-3.5 w-3.5" />
                  Historial
                </Link>
              </Button>
            </div>
          </div>
        </aside>
      </section>
    </div>
  )
}

function Kpi({
  label,
  value,
  hint,
  delta,
  prevValue,
  tone = 'default',
}: {
  label: string
  value: string
  hint?: React.ReactNode
  delta?: { pct: number | null; direction: 'up' | 'down' | 'flat' }
  prevValue?: number
  tone?: 'default' | 'ok' | 'warn'
}) {
  const valueColor = tone === 'warn' ? 'text-amber-600 dark:text-amber-500' : 'text-foreground'
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground/80 font-medium">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <div className={`text-3xl font-semibold tabular-nums ${valueColor}`}>{value}</div>
        {delta && <DeltaBadge delta={delta} />}
      </div>
      {delta ? (
        <div className="mt-0.5 text-xs text-muted-foreground tabular-nums">
          {prevValue !== undefined
            ? `vs ${prevValue.toLocaleString('es-AR')} en período anterior`
            : null}
        </div>
      ) : hint != null ? (
        <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>
      ) : null}
    </div>
  )
}

function DeltaBadge({
  delta,
}: {
  delta: { pct: number | null; direction: 'up' | 'down' | 'flat' }
}) {
  if (delta.direction === 'flat' && delta.pct === null) return null
  const Icon =
    delta.direction === 'up' ? TrendingUp : delta.direction === 'down' ? TrendingDown : Minus
  const color =
    delta.direction === 'up'
      ? 'text-emerald-600 dark:text-emerald-500'
      : delta.direction === 'down'
      ? 'text-red-600 dark:text-red-500'
      : 'text-muted-foreground'
  const text =
    delta.pct === null
      ? delta.direction === 'up'
        ? 'nuevo'
        : '—'
      : `${delta.pct}%`
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium tabular-nums ${color}`}>
      <Icon className="h-3 w-3" />
      {text}
    </span>
  )
}

function MessageRow({ msg }: { msg: RecentMessage }) {
  const status = statusCopy[msg.status] ?? { label: msg.status, tone: 'pending' as const }
  const time = format(new Date(msg.sentAt), 'HH:mm', { locale: es })
  const templateKey = (msg.metadata as any)?.templateKey as string | undefined
  const displayName = msg.formDriver?.fullName || msg.recipientName || 'Sin nombre'
  const driverHref = msg.formDriver?.id ? `/admin/postulaciones/${msg.formDriver.id}` : null

  return (
    <li className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 py-3 text-sm">
      <span className="tabular-nums text-xs text-muted-foreground w-10">{time}</span>
      <div className="min-w-0">
        <div className="truncate font-medium">
          {driverHref ? (
            <Link href={driverHref} className="hover:underline">
              {displayName}
            </Link>
          ) : (
            displayName
          )}
        </div>
        <div className="text-xs text-muted-foreground tabular-nums">{formatPhone(msg.recipientPhone)}</div>
      </div>
      <code className="hidden sm:inline text-xs text-muted-foreground">
        {templateKey || msg.messageType.toLowerCase()}
      </code>
      <StatusDot tone={status.tone} label={status.label} />
    </li>
  )
}

function StatusDot({ tone, label }: { tone: 'ok' | 'pending' | 'bad'; label: string }) {
  const color =
    tone === 'ok' ? 'bg-emerald-500' : tone === 'bad' ? 'bg-red-500' : 'bg-amber-500'
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={`h-1.5 w-1.5 rounded-full ${color}`} aria-hidden />
      <span>{label}</span>
    </span>
  )
}

function EmptyMessages() {
  return (
    <div className="rounded-md border border-dashed py-12 text-center">
      <p className="text-sm font-medium">No se envió ningún mensaje todavía</p>
      <p className="mt-1 text-xs text-muted-foreground max-w-md mx-auto">
        Cuando el bot mande el primer mensaje (form completado, documentos aprobados o un envío manual), va a aparecer acá.
      </p>
      <div className="mt-4 flex justify-center gap-2">
        <Button asChild size="sm" variant="outline">
          <Link href={`/admin/comunicaciones/pruebas?bot=${BOT_ID}`}>Probar un envío</Link>
        </Button>
      </div>
    </div>
  )
}

// Helper si más adelante necesitamos formatear el "hace X" del último envío.
export function lastSentLabel(d?: Date) {
  if (!d) return null
  return formatDistanceToNow(d, { addSuffix: true, locale: es })
}
