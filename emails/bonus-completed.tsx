import * as React from 'react'
import { BrandedLayout } from './components/branded-layout'
import {
  SectionHeading,
  Paragraph,
  KpiGrid,
  StatsList,
  Callout,
  ItemList,
} from './components/ui'
import { BRAND } from '@/lib/config/notifications.config'

export interface BonusCompletedEmailProps {
  bonusDate: string
  executionMode: 'DRY_RUN' | 'EXECUTE'
  stats: {
    totalOrders: number
    driversProcessed: number
    extrasCreated: number
    assignmentsSuccessful: number
    assignmentsFailed: number
    totalPayoutAmount: number
  }
  errors?: Array<{ driver: string; error: string }>
}

export default function BonusCompletedEmail({
  bonusDate,
  executionMode,
  stats,
  errors,
}: BonusCompletedEmailProps) {
  const isDryRun = executionMode === 'DRY_RUN'
  const hasErrors = errors && errors.length > 0

  const formatGs = (n: number) => `${n.toLocaleString('es-PY')} Gs`

  return (
    <BrandedLayout
      preview={`${isDryRun ? '[DRY RUN] ' : ''}Bonos ${bonusDate} — ${stats.driversProcessed} conductores`}
      headerTitle={isDryRun ? 'Bonos — Simulación' : 'Bonos procesados'}
      headerAccent={isDryRun ? BRAND.warning : BRAND.primary}
    >
      <SectionHeading tone={isDryRun ? 'warning' : 'success'}>
        {isDryRun ? '🏃 Simulación de bonos (DRY RUN)' : '✅ Bonos procesados exitosamente'}
      </SectionHeading>
      <Paragraph muted>
        Fecha de bonos: <strong>{bonusDate}</strong>
      </Paragraph>

      <SectionHeading>📊 Resumen del proceso</SectionHeading>
      <KpiGrid
        items={[
          { label: 'Pedidos', value: stats.totalOrders, tone: 'info' },
          { label: 'Conductores', value: stats.driversProcessed, tone: 'brand' },
          {
            label: isDryRun ? 'Extras a crear' : 'Extras creados',
            value: stats.extrasCreated,
            tone: 'success',
          },
          {
            label: 'Asignaciones OK',
            value: stats.assignmentsSuccessful,
            tone: 'success',
          },
        ]}
      />

      <StatsList
        items={[
          ...(stats.assignmentsFailed > 0
            ? [{
                label: '❌ Asignaciones fallidas',
                value: stats.assignmentsFailed,
                tone: 'danger' as const,
              }]
            : []),
          {
            label: '💰 Total a pagar',
            value: formatGs(stats.totalPayoutAmount),
            highlight: true,
            tone: 'brand',
          },
        ]}
      />

      {isDryRun && (
        <Callout tone="warning" title="Modo DRY RUN activo">
          Esta fue una simulación: no se crearon extras ni se asignaron bonos reales. Para ejecutar en producción, cambiá <code style={codeStyle}>executionMode</code> a <code style={codeStyle}>EXECUTE</code>.
        </Callout>
      )}

      {hasErrors && errors && (
        <Callout tone="danger" title={`${errors.length} error(es) encontrados`}>
          <ItemList
            items={errors.slice(0, 10).map((e) => ({
              primary: e.driver,
              secondary: e.error,
              badge: { text: 'Error', tone: 'danger' },
            }))}
          />
          {errors.length > 10 && <Paragraph muted>... y {errors.length - 10} más</Paragraph>}
        </Callout>
      )}
    </BrandedLayout>
  )
}

const codeStyle: React.CSSProperties = {
  backgroundColor: '#f3f4f6',
  padding: '2px 6px',
  borderRadius: '4px',
  fontSize: '12px',
  fontFamily: 'monospace',
}
