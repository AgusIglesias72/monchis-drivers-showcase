// app/api/braze/triggers/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import * as brazeTriggersService from '@/lib/services/braze-triggers.service'

/**
 * GET /api/braze/triggers
 * Listar todos los triggers de Braze
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

    // Obtener triggers activos
    const triggers = await brazeTriggersService.getActiveBrazeTriggers()

    return NextResponse.json({
      success: true,
      triggers,
    })
  } catch (error) {
    console.error('Error en GET /api/braze/triggers:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/braze/triggers
 * Crear un nuevo trigger de Braze
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
    if (!body.title) {
      return NextResponse.json({ error: 'El título es requerido' }, { status: 400 })
    }

    if (!body.triggerType) {
      return NextResponse.json({ error: 'El tipo de trigger es requerido' }, { status: 400 })
    }

    if (body.triggerType === 'CAMPAIGN' && !body.campaignId) {
      return NextResponse.json({ error: 'campaign_id es requerido para triggers de tipo CAMPAIGN' }, { status: 400 })
    }

    if (body.triggerType === 'CANVAS' && !body.canvasId) {
      return NextResponse.json({ error: 'canvas_id es requerido para triggers de tipo CANVAS' }, { status: 400 })
    }

    // Crear trigger
    const trigger = await brazeTriggersService.createBrazeTrigger({
      title: body.title,
      description: body.description,
      triggerType: body.triggerType,
      campaignId: body.campaignId,
      canvasId: body.canvasId,
      targetAudience: body.targetAudience,
      defaultProperties: body.defaultProperties,
      tags: body.tags,
      createdBy: adminUser.id,
    })

    return NextResponse.json(
      {
        success: true,
        trigger,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error en POST /api/braze/triggers:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    )
  }
}
