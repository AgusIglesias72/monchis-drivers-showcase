// app/api/upload/image/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { requireAdminApi } from '@/lib/auth';
import { safeExtensionFromMime, safePathSegment } from '@/lib/utils/blob-paths';
import { nanoid } from 'nanoid';

export async function POST(request: NextRequest) {
  try {
    const guard = await requireAdminApi();
    if (!guard.ok) return guard.response;
    const adminUser = guard.user;

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó ningún archivo' }, { status: 400 });
    }

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'El archivo debe ser una imagen' }, { status: 400 });
    }

    // Validar tamaño (máximo 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'La imagen no puede pesar más de 5MB' },
        { status: 400 }
      );
    }

    // Path opaco: extensión derivada del mime validado, no del filename del cliente.
    const ext = safeExtensionFromMime(file.type);
    const userSeg = safePathSegment(adminUser.clerkId);
    const filename = `whatsapp-bulk/${userSeg}/${Date.now()}-${nanoid(12)}.${ext}`;

    const blob = await put(filename, file, {
      access: 'public',
      addRandomSuffix: false,
    });

    console.log('✅ Imagen subida:', blob.url);

    return NextResponse.json({
      success: true,
      url: blob.url,
      filename: file.name,
      size: file.size,
      type: file.type,
    });
  } catch (error: any) {
    console.error('❌ Error subiendo imagen:', error);
    return NextResponse.json(
      { error: error.message || 'Error al subir la imagen' },
      { status: 500 }
    );
  }
}

// Opcional: DELETE para eliminar imágenes
export async function DELETE(request: NextRequest) {
  try {
    const guard = await requireAdminApi();
    if (!guard.ok) return guard.response;

    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL requerida' }, { status: 400 });
    }

    // Aquí puedes implementar la lógica para eliminar de Vercel Blob
    // const { del } = await import('@vercel/blob');
    // await del(url);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ Error eliminando imagen:', error);
    return NextResponse.json(
      { error: error.message || 'Error al eliminar la imagen' },
      { status: 500 }
    );
  }
}