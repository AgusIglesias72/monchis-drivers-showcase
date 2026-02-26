// app/api/postulacion/[token]/documents/[docId]/route.ts
// DELETE - Eliminar documento

import { NextRequest, NextResponse } from 'next/server'
import { deleteDocument } from '@/lib/services/portal-postulacion.service'
import { validateAccessToken } from '@/lib/services/portal-access.service'
import { logDocumentDelete } from '@/lib/services/portal-audit.service'
import { prisma } from '@/lib/prisma'

// Rate limiting
const requestCounts = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(token: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now()
  const record = requestCounts.get(`delete:${token}`)

  if (!record || now > record.resetAt) {
    requestCounts.set(`delete:${token}`, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (record.count >= maxRequests) {
    return false
  }

  record.count++
  return true
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ token: string; docId: string }> }
) {
  try {
    const { token, docId } = await params

    // Rate limit: 20 deletes por hora
    if (!checkRateLimit(token, 20, 3600000)) {
      return NextResponse.json(
        { error: 'Demasiadas operaciones. Intenta nuevamente más tarde.' },
        { status: 429 }
      )
    }

    if (!docId) {
      return NextResponse.json({ error: 'ID de documento requerido' }, { status: 400 })
    }

    // Validar token y obtener driver
    const driver = await validateAccessToken(token)

    // Obtener info del documento antes de eliminarlo (para audit log)
    const document = await prisma.formDocument.findUnique({
      where: { id: docId },
      select: {
        documentType: true,
        fileName: true,
        status: true,
      },
    })

    if (!document) {
      return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 })
    }

    // Eliminar documento
    await deleteDocument(token, docId)

    // Crear audit log
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
    const userAgent = request.headers.get('user-agent') || undefined

    await logDocumentDelete(
      driver.id,
      docId,
      document.documentType,
      document.fileName,
      document.status,
      ipAddress,
      userAgent
    )

    return NextResponse.json({
      success: true,
      message: 'Documento eliminado correctamente',
    })
  } catch (error: any) {
    console.error('Error en DELETE /api/postulacion/[token]/documents/[docId]:', error)

    // Errores de permisos
    if (
      error.message === 'Documento no encontrado' ||
      error.message === 'No tiene permisos para eliminar este documento'
    ) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }

    // Error de status
    if (error.message.includes('Solo se pueden eliminar documentos')) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Token inválido
    if (error.message === 'Token inválido' || error.message === 'Token no encontrado') {
      return NextResponse.json({ error: 'Acceso no autorizado' }, { status: 401 })
    }

    return NextResponse.json(
      { error: error.message || 'Error al eliminar documento' },
      { status: 500 }
    )
  }
}
