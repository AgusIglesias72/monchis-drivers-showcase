// app/api/postulacion/[token]/documents/route.ts
// POST - Subir nuevo documento

import { NextRequest, NextResponse } from 'next/server'
import { uploadDocument } from '@/lib/services/portal-postulacion.service'
import { validateDocumentFile, UploadDocumentSchema } from '@/lib/validators/portal.validators'
import { validateAccessToken } from '@/lib/services/portal-access.service'
import { logDocumentUpload } from '@/lib/services/portal-audit.service'

// Rate limiting
const requestCounts = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(token: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now()
  const record = requestCounts.get(`upload:${token}`)

  if (!record || now > record.resetAt) {
    requestCounts.set(`upload:${token}`, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (record.count >= maxRequests) {
    return false
  }

  record.count++
  return true
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    // Rate limit: 10 uploads por hora
    if (!checkRateLimit(token, 10, 3600000)) {
      return NextResponse.json(
        { error: 'Demasiadas subidas de archivos. Intenta nuevamente más tarde.' },
        { status: 429 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const documentType = formData.get('documentType') as string

    if (!file) {
      return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 })
    }

    if (!documentType) {
      return NextResponse.json({ error: 'Tipo de documento requerido' }, { status: 400 })
    }

    // Validar tipo de documento
    const { documentType: validatedType } = UploadDocumentSchema.parse({ documentType })

    // Validar token y obtener driver
    const driver = await validateAccessToken(token)

    // Validar archivo
    validateDocumentFile(file)

    // Subir documento
    const document = await uploadDocument(token, file, validatedType)

    // Crear audit log
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
    const userAgent = request.headers.get('user-agent') || undefined

    await logDocumentUpload(
      driver.id,
      document.id,
      document.documentType,
      document.fileName,
      ipAddress,
      userAgent
    )

    return NextResponse.json({
      success: true,
      message: 'Documento subido correctamente',
      document: {
        id: document.id,
        documentType: document.documentType,
        fileName: document.fileName,
        blobUrl: document.blobUrl,
        status: document.status,
      },
    })
  } catch (error: any) {
    console.error('Error en POST /api/postulacion/[token]/documents:', error)

    // Error de validación
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Tipo de documento inválido', details: error.errors },
        { status: 400 }
      )
    }

    // Error de validación de archivo
    if (
      error.message.includes('Tipo de archivo no permitido') ||
      error.message.includes('tamaño máximo') ||
      error.message.includes('Extensión de archivo')
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Token inválido
    if (error.message === 'Token inválido' || error.message === 'Token no encontrado') {
      return NextResponse.json({ error: 'Acceso no autorizado' }, { status: 401 })
    }

    return NextResponse.json(
      { error: error.message || 'Error al subir documento' },
      { status: 500 }
    )
  }
}
