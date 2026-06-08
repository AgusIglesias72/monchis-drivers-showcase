import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { requireCronAuth } from '@/lib/auth'
import {
  getRefreshToken,
  markRefreshTokenError,
  markRefreshTokenUsed,
} from '@/lib/services/google-oauth-token.service'
import { sendSlackMessage } from '@/lib/services/slack.service'

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
      await sendSlackMessage(`:warning: *Google OAuth*: ${msg}`)
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
    // refresh_token está revocado/caducado, Google devuelve invalid_grant.
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

    // Si Google rechazó el refresh, avisamos a Slack para correr el script
    // antes de que rompa subidas a Drive.
    const isInvalidGrant =
      message.includes('invalid_grant') ||
      message.includes('Token has been expired or revoked')
    const prefix = isInvalidGrant
      ? ':rotating_light: *Google OAuth refresh token caducado/revocado*'
      : ':warning: *Google OAuth*: fallo refrescando token'
    await sendSlackMessage(
      `${prefix}\n\`\`\`${message}\`\`\`\nCorrer \`npm run auth:google\` para rotar.`,
    )

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
