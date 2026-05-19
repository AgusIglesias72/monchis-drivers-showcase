// components/admin/onboarding/onboarding-event-content.tsx

"use client"

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Settings,
  UserPlus,
  List,
  Video,
  Zap,
  Settings2,
  ExternalLink,
  CheckCircle,
  XCircle,
  Edit,
  History,
} from 'lucide-react'
import { AdminHeader } from '@/components/admin/admin-header'
import { AddDriversWrapper } from '@/components/admin/onboarding/add-drivers-wrapper'
import { AttendeesManagementSection } from '@/components/admin/onboarding/attendees-management-section'
import { EventSettingsSection } from '@/components/admin/onboarding/event-settings-section'
import { getEventStatusLabel } from '@/types/onboarding'
import { MODALITY_LABEL } from '@/lib/types/onboarding-rules.types'
import type { OnboardingModality } from '@prisma/client'

const MODALITY_ICON = {
  IN_PERSON: MapPin,
  VIRTUAL: Video,
  HYBRID: Zap,
} as const

const MODALITY_BADGE_CLASS: Record<OnboardingModality, string> = {
  IN_PERSON: 'bg-muted text-foreground',
  VIRTUAL: 'bg-info-soft text-info',
  HYBRID: 'bg-violet-100 text-violet-700',
}

const STATUS_BADGE: Record<string, { className: string; icon: React.ReactNode; label: string }> = {
  DRAFT: {
    className: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: <Edit className="h-3 w-3" />,
    label: getEventStatusLabel('DRAFT' as any),
  },
  SCHEDULED: {
    className: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: <Calendar className="h-3 w-3" />,
    label: getEventStatusLabel('SCHEDULED' as any),
  },
  IN_PROGRESS: {
    className: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: <Clock className="h-3 w-3" />,
    label: getEventStatusLabel('IN_PROGRESS' as any),
  },
  COMPLETED: {
    className: 'bg-green-100 text-green-800 border-green-200',
    icon: <CheckCircle className="h-3 w-3" />,
    label: getEventStatusLabel('COMPLETED' as any),
  },
  CANCELLED: {
    className: 'bg-red-100 text-red-800 border-red-200',
    icon: <XCircle className="h-3 w-3" />,
    label: getEventStatusLabel('CANCELLED' as any),
  },
  POSTPONED: {
    className: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: <Clock className="h-3 w-3" />,
    label: getEventStatusLabel('POSTPONED' as any),
  },
  PAST: {
    className: 'bg-gray-100 text-gray-600 border-gray-300',
    icon: <History className="h-3 w-3" />,
    label: 'Pasado',
  },
}

interface OnboardingEventContentProps {
  event: any
  initialEligibleDrivers: any[]
  initialPagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasMore: boolean
  }
}

function formatDate(dateStr: string | Date) {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
  return date.toLocaleDateString('es-PY', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatDayNum(dateStr: string | Date) {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
  return date.toLocaleDateString('es-PY', { day: '2-digit' })
}

function formatMonthShort(dateStr: string | Date) {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
  return date.toLocaleDateString('es-PY', { month: 'short' }).replace('.', '').toUpperCase()
}

function formatWeekdayLong(dateStr: string | Date) {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
  const wd = date.toLocaleDateString('es-PY', { weekday: 'long' })
  return wd.charAt(0).toUpperCase() + wd.slice(1)
}

function getEffectiveStatus(event: any): keyof typeof STATUS_BADGE {
  const now = new Date()
  const eventDate = new Date(event.scheduledDate)
  let eventDateTime = eventDate
  if (event.startTime) {
    const [hours, minutes] = event.startTime.split(':').map(Number)
    eventDateTime = new Date(eventDate)
    eventDateTime.setHours(hours, minutes || 0, 0, 0)
  }
  const isPast = eventDateTime < now
  if (event.status === 'SCHEDULED' && isPast) return 'PAST'
  return event.status
}

export function OnboardingEventContent({
  event,
  initialEligibleDrivers,
  initialPagination,
}: OnboardingEventContentProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'attendees' | 'add' | 'settings'>('attendees')

  const handleRefresh = () => router.refresh()

  const modality: OnboardingModality | null =
    (event.modality as OnboardingModality | null) ??
    (event.scheduleRule?.modality as OnboardingModality | null) ??
    null
  const ModalityIcon = modality ? MODALITY_ICON[modality] : null

  const effectiveStatus = getEffectiveStatus(event)
  const statusCfg = STATUS_BADGE[effectiveStatus] || STATUS_BADGE.DRAFT
  const isFull =
    event.maxCapacity !== null &&
    event.maxCapacity !== undefined &&
    event.currentCapacity >= event.maxCapacity

  const rule = event.scheduleRule

  return (
    <div className="flex flex-1 flex-col container mx-auto">
      <AdminHeader
        breadcrumbs={[
          { label: 'Capacitaciones', href: '/admin/onboarding?tab=eventos' },
          { label: event.title || formatDate(event.scheduledDate) },
        ]}
      />

      <div className="flex-1 p-4 md:p-8 space-y-6">
        {/* Hero del evento */}
        <Card className="overflow-hidden">
          <CardContent className="p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start">
              {/* Tile calendario */}
              <div className="flex h-16 w-16 flex-shrink-0 flex-col rounded-md border bg-background overflow-hidden">
                <div className="bg-muted text-[10px] font-semibold uppercase tracking-wide text-muted-foreground text-center leading-[16px]">
                  {formatMonthShort(event.scheduledDate)}
                </div>
                <div className="flex-1 flex items-center justify-center text-xl font-bold leading-none">
                  {formatDayNum(event.scheduledDate)}
                </div>
              </div>

              {/* Info principal */}
              <div className="flex-1 min-w-0 space-y-3">
                <div>
                  <h1 className="text-xl md:text-2xl font-bold tracking-tight">
                    {event.title || 'Evento de On Boarding'}
                  </h1>
                  <div className="text-sm text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span>{formatWeekdayLong(event.scheduledDate)}</span>
                    <span className="text-muted-foreground/50">·</span>
                    <span className="tabular-nums">{formatDate(event.scheduledDate)}</span>
                    <span className="text-muted-foreground/50">·</span>
                    <Clock className="h-3.5 w-3.5" />
                    <span className="tabular-nums">
                      {event.startTime}
                      {event.endTime && ` – ${event.endTime}`}
                    </span>
                  </div>
                </div>

                {event.description && (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{event.description}</p>
                )}

                {/* Badges fila */}
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={`gap-1 ${statusCfg.className}`}>
                    {statusCfg.icon}
                    {statusCfg.label}
                  </Badge>

                  {modality && ModalityIcon && (
                    <Badge className={`${MODALITY_BADGE_CLASS[modality]} gap-1`} variant="secondary">
                      <ModalityIcon className="h-3 w-3" />
                      {MODALITY_LABEL[modality]}
                    </Badge>
                  )}

                  {event.location && (
                    <Badge variant="outline" className="gap-1">
                      <MapPin className="h-3 w-3" />
                      {event.location}
                    </Badge>
                  )}

                  <Badge variant="outline" className="gap-1">
                    <Users className="h-3 w-3" />
                    <span className="tabular-nums">
                      {event.currentCapacity}
                      {event.maxCapacity && `/${event.maxCapacity}`}
                    </span>
                    {isFull && <span className="ml-1 text-destructive">· Lleno</span>}
                  </Badge>

                  {rule ? (
                    <Link
                      href={`/admin/onboarding/reglas/${rule.slug}`}
                      className="inline-block"
                    >
                      <Badge
                        variant="secondary"
                        className="bg-info-soft text-info hover:opacity-90 gap-1"
                      >
                        <Settings2 className="h-3 w-3" />
                        <span className="truncate max-w-[220px]">{rule.title}</span>
                      </Badge>
                    </Link>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                      Manual
                    </Badge>
                  )}
                </div>

                {/* Acciones secundarias (links externos) */}
                {event.meetingLink && (
                  <Button asChild variant="outline" size="sm" className="cursor-pointer">
                    <a
                      href={event.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                      Abrir enlace de reunión
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs estilo solapas (patrón postulaciones). Los sub-componentes ya
            traen su propio <Card>, así que en vez de envolver todo en otra Card
            usamos una "connector line" 1px que el tab activo (z-10) cubre. */}
        <div>
          <div
            role="tablist"
            aria-label="Secciones del evento"
            className="flex items-end gap-1 overflow-x-auto pb-0 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full"
          >
            {([
              { key: 'attendees', label: 'Participantes', icon: List, count: event.attendees.length },
              { key: 'add', label: 'Agregar drivers', icon: UserPlus, count: undefined },
              { key: 'settings', label: 'Configuración', icon: Settings, count: undefined },
            ] as const).map(({ key, label, icon: Icon, count }) => {
              const active = activeTab === key
              return (
                <button
                  key={key}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(key as typeof activeTab)}
                  className={`flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-t-lg border border-b-0 transition-all text-xs font-medium whitespace-nowrap cursor-pointer flex-shrink-0 ${
                    active
                      ? 'bg-background border-border shadow-sm text-foreground relative z-10'
                      : 'bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50'
                  }`}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span>{label}</span>
                  {count !== undefined && (
                    <Badge
                      variant="secondary"
                      className="ml-1 h-5 min-w-5 px-1.5 text-xs font-semibold flex-shrink-0"
                    >
                      {count}
                    </Badge>
                  )}
                </button>
              )
            })}
          </div>

          {/* Connector line: 1px que conecta visualmente los tabs con el contenido.
              El tab activo (z-10) la cubre donde sienta. */}
          <div className="h-px bg-border" />

          {/* Contenido de la solapa activa */}
          <div className="mt-4">
            {activeTab === 'attendees' && (
              <AttendeesManagementSection
                eventId={event.id}
                event={event}
                attendees={event.attendees}
                onRefresh={handleRefresh}
              />
            )}
            {activeTab === 'add' && (
              <AddDriversWrapper
                eventId={event.id}
                initialDrivers={initialEligibleDrivers}
                initialPagination={initialPagination}
                onSuccess={() => {
                  handleRefresh()
                  setActiveTab('attendees')
                }}
              />
            )}
            {activeTab === 'settings' && (
              <EventSettingsSection event={event} onUpdate={handleRefresh} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
