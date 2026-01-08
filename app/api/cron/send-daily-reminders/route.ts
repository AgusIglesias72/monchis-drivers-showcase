// app/api/cron/send-daily-reminders/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getEligibleDriversForReminder, logReminderExecution } from '@/lib/services/automatic-reminders.service'
import { sendOnboardingReminderMessage } from '@/lib/actions/send-onboarding-list.actions'

/**
 * Cron job endpoint para enviar recordatorios automáticos de capacitación
 * Se ejecuta diariamente y envía mensajes a máximo 20 conductores elegibles
 *
 * Seguridad: Solo se puede ejecutar mediante:
 * - Vercel Cron (Authorization header con CRON_SECRET)
 * - Manualmente desde el dashboard de admin (requiere autenticación)
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Verificar que la petición viene de Vercel Cron
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.error('❌ [DAILY REMINDERS] Unauthorized: Invalid or missing authorization')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('🔄 [DAILY REMINDERS] Starting daily reminders job...')
    console.log('📋 [DAILY REMINDERS] Target: Drivers in "Pendiente de Agendar" status')

    // Obtener conductores elegibles (máximo 10 por día para empezar)
    const DAILY_LIMIT = 10
    const eligibleResult = await getEligibleDriversForReminder(DAILY_LIMIT)

    if (!eligibleResult.success) {
      console.error('❌ [DAILY REMINDERS] Error getting eligible drivers:', eligibleResult.error)
      return NextResponse.json(
        { error: 'Error getting eligible drivers', details: eligibleResult.error },
        { status: 500 }
      )
    }

    const { drivers } = eligibleResult

    console.log(`📊 [DAILY REMINDERS] Found ${drivers.length} eligible drivers`)

    if (drivers.length === 0) {
      const executionTimeMs = Date.now() - startTime

      await logReminderExecution({
        driversProcessed: 0,
        successCount: 0,
        failureCount: 0,
        executionTimeMs,
      })

      return NextResponse.json({
        success: true,
        message: 'No eligible drivers found',
        stats: {
          processed: 0,
          sent: 0,
          failed: 0,
          executionTimeMs,
        },
      })
    }

    // Enviar mensajes a cada conductor
    let successCount = 0
    let failureCount = 0
    const errors: string[] = []

    const details: Array<{
      driverId: string
      name: string
      phone: string
      status: 'sent' | 'failed'
      error?: string
    }> = []

    for (let i = 0; i < drivers.length; i++) {
      const driver = drivers[i]

      try {
        const driverName = driver.fullName || driver.firstName || 'Conductor'

        console.log(
          `   → [${i + 1}/${drivers.length}] Sending reminder to ${driverName} (${driver.id})...`
        )

        const result = await sendOnboardingReminderMessage({
          driverId: driver.id,
          driverName: driver.firstName || driverName,
          phoneNumber: driver.phoneNumber,
        })

        if (result.success) {
          successCount++
          console.log(`   ✓ Message sent successfully`)
          details.push({
            driverId: driver.id,
            name: driverName,
            phone: driver.phoneNumber,
            status: 'sent',
          })
        } else {
          failureCount++
          const errorMsg = `Driver ${driver.id} (${driverName}): ${result.error}`
          errors.push(errorMsg)
          console.error(`   ✗ Failed to send:`, result.error)
          details.push({
            driverId: driver.id,
            name: driverName,
            phone: driver.phoneNumber,
            status: 'failed',
            error: result.error,
          })
        }

        // Pausa de 5 segundos entre mensajes para evitar rate limiting
        if (i < drivers.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 5000))
        }
      } catch (error) {
        const driverName = driver.fullName || driver.firstName || 'Conductor'
        failureCount++
        const errorMsg = `Driver ${driver.id} (${driverName}): ${error instanceof Error ? error.message : 'Unknown error'}`
        errors.push(errorMsg)
        console.error(`   ✗ Exception occurred:`, error)
        details.push({
          driverId: driver.id,
          name: driverName,
          phone: driver.phoneNumber,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    const executionTimeMs = Date.now() - startTime

    // Registrar ejecución
    await logReminderExecution({
      driversProcessed: drivers.length,
      successCount,
      failureCount,
      executionTimeMs,
      errors: errors.length > 0 ? errors : undefined,
    })

    console.log(
      `✅ [DAILY REMINDERS] Job completed: ${successCount} sent, ${failureCount} failed (${executionTimeMs}ms)`
    )

    return NextResponse.json({
      success: true,
      message: `Processed ${drivers.length} drivers: ${successCount} sent, ${failureCount} failed`,
      stats: {
        processed: drivers.length,
        sent: successCount,
        failed: failureCount,
        executionTimeMs,
      },
      details,
    })
  } catch (error) {
    const executionTimeMs = Date.now() - startTime
    console.error('❌ [DAILY REMINDERS] Fatal error:', error)

    await logReminderExecution({
      driversProcessed: 0,
      successCount: 0,
      failureCount: 0,
      executionTimeMs,
      errors: [error instanceof Error ? error.message : 'Unknown fatal error'],
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        stats: {
          processed: 0,
          sent: 0,
          failed: 0,
          executionTimeMs,
        },
      },
      { status: 500 }
    )
  }
}
