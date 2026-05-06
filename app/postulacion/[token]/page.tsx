// app/postulacion/[token]/page.tsx
// Página principal del portal de autogestión

import { PortalDashboard } from '@/components/postulacion/portal-dashboard'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Mi Postulación - Monchis Drivers',
  description: 'Gestiona tu postulación, documentos y capacitación',
}

const PORTAL_TOKEN_COOKIE = 'monchis_portal_token'
const PORTAL_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 60 // 60 días

export default async function PortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  // Validamos rápidamente que el token corresponda a un FormDriver real antes
  // de persistir la cookie. Evita guardar tokens inválidos en cookies que
  // duran 60 días.
  const exists = await prisma.formDriver.findUnique({
    where: { accessToken: token },
    select: { id: true },
  })
  if (!exists) return notFound()

  // Persistimos la cookie para que /capacitaciones identifique al driver en SSR
  // sin pasar por el AutoIdentify cliente (evita el flicker).
  const cookieStore = await cookies()
  cookieStore.set(PORTAL_TOKEN_COOKIE, token, {
    httpOnly: false, // el cliente la lee para fallback de localStorage
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: PORTAL_TOKEN_TTL_SECONDS,
    path: '/',
  })

  return <PortalDashboard token={token} />
}
