// app/api/form/upload-document/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const sessionId = formData.get('sessionId') as string;
    const documentType = formData.get('documentType') as string;

    if (!file || !sessionId || !documentType) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos' },
        { status: 400 }
      );
    }

    // Validar tipo de archivo - ACTUALIZADO PARA ACEPTAR PDF E IMÁGENES
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

    // Subir a Vercel Blob
    const blob = await put(
      `form-documents/${sessionId}/${documentType}-${Date.now()}.${file.name.split('.').pop()}`,
      file,
      {
        access: 'public',
        addRandomSuffix: false
      }
    );

    // Actualizar submission
    const submission = await prisma.formSubmission.findUnique({
      where: { sessionId }
    });

    if (submission) {
      const formData = submission.formData as any;
      
      // Agregar URL al array existente o crear nuevo
      const currentUrls = formData[`${documentType}PhotoUrl`] 
        ? formData[`${documentType}PhotoUrl`].split(',').filter((u: string) => u)
        : [];
      currentUrls.push(blob.url);
      formData[`${documentType}PhotoUrl`] = currentUrls.join(',');

      await prisma.formSubmission.update({
        where: { sessionId },
        data: { formData }
      });

      // Actualizar FormDriver si existe
      if (submission.formDriverId) {
        const updateData: any = {};
        updateData[`${documentType}PhotoUrl`] = currentUrls.join(',');

        await prisma.formDriver.update({
          where: { id: submission.formDriverId },
          data: updateData
        });
      }
    }

    return NextResponse.json({
      success: true,
      url: blob.url
    });

  } catch (error: any) {
    console.error('Error en upload-document:', error);
    return NextResponse.json(
      { error: error.message || 'Error al subir el documento' },
      { status: 500 }
    );
  }
}