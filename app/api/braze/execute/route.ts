// app/api/braze/execute/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import * as brazeTriggersService from '@/lib/services/braze-triggers.service'

/**
 * POST /api/braze/execute
 * Ejecutar un trigger de Braze en modo broadcast con propiedades opcionales
 *
 * Body:
 * {
 *   "triggerId": "clx...",
 *   "triggerProperties": {  // Opcional
 *     "hora_inicio": "14:00",
 *     "hora_final": "18:00",
 *     "monto": 50000
 *   }
 * }
 *
 * La audiencia se gestiona directamente en Braze.
 * El trigger se ejecuta en modo broadcast para todos los usuarios de la campaña/canvas.
 * Las trigger_properties se envían a Braze para personalización del mensaje.
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json()

    // Validaciones
    if (!body.triggerId) {
      return NextResponse.json({ error: 'triggerId es requerido' }, { status: 400 })
    }

    // Obtener info de la request
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
    const userAgent = request.headers.get('user-agent') || undefined

    // Ejecutar trigger en modo broadcast con trigger_properties opcionales
    const result = await brazeTriggersService.executeBrazeTrigger({
      triggerId: body.triggerId,
      executedBy: adminUser.id,
      triggerProperties: body.triggerProperties, // Opcional: { hora_inicio, hora_final, monto, etc }
      ipAddress,
      userAgent,
    })

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          execution: result.execution,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Trigger ejecutado exitosamente',
      sendId: result.sendId,
      dispatchId: result.dispatchId,
      execution: result.execution,
    })
  } catch (error) {
    console.error('Error en POST /api/braze/execute:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    )
  }
}
