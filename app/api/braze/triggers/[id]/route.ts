// app/api/braze/triggers/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import * as brazeTriggersService from '@/lib/services/braze-triggers.service'

/**
 * GET /api/braze/triggers/[id]
 * Obtener un trigger por ID con sus últimas ejecuciones
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const resolvedParams = await params
    const triggerId = resolvedParams.id

    const trigger = await brazeTriggersService.getBrazeTriggerById(triggerId)

    if (!trigger) {
      return NextResponse.json({ error: 'Trigger no encontrado' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      trigger,
    })
  } catch (error) {
    console.error('Error en GET /api/braze/triggers/[id]:', error)

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
 * PATCH /api/braze/triggers/[id]
 * Actualizar un trigger
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const resolvedParams = await params
    const triggerId = resolvedParams.id

    const body = await request.json()

    const trigger = await brazeTriggersService.updateBrazeTrigger(triggerId, body, adminUser.id)

    return NextResponse.json({
      success: true,
      trigger,
    })
  } catch (error) {
    console.error('Error en PATCH /api/braze/triggers/[id]:', error)

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
 * DELETE /api/braze/triggers/[id]
 * Eliminar un trigger
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const resolvedParams = await params
    const triggerId = resolvedParams.id

    await brazeTriggersService.deleteBrazeTrigger(triggerId, adminUser.id)

    return NextResponse.json({
      success: true,
      message: 'Trigger eliminado exitosamente',
    })
  } catch (error) {
    console.error('Error en DELETE /api/braze/triggers/[id]:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    )
  }
}
