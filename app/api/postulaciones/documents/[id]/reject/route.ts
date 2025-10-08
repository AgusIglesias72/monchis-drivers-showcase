// app/api/postulaciones/documents/[id]/reject/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { reason } = await request.json();

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { error: 'La razón del rechazo es requerida' },
        { status: 400 }
      );
    }

    const updatedDoc = await prisma.formDocument.update({
      where: { id },
      data: {
        status: 'REJECTED',
        reviewedAt: new Date(),
        reviewedBy: 'Admin User', // TODO: Obtener del usuario actual
        rejectionReason: reason,
      }
    });

    // Recalcular el estado general de documentos
    const documents = await prisma.formDocument.findMany({
      where: {
        formDriverId: updatedDoc.formDriverId,
        isDeleted: false
      }
    });

    const hasRejected = documents.some(d => d.status === 'REJECTED');
    
    await prisma.formDriver.update({
      where: { id: updatedDoc.formDriverId },
      data: { documentsStatus: hasRejected ? 'CORRECTIONS' : 'IN_REVIEW' }
    });

    return NextResponse.json({
      success: true,
      document: updatedDoc
    });

  } catch (error: any) {
    console.error('Error al rechazar documento:', error);
    return NextResponse.json(
      { error: error.message || 'Error al rechazar el documento' },
      { status: 500 }
    );
  }
}