// app/api/postulaciones/documents/[id]/delete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Soft delete
    const deletedDoc = await prisma.formDocument.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: 'Admin User', // TODO: Obtener del usuario actual
      }
    });

    return NextResponse.json({
      success: true,
      document: deletedDoc
    });

  } catch (error: any) {
    console.error('Error al eliminar documento:', error);
    return NextResponse.json(
      { error: error.message || 'Error al eliminar el documento' },
      { status: 500 }
    );
  }
}