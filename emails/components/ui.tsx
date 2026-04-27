import { Button, Section, Text, Row, Column, Link } from '@react-email/components'
import * as React from 'react'
import { BRAND } from '@/lib/config/notifications.config'

// ----- Tipos de tono/color reutilizables -----
export type Tone = 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'

const toneColors: Record<Tone, { fg: string; bg: string; border: string }> = {
  brand: { fg: BRAND.primary, bg: BRAND.primaryLight, border: '#f5a1b3' },
  success: { fg: BRAND.success, bg: BRAND.successBg, border: '#bbf7d0' },
  warning: { fg: BRAND.warning, bg: BRAND.warningBg, border: '#fde68a' },
  danger: { fg: BRAND.danger, bg: BRAND.dangerBg, border: '#fecaca' },
  info: { fg: BRAND.info, bg: BRAND.infoBg, border: '#bfdbfe' },
  neutral: { fg: BRAND.text, bg: BRAND.bgCard, border: BRAND.border },
}

// ----- Heading de sección -----
export function SectionHeading({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode
  tone?: Tone
}) {
  const c = toneColors[tone]
  return (
    <Text
      style={{
        margin: '24px 0 12px 0',
        color: tone === 'neutral' ? BRAND.text : c.fg,
        fontSize: '16px',
        fontWeight: 700,
        letterSpacing: '0.2px',
      }}
    >
      {children}
    </Text>
  )
}

// ----- Párrafo body -----
export function Paragraph({
  children,
  muted = false,
}: {
  children: React.ReactNode
  muted?: boolean
}) {
  return (
    <Text
      style={{
        margin: '0 0 12px 0',
        color: muted ? BRAND.textMuted : BRAND.text,
        fontSize: '14px',
        lineHeight: '22px',
      }}
    >
      {children}
    </Text>
  )
}

// ----- Callout / banner destacado -----
export function Callout({
  tone = 'brand',
  title,
  children,
}: {
  tone?: Tone
  title?: string
  children: React.ReactNode
}) {
  const c = toneColors[tone]
  return (
    <Section
      style={{
        backgroundColor: c.bg,
        borderLeft: `4px solid ${c.fg}`,
        borderRadius: '8px',
        padding: '16px 20px',
        margin: '16px 0',
      }}
    >
      {title && (
        <Text
          style={{
            color: c.fg,
            fontSize: '14px',
            fontWeight: 700,
            margin: '0 0 6px 0',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          {title}
        </Text>
      )}
      <Text style={{ color: BRAND.text, fontSize: '14px', lineHeight: '20px', margin: 0 }}>
        {children}
      </Text>
    </Section>
  )
}

// ----- KPI Card grande (número + label) -----
export interface KpiItem {
  label: string
  value: string | number
  tone?: Tone
}

export function KpiGrid({ items }: { items: KpiItem[] }) {
  // Partimos en filas de 2 (mejor para email clients)
  const rows: KpiItem[][] = []
  for (let i = 0; i < items.length; i += 2) {
    rows.push(items.slice(i, i + 2))
  }

  return (
    <Section style={{ margin: '12px 0' }}>
      {rows.map((row, idx) => (
        <Row key={idx} style={{ marginBottom: '8px' }}>
          {row.map((item, i) => {
            const c = toneColors[item.tone || 'brand']
            return (
              <Column
                key={i}
                style={{
                  width: '50%',
                  padding: '0 4px',
                  verticalAlign: 'top',
                }}
              >
                <div
                  style={{
                    backgroundColor: c.bg,
                    border: `1px solid ${c.border}`,
                    borderRadius: '10px',
                    padding: '16px 18px',
                    textAlign: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: c.fg,
                      fontSize: '28px',
                      fontWeight: 800,
                      margin: 0,
                      lineHeight: '32px',
                    }}
                  >
                    {item.value}
                  </Text>
                  <Text
                    style={{
                      color: BRAND.textMuted,
                      fontSize: '12px',
                      fontWeight: 500,
                      margin: '4px 0 0 0',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    {item.label}
                  </Text>
                </div>
              </Column>
            )
          })}
          {row.length === 1 && <Column style={{ width: '50%' }} />}
        </Row>
      ))}
    </Section>
  )
}

// ----- Tabla de stats compacta (label: valor) -----
export interface StatRow {
  label: string
  value: string | number
  highlight?: boolean
  tone?: Tone
}

export function StatsList({ items }: { items: StatRow[] }) {
  return (
    <Section
      style={{
        backgroundColor: BRAND.bgCard,
        border: `1px solid ${BRAND.border}`,
        borderRadius: '10px',
        padding: '4px 16px',
        margin: '12px 0',
      }}
    >
      {items.map((item, idx) => {
        const c = item.tone ? toneColors[item.tone] : null
        const isLast = idx === items.length - 1
        return (
          <Row
            key={idx}
            style={{
              borderBottom: isLast ? 'none' : `1px solid ${BRAND.border}`,
            }}
          >
            <Column style={{ padding: '10px 0' }}>
              <Text
                style={{
                  color: BRAND.textMuted,
                  fontSize: '13px',
                  margin: 0,
                }}
              >
                {item.label}
              </Text>
            </Column>
            <Column style={{ padding: '10px 0', textAlign: 'right' as const }}>
              <Text
                style={{
                  color: c ? c.fg : BRAND.text,
                  fontSize: item.highlight ? '16px' : '14px',
                  fontWeight: item.highlight ? 700 : 600,
                  margin: 0,
                }}
              >
                {item.value}
              </Text>
            </Column>
          </Row>
        )
      })}
    </Section>
  )
}

// ----- Botón CTA -----
export function CtaButton({
  href,
  children,
  tone = 'brand',
}: {
  href: string
  children: React.ReactNode
  tone?: Tone
}) {
  const c = toneColors[tone]
  return (
    <Section style={{ textAlign: 'center' as const, margin: '24px 0' }}>
      <Button
        href={href}
        style={{
          backgroundColor: c.fg,
          color: '#ffffff',
          padding: '12px 28px',
          borderRadius: '8px',
          textDecoration: 'none',
          fontSize: '14px',
          fontWeight: 600,
          display: 'inline-block',
        }}
      >
        {children}
      </Button>
    </Section>
  )
}

// ----- Lista de items (postulantes, errores, etc) -----
export interface ListItem {
  primary: string
  secondary?: string
  href?: string
  badge?: { text: string; tone?: Tone }
}

export function ItemList({ items, emptyText }: { items: ListItem[]; emptyText?: string }) {
  if (items.length === 0 && emptyText) {
    return (
      <Text
        style={{
          color: BRAND.textMuted,
          fontSize: '13px',
          fontStyle: 'italic',
          textAlign: 'center',
          padding: '16px',
          margin: 0,
        }}
      >
        {emptyText}
      </Text>
    )
  }

  return (
    <Section style={{ margin: '12px 0' }}>
      {items.map((item, idx) => {
        const badgeColors = item.badge ? toneColors[item.badge.tone || 'neutral'] : null
        return (
          <Row
            key={idx}
            style={{
              borderBottom: idx === items.length - 1 ? 'none' : `1px solid ${BRAND.border}`,
              padding: '10px 0',
            }}
          >
            <Column>
              {item.href ? (
                <Link
                  href={item.href}
                  style={{
                    color: BRAND.primary,
                    fontSize: '14px',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  {item.primary}
                </Link>
              ) : (
                <Text
                  style={{
                    color: BRAND.text,
                    fontSize: '14px',
                    fontWeight: 600,
                    margin: 0,
                  }}
                >
                  {item.primary}
                </Text>
              )}
              {item.secondary && (
                <Text
                  style={{
                    color: BRAND.textMuted,
                    fontSize: '12px',
                    margin: '2px 0 0 0',
                  }}
                >
                  {item.secondary}
                </Text>
              )}
            </Column>
            {item.badge && badgeColors && (
              <Column style={{ textAlign: 'right' as const, width: '30%' }}>
                <span
                  style={{
                    display: 'inline-block',
                    backgroundColor: badgeColors.bg,
                    color: badgeColors.fg,
                    border: `1px solid ${badgeColors.border}`,
                    padding: '3px 10px',
                    borderRadius: '999px',
                    fontSize: '11px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.3px',
                  }}
                >
                  {item.badge.text}
                </span>
              </Column>
            )}
          </Row>
        )
      })}
    </Section>
  )
}
