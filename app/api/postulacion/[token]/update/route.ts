// app/api/postulacion/[token]/update/route.ts
// PUT - Actualizar datos personales

import { NextRequest, NextResponse } from 'next/server'
import { updatePersonalData } from '@/lib/services/portal-postulacion.service'
import { validatePersonalDataUpdate } from '@/lib/validators/portal.validators'
import { validateAccessToken } from '@/lib/services/portal-access.service'
import { logPersonalDataUpdate } from '@/lib/services/portal-audit.service'

// Rate limiting
const requestCounts = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(token: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now()
  const record = requestCounts.get(`update:${token}`)

  if (!record || now > record.resetAt) {
    requestCounts.set(`update:${token}`, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (record.count >= maxRequests) {
    return false
  }

  record.count++
  return true
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    // Rate limit: 20 requests por hora
    if (!checkRateLimit(token, 20, 3600000)) {
      return NextResponse.json(
        { error: 'Demasiadas actualizaciones. Intenta nuevamente más tarde.' },
        { status: 429 }
      )
    }

    const body = await request.json()

    // Validar token y obtener driver con datos anteriores
    const driver = await validateAccessToken(token)

    // Validar datos
    const validatedData = validatePersonalDataUpdate(body)

    // Guardar datos anteriores para audit log
    const previousData: Record<string, any> = {}
    Object.keys(validatedData).forEach((key) => {
      previousData[key] = (driver as any)[key]
    })

    // Actualizar datos
    const updated = await updatePersonalData(token, validatedData)

    // Obtener campos actualizados
    const updatedFields = Object.keys(validatedData)

    // Crear audit log
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
    const userAgent = request.headers.get('user-agent') || undefined

    await logPersonalDataUpdate(driver.id, validatedData, previousData, ipAddress, userAgent)

    return NextResponse.json({
      success: true,
      message: 'Datos actualizados correctamente',
      updatedFields,
    })
  } catch (error: any) {
    console.error('Error en PUT /api/postulacion/[token]/update:', error)

    // Validación fallida o campos prohibidos
    if (error.message.includes('No se permite modificar')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }

    // Error de validación de Zod
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }

    // Token inválido
    if (error.message === 'Token inválido' || error.message === 'Token no encontrado') {
      return NextResponse.json({ error: 'Acceso no autorizado' }, { status: 401 })
    }

    return NextResponse.json(
      { error: error.message || 'Error al actualizar datos' },
      { status: 500 }
    )
  }
}
