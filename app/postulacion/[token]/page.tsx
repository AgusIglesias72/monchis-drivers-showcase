// app/postulacion/[token]/page.tsx
//
// Deep-link de cortesía para links viejos de WhatsApp. Valida el token, setea
// la cookie monchis_portal_token y redirige a /postulacion (URL canónica).
// Toda la lógica del portal vive en /postulacion ahora.

import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

const PORTAL_TOKEN_COOKIE = 'monchis_portal_token'
const PORTAL_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 60 // 60 días

export default async function PortalTokenRedirectPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  const exists = await prisma.formDriver.findUnique({
    where: { accessToken: token },
    select: { id: true },
  })
  if (!exists) return notFound()

  const cookieStore = await cookies()
  cookieStore.set(PORTAL_TOKEN_COOKIE, token, {
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: PORTAL_TOKEN_TTL_SECONDS,
    path: '/',
  })

  redirect('/postulacion')
}
