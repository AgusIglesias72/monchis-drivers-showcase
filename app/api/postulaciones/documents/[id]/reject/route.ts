// app/api/postulaciones/documents/[id]/reject/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminApi } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ⚠️ Antes este handler hacía "upsert" del AdminUser si no existía:
    // cualquier usuario Clerk autenticado que llamara PATCH /api/postulaciones/
    // documents/[id]/reject se auto-promocionaba a AdminUser role=ADMIN. Lo
    // reemplazamos por requireAdminApi que NO crea filas: si no existe en la
    // tabla AdminUser, responde 403.
    const guard = await requireAdminApi();
    if (!guard.ok) return guard.response;
    const adminUser = guard.user;

    const { id } = await params;
    const body = await request.json();
    const { reason } = body;

    const updatedDoc = await prisma.formDocument.update({
      where: { id },
      data: {
        status: 'REJECTED',
        reviewedAt: new Date(),
        reviewedBy: adminUser.id,
        rejectionReason: reason || null,
      }
    });

    // Recalcular el estado general de documentos
    const allDocs = await prisma.formDocument.findMany({
      where: { formDriverId: updatedDoc.formDriverId }
    });

    const allApproved = allDocs.every(doc => doc.status === 'APPROVED');
    const hasRejected = allDocs.some(doc => doc.status === 'REJECTED');
    const hasPending = allDocs.some(doc => doc.status === 'PENDING');

    let newDocumentsStatus: 'INCOMPLETE' | 'PENDING' | 'IN_REVIEW' | 'CORRECTIONS' | 'APPROVED';
    
    if (allApproved) {
      newDocumentsStatus = 'APPROVED';
    } else if (hasRejected) {
      newDocumentsStatus = 'CORRECTIONS';
    } else if (hasPending) {
      newDocumentsStatus = 'PENDING';
    } else {
      newDocumentsStatus = 'IN_REVIEW';
    }

    await prisma.formDriver.update({
      where: { id: updatedDoc.formDriverId },
      data: { documentsStatus: newDocumentsStatus }
    });

    // Decisión de producto: NO notificamos al cliente por WhatsApp cuando se
    // rechaza un documento. El cliente ve el estado y el motivo en el portal
    // (/postulacion → sección Documentos) cuando vuelve a entrar. Minimizamos
    // outbound del bot (que cuesta template) y confiamos en el portal como
    // fuente única post-aprobación inicial.

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