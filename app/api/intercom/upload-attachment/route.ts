// app/api/intercom/upload-attachment/route.ts
//
// POST — sube una imagen a Vercel Blob y devuelve la URL pública para usar
// como attachment_url en POST /messages de Intercom. Intercom necesita URLs
// públicamente accesibles para bajarse el archivo y mostrarlo en el Messenger.

import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { requireAdminApi } from '@/lib/auth';
import { safeExtensionFromMime, safePathSegment } from '@/lib/utils/blob-paths';
import { nanoid } from 'nanoid';

// Intercom acepta hasta 10 attachments por mensaje. El tamaño máximo no está
// documentado oficialmente pero 5MB es razonable y matchea el resto del proyecto.
const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_PREFIX = 'image/';

export async function POST(request: NextRequest) {
  const guard = await requireAdminApi();
  if (!guard.ok) return guard.response;
  const adminUser = guard.user;

  const formData = await request.formData();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: 'No se proporcionó ningún archivo' },
      { status: 400 },
    );
  }

  if (!file.type.startsWith(ALLOWED_MIME_PREFIX)) {
    return NextResponse.json(
      { error: 'Solo se aceptan imágenes' },
      { status: 400 },
    );
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: 'La imagen no puede pesar más de 5MB' },
      { status: 400 },
    );
  }

  const ext = safeExtensionFromMime(file.type);
  const userSeg = safePathSegment(adminUser.clerkId);
  const filename = `intercom-attachments/${userSeg}/${Date.now()}-${nanoid(12)}.${ext}`;

  try {
    const blob = await put(filename, file, {
      access: 'public',
      addRandomSuffix: false,
    });

    return NextResponse.json({
      url: blob.url,
      filename: file.name,
      size: file.size,
      type: file.type,
    });
  } catch (err) {
    console.error('[intercom upload] failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error al subir' },
      { status: 500 },
    );
  }
}
