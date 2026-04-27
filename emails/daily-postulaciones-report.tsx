import * as React from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { BrandedLayout } from './components/branded-layout'
import {
  SectionHeading,
  Paragraph,
  KpiGrid,
  StatsList,
  ItemList,
} from './components/ui'
import type { DailyReportData } from '@/lib/services/daily-report.service'
import type { FormDriverStatus } from '@prisma/client'
import type { Tone } from './components/ui'

export interface DailyPostulacionesReportEmailProps {
  data: DailyReportData
}

// Labels amigables por estado (matching enum en schema.prisma)
const STATUS_LABELS: Record<FormDriverStatus, string> = {
  IN_PROGRESS: 'En progreso',
  COMPLETED: 'Form completado',
  ABANDONED: 'Abandonadas',
  SUBMITTED: 'Enviadas',
  UNDER_REVIEW: 'En revisión',
  DOCS_PENDING: 'Docs pendientes',
  APPROVED: 'Aprobadas',
  READY_ONBOARDING: 'Listas p/ onboarding',
  ONBOARDING: 'En onboarding',
  ACTIVE: 'Activas',
  REJECTED: 'Rechazadas',
}

const STATUS_TONES: Record<FormDriverStatus, Tone> = {
  IN_PROGRESS: 'info',
  COMPLETED: 'info',
  ABANDONED: 'neutral',
  SUBMITTED: 'brand',
  UNDER_REVIEW: 'warning',
  DOCS_PENDING: 'warning',
  APPROVED: 'success',
  READY_ONBOARDING: 'success',
  ONBOARDING: 'success',
  ACTIVE: 'success',
  REJECTED: 'danger',
}

export default function DailyPostulacionesReportEmail({
  data,
}: DailyPostulacionesReportEmailProps) {
  const dateStr = format(data.reportDate, "EEEE d 'de' MMMM", { locale: es })
  const dateStrShort = format(data.reportDate, 'dd/MM/yyyy')
  const monthStr = format(data.reportDate, 'MMMM yyyy', { locale: es })

  // Orden relevante para mostrar en breakdown (filtramos los que están en 0 para no saturar)
  const breakdownOrder: FormDriverStatus[] = [
    'IN_PROGRESS',
    'SUBMITTED',
    'UNDER_REVIEW',
    'DOCS_PENDING',
    'APPROVED',
    'READY_ONBOARDING',
    'ONBOARDING',
    'ACTIVE',
    'REJECTED',
    'ABANDONED',
    'COMPLETED',
  ]

  const visibleBreakdown = breakdownOrder
    .filter((s) => data.statusBreakdown[s] > 0)
    .map((s) => ({
      label: STATUS_LABELS[s],
      value: data.statusBreakdown[s],
      tone: STATUS_TONES[s],
    }))

  return (
    <BrandedLayout
      preview={`Reporte diario ${dateStrShort} — ${data.newPostulaciones} postulaciones nuevas`}
      headerTitle="Reporte diario de postulaciones"
    >
      <SectionHeading tone="brand">
        📋 Cierre del día — {dateStr}
      </SectionHeading>
      <Paragraph muted>
        Resumen de la actividad de postulaciones correspondiente al día{' '}
        <strong>{dateStrShort}</strong>.
      </Paragraph>

      {/* KPIs del día */}
      <SectionHeading>🔥 Movimientos del día</SectionHeading>
      <KpiGrid
        items={[
          {
            label: 'Nuevas postulaciones',
            value: data.newPostulaciones,
            tone: data.newPostulaciones > 0 ? 'brand' : 'neutral',
          },
          {
            label: 'Formularios completados',
            value: data.completedToday,
            tone: 'info',
          },
          {
            label: 'Aprobadas',
            value: data.approvedToday,
            tone: data.approvedToday > 0 ? 'success' : 'neutral',
          },
          {
            label: 'Listas p/ onboarding',
            value: data.readyForOnboarding,
            tone: data.readyForOnboarding > 0 ? 'success' : 'neutral',
          },
        ]}
      />

      {/* Detalle de postulaciones nuevas */}
      {data.newPostulacionesList.length > 0 && (
        <>
          <SectionHeading>
            👤 Postulaciones nuevas del día ({data.newPostulacionesList.length}
            {data.newPostulacionesList.length === 20 ? '+' : ''})
          </SectionHeading>
          <ItemList
            items={data.newPostulacionesList.map((p) => ({
              primary: p.fullName,
              secondary: `${p.phoneNumber} · ${format(p.createdAt, 'HH:mm')}`,
              href: p.adminUrl,
              badge: {
                text: STATUS_LABELS[p.status],
                tone: STATUS_TONES[p.status],
              },
            }))}
          />
        </>
      )}

      {data.newPostulacionesList.length === 0 && data.newPostulaciones === 0 && (
        <Paragraph muted>
          <em>Sin postulaciones nuevas en el día.</em>
        </Paragraph>
      )}

      {/* Desglose total por estado (snapshot actual) */}
      <SectionHeading>📊 Estado actual de postulaciones</SectionHeading>
      <Paragraph muted>
        Distribución actual de todas las postulaciones en el sistema.
      </Paragraph>
      <StatsList items={visibleBreakdown} />

      {/* Totales del mes */}
      <SectionHeading>📅 Acumulado de {monthStr}</SectionHeading>
      <KpiGrid
        items={[
          { label: 'Nuevas del mes', value: data.monthNewPostulaciones, tone: 'brand' },
          { label: 'Aprobadas del mes', value: data.monthApproved, tone: 'success' },
          { label: 'Activas hoy', value: data.monthActive, tone: 'info' },
        ]}
      />
    </BrandedLayout>
  )
}
