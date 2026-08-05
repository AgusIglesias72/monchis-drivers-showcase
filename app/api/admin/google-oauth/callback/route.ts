// app/api/admin/google-oauth/callback/route.ts
//
// Callback del flow de OAuth alojado (ver `../start/route.ts`). Intercambia
// el `code` por tokens, valida el `state` (CSRF) y guarda el refresh_token
// nuevo directo en la DB vía `setRefreshToken`.

import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { requireAdminApi } from '@/lib/auth'
import { setRefreshToken } from '@/lib/services/google-oauth-token.service'
import { errorPage, successPage } from '../html'

export const dynamic = 'force-dynamic'

const STATE_COOKIE = 'google_oauth_state'

function htmlError(title: string, message: string, status: number, linkHref?: string) {
  return new NextResponse(errorPage(title, message, linkHref), {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

export async function GET(request: NextRequest) {
  const guard = await requireAdminApi({ roles: ['SUPER_ADMIN'] })
  if (!guard.ok) {
    return htmlError(
      'Necesitás iniciar sesión como super admin',
      'La sesión se perdió durante el flow. Iniciá sesión de nuevo y volvé a intentar.',
      401,
      '/sign-in',
    )
  }

  const error = request.nextUrl.searchParams.get('error')
  if (error) {
    return htmlError('Autorización cancelada', `Google devolvió: ${error}`, 400)
  }

  const code = request.nextUrl.searchParams.get('code')
  const state = request.nextUrl.searchParams.get('state')
  const expectedState = request.cookies.get(STATE_COOKIE)?.value

  if (!code) {
    return htmlError('Falta el código', 'Google no envió el parámetro code.', 400)
  }
  if (!expectedState || !state || state !== expectedState) {
    return htmlError(
      'Sesión de autorización inválida',
      'El state no coincide (puede haber expirado, tardaste más de 10 minutos). Volvé a iniciar el flow.',
      400,
    )
  }

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return htmlError('Falta configuración', 'GOOGLE_OAUTH_CLIENT_ID o GOOGLE_OAUTH_CLIENT_SECRET no están seteados.', 500)
  }

  const redirectUri = `${request.nextUrl.origin}/api/admin/google-oauth/callback`
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri)

  try {
    const { tokens } = await oauth2Client.getToken(code)

    if (!tokens.refresh_token) {
      return htmlError(
        'No se obtuvo refresh_token',
        'Google no devolvió un refresh_token nuevo. Andá a myaccount.google.com/permissions, revocá el acceso de la app y volvé a intentar.',
        400,
      )
    }

    await setRefreshToken({
      refreshToken: tokens.refresh_token,
      rotatedBy: guard.user.email,
    })

    const response = new NextResponse(successPage(guard.user.email), {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
    response.cookies.delete(STATE_COOKIE)
    return response
  } catch (err: any) {
    console.error('❌ [google-oauth/callback] error:', err.message)
    return htmlError('Error intercambiando el código', err.message || 'Error desconocido', 500)
  }
}
