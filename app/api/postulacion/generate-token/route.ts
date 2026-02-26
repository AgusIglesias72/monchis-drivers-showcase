// app/api/postulacion/generate-token/route.ts
// POST - Generar o regenerar accessToken (Admin only)

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import {
  generateAccessToken,
  regenerateAccessToken,
  getPortalUrl,
} from '@/lib/services/portal-access.service'
import { GenerateTokenSchema } from '@/lib/validators/portal.validators'

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación de admin
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar que el usuario es admin
    const adminUser = await prisma.adminUser.findUnique({
      where: { clerkId: userId },
    })

    if (!adminUser) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const body = await request.json()

    // Validar datos
    const { formDriverId, regenerate } = GenerateTokenSchema.parse(body)

    // Verificar que el FormDriver existe
    const formDriver = await prisma.formDriver.findUnique({
      where: { id: formDriverId },
      select: { id: true, fullName: true, cedula: true, accessToken: true },
    })

    if (!formDriver) {
      return NextResponse.json({ error: 'FormDriver no encontrado' }, { status: 404 })
    }

    let accessToken: string

    // Si ya tiene token y no se solicita regenerar, retornar el existente
    if (formDriver.accessToken && !regenerate) {
      accessToken = formDriver.accessToken
    } else if (formDriver.accessToken && regenerate) {
      // Regenerar token
      accessToken = await regenerateAccessToken(formDriverId)
    } else {
      // Generar nuevo token
      accessToken = await generateAccessToken(formDriverId)
    }

    const portalUrl = getPortalUrl(accessToken)

    return NextResponse.json({
      success: true,
      accessToken,
      portalUrl,
      message: regenerate
        ? 'Token regenerado exitosamente'
        : formDriver.accessToken
        ? 'Token existente'
        : 'Token generado exitosamente',
    })
  } catch (error: any) {
    console.error('Error en POST /api/postulacion/generate-token:', error)

    // Validación fallida
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Error al generar token' },
      { status: 500 }
    )
  }
}
