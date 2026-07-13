// app/api/admin/bug-reports/upload/route.ts
//
// Sube un adjunto (imagen o PDF) de un reporte interno a Vercel Blob.
// Un archivo por request para no chocar con el límite de body de Vercel.

import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { requireAdminApi } from '@/lib/auth'
import { safeExtensionFromMime, safePathSegment } from '@/lib/utils/blob-paths'
import { nanoid } from 'nanoid'

export const runtime = 'nodejs'

const ALLOWED_MIMES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
])

const MAX_SIZE = 5 * 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    const guard = await requireAdminApi()
    if (!guard.ok) return guard.response
    const adminUser = guard.user

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó ningún archivo' }, { status: 400 })
    }
    if (!ALLOWED_MIMES.has(file.type.toLowerCase())) {
      return NextResponse.json(
        { error: 'Solo se aceptan imágenes (JPG, PNG, WebP, GIF) o PDF' },
        { status: 400 },
      )
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'El archivo no puede pesar más de 5MB' },
        { status: 400 },
      )
    }

    const ext = safeExtensionFromMime(file.type)
    const userSeg = safePathSegment(adminUser.clerkId)
    const pathname = `bug-reports/${userSeg}/${Date.now()}-${nanoid(12)}.${ext}`

    const blob = await put(pathname, file, {
      access: 'public',
      addRandomSuffix: false,
    })

    return NextResponse.json({
      url: blob.url,
      name: file.name,
      contentType: file.type,
      size: file.size,
    })
  } catch (error) {
    console.error('Error subiendo adjunto de bug report:', error)
    return NextResponse.json({ error: 'Error al subir el archivo' }, { status: 500 })
  }
}
