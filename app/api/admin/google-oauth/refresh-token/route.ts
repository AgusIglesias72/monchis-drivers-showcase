// app/api/admin/google-oauth/refresh-token/route.ts
//
// Rotación del refresh_token de Google OAuth. Lo llama
// `scripts/get-google-refresh-token.ts` después del consent flow para
// publicar el token nuevo a producción sin tener que editar `.env` en cada
// entorno (Vercel + Railway).
//
// Auth: admin Clerk O `Authorization: Bearer <CRON_SECRET>` (mismo gate que
// el resto de endpoints batch). Esto permite que el script local lo invoque
// con CRON_SECRET sin necesitar sesión de Clerk.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminOrCron } from '@/lib/auth'
import { setRefreshToken } from '@/lib/services/google-oauth-token.service'

export const dynamic = 'force-dynamic'

interface RotateBody {
  refreshToken?: string
  rotatedBy?: string
}

export async function POST(request: NextRequest) {
  const guard = await requireAdminOrCron(request)
  if (guard && !guard.ok) return guard.response

  let body: RotateBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { ok: false, error: 'JSON inválido' },
      { status: 400 },
    )
  }

  const token = body.refreshToken?.trim()
  if (!token) {
    return NextResponse.json(
      { ok: false, error: 'refreshToken requerido' },
      { status: 400 },
    )
  }

  // Sanity check mínimo: refresh tokens de Google empiezan con "1//".
  // No lo bloqueamos por si Google cambia el formato, sólo avisamos.
  const looksValid = token.startsWith('1//')

  try {
    await setRefreshToken({
      refreshToken: token,
      rotatedBy:
        body.rotatedBy ??
        (guard && guard.ok ? guard.user.email : 'cron-or-script'),
    })

    return NextResponse.json({
      ok: true,
      rotatedAt: new Date().toISOString(),
      warning: looksValid ? null : 'El token no empieza con "1//" — verificá',
    })
  } catch (error: any) {
    console.error('❌ [google-oauth] error rotando token:', error.message)
    return NextResponse.json(
      { ok: false, error: error.message || 'Error guardando token' },
      { status: 500 },
    )
  }
}
