// app/api/postulaciones/documents/[id]/reject/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { messagesService } from '@/lib/services/messages.service';
import { WhatsAppMessageType, WhatsAppMessageSource } from '@prisma/client';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { reason } = body;

    // Verificar que el usuario admin existe en la base de datos
    let adminUser = await prisma.adminUser.findUnique({
      where: { clerkId: userId }
    });

    // Si no existe, crearlo
    if (!adminUser) {
      console.log(`Creando AdminUser para clerkId: ${userId}`);
      adminUser = await prisma.adminUser.create({
        data: {
          id: userId,
          clerkId: userId,
          email: 'admin@temp.com', // TODO: obtener del contexto de Clerk
          role: 'ADMIN',
          isActive: true,
        }
      });
    }

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

    // Enviar notificación de WhatsApp si es un documento de Antecedentes Penales
    const isCriminalRecord = updatedDoc.documentType === 'CRIMINAL_RECORD' ||
                             updatedDoc.documentType === 'ANTECEDENTES';

    if (isCriminalRecord) {
      try {
        // Obtener información del conductor para enviar el mensaje
        const driver = await prisma.formDriver.findUnique({
          where: { id: updatedDoc.formDriverId },
          select: {
            id: true,
            phoneNumber: true,
            fullName: true,
          }
        });

        if (driver && driver.phoneNumber && driver.fullName) {
          // Extraer primer nombre
          const firstName = driver.fullName.split(' ')[0];

          // Enviar mensaje de WhatsApp
          const messageResult = await messagesService.sendWhatsAppMessage({
            phone: driver.phoneNumber,
            name: firstName,
            type: WhatsAppMessageType.DOCUMENT_REJECTED,
            formDriverId: driver.id,
            source: WhatsAppMessageSource.TRIGGER,
            botId: 'bot-adquisicion-prod',
            metadata: {
              documentType: updatedDoc.documentType,
              documentTypeName: 'Certificado de Antecedentes Penales',
              rejectionReason: reason,
              rejectedAt: new Date().toISOString(),
              documentId: updatedDoc.id,
              triggeredBy: 'document_rejection',
              adminId: adminUser.id,
            },
          });

          console.log('WhatsApp message sent for document rejection:', messageResult);
        } else {
          console.warn('No se pudo enviar WhatsApp: conductor sin teléfono o nombre');
        }
      } catch (whatsappError) {
        // No fallar el rechazo si falla el envío de WhatsApp
        console.error('Error al enviar mensaje de WhatsApp:', whatsappError);
      }
    }

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