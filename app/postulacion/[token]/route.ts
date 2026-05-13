// app/postulacion/[token]/route.ts
//
// Deep-link de cortesía para links viejos de WhatsApp. Valida el token, setea
// la cookie monchis_portal_token y redirige a /postulacion (URL canónica).
//
// Es un Route Handler (no Server Component) porque Next.js solo permite mutar
// cookies desde Route Handlers o Server Actions.

import { NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'

const PORTAL_TOKEN_COOKIE = 'monchis_portal_token'
const PORTAL_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 60 // 60 días

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params

  const exists = await prisma.formDriver.findUnique({
    where: { accessToken: token },
    select: { id: true },
  })

  const target = new URL('/postulacion', req.url)
  const response = NextResponse.redirect(target)

  if (exists) {
    response.cookies.set(PORTAL_TOKEN_COOKIE, token, {
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: PORTAL_TOKEN_TTL_SECONDS,
      path: '/',
    })
  }

  return response
}
