// app/api/braze/executions/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import * as brazeTriggersService from '@/lib/services/braze-triggers.service'
import type { BrazeExecutionStatus } from '@prisma/client'

/**
 * GET /api/braze/executions
 * Obtener historial de ejecuciones de Braze
 *
 * Query params:
 * - triggerId: string (opcional)
 * - status: BrazeExecutionStatus (opcional)
 * - executedBy: string (opcional)
 * - formDriverId: string (opcional)
 * - dateFrom: string ISO (opcional)
 * - dateTo: string ISO (opcional)
 * - limit: number (opcional, default: 50)
 * - offset: number (opcional, default: 0)
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const adminUser = await prisma.adminUser.findUnique({
      where: { clerkId: userId },
    })

    if (!adminUser) {
      return NextResponse.json({ error: 'Usuario admin no encontrado' }, { status: 403 })
    }

    // Parsear query params
    const { searchParams } = new URL(request.url)

    const triggerId = searchParams.get('triggerId') || undefined
    const status = searchParams.get('status') as BrazeExecutionStatus | undefined
    const executedBy = searchParams.get('executedBy') || undefined
    const formDriverId = searchParams.get('formDriverId') || undefined
    const dateFromStr = searchParams.get('dateFrom')
    const dateToStr = searchParams.get('dateTo')
    const limitStr = searchParams.get('limit')
    const offsetStr = searchParams.get('offset')

    const dateFrom = dateFromStr ? new Date(dateFromStr) : undefined
    const dateTo = dateToStr ? new Date(dateToStr) : undefined
    const limit = limitStr ? parseInt(limitStr, 10) : 50
    const offset = offsetStr ? parseInt(offsetStr, 10) : 0

    // Obtener ejecuciones
    const result = await brazeTriggersService.getBrazeExecutions({
      triggerId,
      status,
      executedBy,
      formDriverId,
      dateFrom,
      dateTo,
      limit,
      offset,
    })

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('Error en GET /api/braze/executions:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    )
  }
}
