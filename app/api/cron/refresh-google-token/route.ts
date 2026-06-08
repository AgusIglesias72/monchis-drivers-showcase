import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { requireCronAuth } from '@/lib/auth'
import {
  getRefreshToken,
  markRefreshTokenError,
  markRefreshTokenUsed,
} from '@/lib/services/google-oauth-token.service'

// Heartbeat: fuerza un access_token refresh contra Drive y registra
// last_used_at / last_error en `google_oauth_credential`. Con la app OAuth
// publicada como Internal en GCP el refresh_token no caduca por edad; este
// cron sirve para (1) mantenerlo "vivo" frente al límite de 6 meses sin uso
// y (2) dejar rastro en DB si algún día Google lo revoca (admin lo borra,
// rotación de credenciales, etc.). No manda alerta: la inspección es vía
// `SELECT last_error, last_error_at, last_used_at FROM google_oauth_credential`.
export async function GET(request: NextRequest) {
  try {
    const cronError = requireCronAuth(request)
    if (cronError) {
      console.error('❌ [CRON] Unauthorized request to refresh-google-token')
      return cronError
    }

    console.log('🔄 [CRON] Starting Google token refresh...')

    const refreshToken = await getRefreshToken()
    if (!refreshToken) {
      const msg =
        'No hay refresh_token en DB ni env. Correr `npm run auth:google` y reintentar.'
      return NextResponse.json(
        { success: false, error: msg, timestamp: new Date().toISOString() },
        { status: 500 },
      )
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_OAUTH_CLIENT_ID,
      process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    )

    oauth2Client.setCredentials({ refresh_token: refreshToken })

    // Llamada simple a Drive — fuerza el refresh del access_token y, si el
    // refresh_token está revocado, Google devuelve invalid_grant.
    const drive = google.drive({ version: 'v3', auth: oauth2Client })
    await drive.files.list({ pageSize: 1, fields: 'files(id, name)' })

    await markRefreshTokenUsed()
    console.log('✅ [CRON] Google token refreshed successfully')

    return NextResponse.json({
      success: true,
      message: 'Token refreshed successfully',
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    const message = error?.message ?? 'unknown error'
    console.error('❌ [CRON] Error refreshing Google token:', message)
    await markRefreshTokenError(message)

    return NextResponse.json(
      {
        success: false,
        error: message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
