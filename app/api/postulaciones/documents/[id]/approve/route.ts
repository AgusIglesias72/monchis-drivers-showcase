// app/api/postulaciones/documents/[id]/approve/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const updatedDoc = await prisma.formDocument.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewedAt: new Date(),
        reviewedBy: 'Admin User', // TODO: Obtener del usuario actual
        rejectionReason: null,
      }
    });

    // Recalcular el estado general de documentos
    await recalculateDocumentsStatus(updatedDoc.formDriverId);

    return NextResponse.json({
      success: true,
      document: updatedDoc
    });

  } catch (error: any) {
    console.error('Error al aprobar documento:', error);
    return NextResponse.json(
      { error: error.message || 'Error al aprobar el documento' },
      { status: 500 }
    );
  }
}

async function recalculateDocumentsStatus(formDriverId: string) {
  const documents = await prisma.formDocument.findMany({
    where: {
      formDriverId,
      isDeleted: false
    }
  });

  if (documents.length === 0) {
    await prisma.formDriver.update({
      where: { id: formDriverId },
      data: { documentsStatus: 'INCOMPLETE' }
    });
    return;
  }

  const hasRejected = documents.some(d => d.status === 'REJECTED');
  const allApproved = documents.every(d => d.status === 'APPROVED');
  const hasInReview = documents.some(d => d.status === 'IN_REVIEW');
  const hasPending = documents.some(d => d.status === 'PENDING');

  let newStatus: 'INCOMPLETE' | 'PENDING' | 'IN_REVIEW' | 'CORRECTIONS' | 'APPROVED';

  if (allApproved) {
    newStatus = 'APPROVED';
  } else if (hasRejected) {
    newStatus = 'CORRECTIONS';
  } else if (hasInReview) {
    newStatus = 'IN_REVIEW';
  } else if (hasPending) {
    newStatus = 'PENDING';
  } else {
    newStatus = 'INCOMPLETE';
  }

  await prisma.formDriver.update({
    where: { id: formDriverId },
    data: { documentsStatus: newStatus }
  });
}