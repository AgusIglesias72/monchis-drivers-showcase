// app/api/admin/google-oauth/start/route.ts
//
// Punto de entrada del flow de OAuth de Google alojado (sin localhost).
// Pensado para abrirse desde el celu cuando esta PC no tiene la cuenta de
// Google logueada: un SUPER_ADMIN abre este link ya autenticado en el panel,
// elige la cuenta de Google correcta en el consent screen, y el
// refresh_token nuevo se guarda directo en la DB vía
// `/api/admin/google-oauth/callback`.
//
// Alternativa a `scripts/get-google-refresh-token.ts` (que requiere un
// navegador y servidor local en la misma PC).

import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { requireAdminApi } from '@/lib/auth'
import { randomBytes } from 'crypto'
import { errorPage } from '../html'

export const dynamic = 'force-dynamic'

const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/gmail.send',
]

const STATE_COOKIE = 'google_oauth_state'

export async function GET(request: NextRequest) {
  const guard = await requireAdminApi({ roles: ['SUPER_ADMIN'] })
  if (!guard.ok) {
    return new NextResponse(
      errorPage(
        'Necesitás iniciar sesión como super admin',
        'Iniciá sesión con tu cuenta (rol super admin) y volvé a abrir este link.',
        '/sign-in',
      ),
      { status: 401, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    )
  }

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return new NextResponse(
      errorPage(
        'Falta configuración',
        'GOOGLE_OAUTH_CLIENT_ID o GOOGLE_OAUTH_CLIENT_SECRET no están seteados en este entorno.',
      ),
      { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    )
  }

  const redirectUri = `${request.nextUrl.origin}/api/admin/google-oauth/callback`
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri)

  const state = randomBytes(24).toString('hex')

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
    state,
  })

  const response = NextResponse.redirect(authUrl)
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 10 * 60,
    path: '/api/admin/google-oauth',
  })
  return response
}
