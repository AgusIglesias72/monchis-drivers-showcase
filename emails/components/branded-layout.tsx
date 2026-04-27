import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Preview,
  Section,
  Text,
  Link,
  Hr,
} from '@react-email/components'
import * as React from 'react'
import { BRAND } from '@/lib/config/notifications.config'

interface BrandedLayoutProps {
  preview: string
  headerTitle?: string
  headerAccent?: string // color del header, defaults to brand primary
  children: React.ReactNode
}

export function BrandedLayout({
  preview,
  headerTitle,
  headerAccent = BRAND.primary,
  children,
}: BrandedLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={body}>
        <Container style={container}>
          {/* Header con logo */}
          <Section style={{ ...header, backgroundColor: headerAccent }}>
            <Img
              src={BRAND.logoWhiteUrl}
              alt="Monchis Drivers"
              width="160"
              height="auto"
              style={logo}
            />
            {headerTitle && <Text style={headerTitleStyle}>{headerTitle}</Text>}
          </Section>

          {/* Contenido */}
          <Section style={content}>{children}</Section>

          {/* Footer */}
          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              Este es un email automático del sistema de{' '}
              <Link href={BRAND.appUrl} style={footerLink}>
                Monchis Drivers
              </Link>
              .
            </Text>
            <Text style={footerTextMuted}>
              Si recibís esto por error, ignorá este mensaje.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const body = {
  backgroundColor: '#f4f4f5',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, "Helvetica Neue", sans-serif',
  margin: 0,
  padding: 0,
}

const container = {
  maxWidth: '600px',
  margin: '24px auto',
  backgroundColor: BRAND.bgPage,
  borderRadius: '12px',
  overflow: 'hidden',
  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
}

const header = {
  padding: '28px 32px',
  textAlign: 'center' as const,
}

const logo = {
  display: 'block',
  margin: '0 auto',
}

const headerTitleStyle = {
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 500,
  margin: '12px 0 0 0',
  opacity: 0.95,
  letterSpacing: '0.5px',
  textTransform: 'uppercase' as const,
}

const content = {
  padding: '32px',
}

const hr = {
  borderColor: BRAND.border,
  margin: '0 32px',
}

const footer = {
  padding: '20px 32px 28px',
  textAlign: 'center' as const,
}

const footerText = {
  color: BRAND.textMuted,
  fontSize: '13px',
  margin: '0 0 6px 0',
}

const footerTextMuted = {
  color: BRAND.textMuted,
  fontSize: '12px',
  margin: 0,
  opacity: 0.7,
}

const footerLink = {
  color: BRAND.primary,
  textDecoration: 'none',
  fontWeight: 500,
}
