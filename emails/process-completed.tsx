import * as React from 'react'
import { BrandedLayout } from './components/branded-layout'
import {
  SectionHeading,
  Paragraph,
  KpiGrid,
  StatsList,
  CtaButton,
  ItemList,
  Callout,
} from './components/ui'

export interface ProcessCompletedEmailProps {
  startDate: string
  endDate: string
  reportsStats?: {
    totalRows: number
    dataRows: number
    processedRanges: number
  }
  driversStats?: {
    successful: number
    failed: number
    total: number
    errors?: Array<{ driver: string; error: string }>
  }
  spreadsheetUrl?: string
}

export default function ProcessCompletedEmail({
  startDate,
  endDate,
  reportsStats,
  driversStats,
  spreadsheetUrl,
}: ProcessCompletedEmailProps) {
  const successRate = driversStats && driversStats.total > 0
    ? Math.round((driversStats.successful / driversStats.total) * 100)
    : null

  return (
    <BrandedLayout
      preview={`Proceso completado ${startDate} → ${endDate}`}
      headerTitle="Proceso completado"
    >
      <SectionHeading tone="success">✅ Proceso completado exitosamente</SectionHeading>
      <Paragraph muted>
        Rango procesado: <strong>{startDate}</strong> → <strong>{endDate}</strong>
      </Paragraph>

      {reportsStats && (
        <>
          <SectionHeading>📊 Reporte de pagos</SectionHeading>
          <KpiGrid
            items={[
              { label: 'Rangos procesados', value: reportsStats.processedRanges, tone: 'brand' },
              { label: 'Total de filas', value: reportsStats.totalRows, tone: 'info' },
              { label: 'Filas de datos', value: reportsStats.dataRows, tone: 'success' },
            ]}
          />
        </>
      )}

      {driversStats && (
        <>
          <SectionHeading>🚗 Conductores externos</SectionHeading>
          <KpiGrid
            items={[
              { label: 'Exitosos', value: driversStats.successful, tone: 'success' },
              { label: 'Fallidos', value: driversStats.failed, tone: driversStats.failed > 0 ? 'danger' : 'neutral' },
              { label: 'Total', value: driversStats.total, tone: 'info' },
              ...(successRate !== null
                ? [{ label: 'Tasa de éxito', value: `${successRate}%`, tone: 'brand' as const }]
                : []),
            ]}
          />

          {driversStats.errors && driversStats.errors.length > 0 && (
            <Callout tone="danger" title={`⚠️ ${driversStats.errors.length} conductor(es) con errores`}>
              <ItemList
                items={driversStats.errors.slice(0, 10).map((e) => ({
                  primary: e.driver,
                  secondary: e.error,
                  badge: { text: 'Error', tone: 'danger' },
                }))}
              />
              {driversStats.errors.length > 10 && (
                <Paragraph muted>... y {driversStats.errors.length - 10} más</Paragraph>
              )}
            </Callout>
          )}
        </>
      )}

      {spreadsheetUrl && (
        <CtaButton href={spreadsheetUrl} tone="brand">
          📊 Ver reporte en Google Sheets
        </CtaButton>
      )}

      {!reportsStats && !driversStats && (
        <StatsList items={[{ label: 'Estado', value: 'Completado sin métricas' }]} />
      )}
    </BrandedLayout>
  )
}
