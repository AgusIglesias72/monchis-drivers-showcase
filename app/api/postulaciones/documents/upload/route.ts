// app/api/postulaciones/documents/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { prisma } from '@/lib/prisma';
import { requireAdminApi } from '@/lib/auth';
import { buildDriverDocumentPath } from '@/lib/utils/blob-paths';

export async function POST(request: NextRequest) {
  try {
    const guard = await requireAdminApi();
    if (!guard.ok) return guard.response;
    const adminUser = guard.user;

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const formDriverId = formData.get('formDriverId') as string;
    const documentType = formData.get('documentType') as string;

    if (!file || !formDriverId || !documentType) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos' },
        { status: 400 }
      );
    }

    // Validar tipo de archivo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Solo se permiten imágenes (JPG, PNG, WebP) o PDF' },
        { status: 400 }
      );
    }

    // Validar tamaño (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'El archivo no debe superar 5MB' },
        { status: 400 }
      );
    }

    // Path opaco con mime-derived extension (no file.name del cliente).
    const blobPath = buildDriverDocumentPath({
      formDriverId,
      documentType,
      mime: file.type,
    });

    const blob = await put(blobPath, file, {
      access: 'public',
      addRandomSuffix: false,
    });

    // Crear registro en FormDocument
    const formDocument = await prisma.formDocument.create({
      data: {
        formDriverId,
        documentType: documentType as any,
        blobUrl: blob.url,
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
        status: 'PENDING',
        metadata: {
          uploadedFrom: 'admin_panel',
          uploadedBy: adminUser.clerkId,
        }
      }
    });

    return NextResponse.json({
      success: true,
      document: formDocument
    });

  } catch (error: any) {
    console.error('Error en upload-document (admin):', error);
    return NextResponse.json(
      { error: error.message || 'Error al subir el documento' },
      { status: 500 }
    );
  }
}