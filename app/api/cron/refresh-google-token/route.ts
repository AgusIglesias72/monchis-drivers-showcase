import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

export async function GET(request: NextRequest) {
  try {
    // 1. Verificar autenticación del cron
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.error('❌ [CRON] Unauthorized request to refresh-google-token')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔄 [CRON] Starting Google token refresh...')

    // 2. Crear cliente OAuth2
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_OAUTH_CLIENT_ID,
      process.env.GOOGLE_OAUTH_CLIENT_SECRET
    )

    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN,
    })

    // 3. Hacer una llamada simple a Drive API
    // Esto forzará el refresh automático del access token
    const drive = google.drive({ version: 'v3', auth: oauth2Client })
    await drive.files.list({
      pageSize: 1,
      fields: 'files(id, name)'
    })

    console.log('✅ [CRON] Google token refreshed successfully')

    return NextResponse.json({
      success: true,
      message: 'Token refreshed successfully',
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('❌ [CRON] Error refreshing Google token:', error.message)

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
