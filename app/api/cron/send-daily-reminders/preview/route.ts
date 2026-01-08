// app/api/cron/send-daily-reminders/preview/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getEligibleDriversForReminder } from '@/lib/services/automatic-reminders.service'

/**
 * Preview endpoint para ver conductores elegibles sin enviar mensajes
 * NO requiere autenticación - solo para testing
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    console.log('🔍 [DAILY REMINDERS PREVIEW] Checking eligible drivers...')

    // Obtener límite del query param, default 10
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')

    const eligibleResult = await getEligibleDriversForReminder(limit)

    if (!eligibleResult.success) {
      console.error('❌ [PREVIEW] Error getting eligible drivers:', eligibleResult.error)
      return NextResponse.json(
        { error: 'Error getting eligible drivers', details: eligibleResult.error },
        { status: 500 }
      )
    }

    const { drivers } = eligibleResult
    const executionTimeMs = Date.now() - startTime

    console.log(`📊 [PREVIEW] Found ${drivers.length} eligible drivers`)

    // Preparar información de los conductores
    const driversInfo = drivers.map((driver) => ({
      id: driver.id,
      fullName: driver.fullName,
      firstName: driver.firstName,
      phoneNumber: driver.phoneNumber,
      createdAt: driver.createdAt,
      daysAgo: Math.floor(
        (Date.now() - new Date(driver.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      ),
    }))

    return NextResponse.json({
      success: true,
      message: `Found ${drivers.length} eligible drivers (preview only - no messages sent)`,
      stats: {
        eligibleDrivers: drivers.length,
        limit,
        executionTimeMs,
      },
      drivers: driversInfo,
      criteria: {
        status: 'COMPLETED',
        onboardingStatus: 'NOT_READY, READY, or null (Pendiente de Agendar)',
        excludes: 'SCHEDULED, IN_PROGRESS, COMPLETED',
        noCustomMessages: 'No custom messages in last 5 days',
        applicationAge: 'Created more than 10 days ago',
      },
    })
  } catch (error) {
    const executionTimeMs = Date.now() - startTime
    console.error('❌ [PREVIEW] Fatal error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        stats: {
          eligibleDrivers: 0,
          executionTimeMs,
        },
      },
      { status: 500 }
    )
  }
}
