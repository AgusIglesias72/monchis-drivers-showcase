import * as React from 'react'
import { BrandedLayout } from './components/branded-layout'
import { SectionHeading, Paragraph, Callout } from './components/ui'
import { BRAND } from '@/lib/config/notifications.config'

export interface ProcessFailedEmailProps {
  startDate: string
  endDate: string
  error: string
}

export default function ProcessFailedEmail({ startDate, endDate, error }: ProcessFailedEmailProps) {
  return (
    <BrandedLayout
      preview={`❌ Proceso fallido ${startDate} → ${endDate}`}
      headerTitle="Proceso fallido"
      headerAccent={BRAND.danger}
    >
      <SectionHeading tone="danger">❌ El proceso falló</SectionHeading>
      <Paragraph muted>
        Rango: <strong>{startDate}</strong> → <strong>{endDate}</strong>
      </Paragraph>

      <Callout tone="danger" title="Error detectado">
        <span style={{ fontFamily: 'monospace', fontSize: '13px' }}>{error}</span>
      </Callout>

      <Paragraph muted>
        Por favor revisá los logs del sistema para más detalles y reintentá el proceso.
      </Paragraph>
    </BrandedLayout>
  )
}
