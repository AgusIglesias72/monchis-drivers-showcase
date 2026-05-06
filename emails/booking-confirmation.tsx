import * as React from 'react'
import { Section, Text, Link, Hr } from '@react-email/components'
import { BrandedLayout } from './components/branded-layout'
import { SectionHeading, Paragraph } from './components/ui'
import { formatPYLong } from '@/lib/utils/onboarding-time'

export interface BookingConfirmationEmailProps {
  driverFirstName: string | null
  ruleTitle: string
  scheduledDateUTC: string
  startTime: string
  endTime: string
  modality: 'IN_PERSON' | 'VIRTUAL' | 'HYBRID'
  location?: string | null
  locationAddress?: string | null
  meetingLink?: string | null
  instructions?: string | null
  confirmationUrl: string
  icsUrl: string
}

export default function BookingConfirmationEmail(props: BookingConfirmationEmailProps) {
  const date = new Date(props.scheduledDateUTC)
  const fecha = formatPYLong(date)
  const name = props.driverFirstName?.split(' ')[0] || 'Hola'

  return (
    <BrandedLayout preview={`Tu capacitación ${props.ruleTitle} está confirmada`}>
      <SectionHeading>¡Listo, {name}!</SectionHeading>
      <Paragraph>Reservaste tu capacitación. Acá los detalles:</Paragraph>

      <Section style={{ background: '#fafafa', borderRadius: 8, padding: 16, margin: '16px 0' }}>
        <Text style={{ margin: '4px 0', fontWeight: 600 }}>{props.ruleTitle}</Text>
        <Text style={{ margin: '4px 0', textTransform: 'capitalize' }}>{fecha}</Text>
        <Text style={{ margin: '4px 0' }}>
          {props.startTime} — {props.endTime} (Asunción)
        </Text>
        {props.modality !== 'VIRTUAL' && (props.location || props.locationAddress) && (
          <Text style={{ margin: '4px 0', color: '#555' }}>
            📍 {props.location} {props.locationAddress ? `— ${props.locationAddress}` : ''}
          </Text>
        )}
        {props.meetingLink && (
          <Text style={{ margin: '4px 0' }}>
            💻 <Link href={props.meetingLink}>{props.meetingLink}</Link>
          </Text>
        )}
      </Section>

      {props.instructions && (
        <>
          <Hr />
          <SectionHeading>¿Qué necesitás llevar?</SectionHeading>
          <Paragraph>
            <span style={{ whiteSpace: 'pre-line' }}>{props.instructions}</span>
          </Paragraph>
        </>
      )}

      <Hr />
      <Paragraph>
        <Link href={props.confirmationUrl}>Ver mi reserva</Link>
        {' · '}
        <Link href={props.icsUrl}>Descargar .ics</Link>
      </Paragraph>

      <Paragraph muted>
        Recibirás un recordatorio por WhatsApp el día anterior.
      </Paragraph>
    </BrandedLayout>
  )
}
