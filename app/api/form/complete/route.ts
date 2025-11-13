// app/api/form/complete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { messagesService } from "@/lib/services/messages.service";
import { WhatsAppMessageType, WhatsAppMessageSource } from "@prisma/client";

/**
 * Normaliza el nombre del usuario (solo primer nombre)
 * Ejemplos: "Agustin Iglesias" → "Agustin", "María José" → "María"
 */
function normalizeFirstName(fullName: string | null | undefined): string {
  if (!fullName) return 'Usuario';
  
  const trimmed = fullName.trim();
  const firstName = trimmed.split(' ')[0];
  
  // Capitalizar primera letra
  return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
}

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID requerido" },
        { status: 400 }
      );
    }

    // Obtener submission
    const submission = await prisma.formSubmission.findUnique({
      where: { sessionId },
      include: {
        formDriver: true,
      },
    });

    if (!submission || !submission.formDriverId) {
      return NextResponse.json(
        { error: "Sesión no encontrada o FormDriver no creado" },
        { status: 404 }
      );
    }

    const formData = submission.formData as any;

    // Actualizar FormDriver a COMPLETED
    await prisma.formDriver.update({
      where: { id: submission.formDriverId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        currentStep: 6, // Ahora son 6 steps
        completedSteps: [1, 2, 3, 4, 5, 6],
      },
    });

    // Crear registro de EquipmentPayment
    if (formData.paymentMethod) {
      await prisma.equipmentPayment.create({
        data: {
          formDriverId: submission.formDriverId,
          paymentMethod: formData.paymentMethod,
          paymentProofUrl: formData.paymentProofUrl || null,
          status: formData.paymentMethod === 'TRANSFERENCIA' ? 'PENDING' : 'PENDING',
          metadata: {
            completedFromForm: true,
            submittedAt: new Date().toISOString(),
          },
        },
      });
    }

    // Crear/actualizar FinancialService si puede facturar
    if (formData.canInvoice === 'si') {
      await prisma.financialService.upsert({
        where: { formDriverId: submission.formDriverId },
        update: {
          hasInvoice: true,
          interestedInConto: formData.interestedInConto === 'si',
          contoStatus: formData.interestedInConto === 'si' ? 'INTERESTED' : null,
          taxComplianceUrl: formData.taxCompliancePhotoUrl || null,
        },
        create: {
          formDriverId: submission.formDriverId,
          hasInvoice: true,
          interestedInConto: formData.interestedInConto === 'si',
          contoStatus: formData.interestedInConto === 'si' ? 'INTERESTED' : null,
          taxComplianceUrl: formData.taxCompliancePhotoUrl || null,
        },
      });
    }

    // Marcar submission como completa
    await prisma.formSubmission.update({
      where: { id: submission.id },
      data: {
        isComplete: true,
        completedAt: new Date(),
        currentStep: 6,
      },
    });

    // ===== 🎉 ENVIAR MENSAJE DE CONFIRMACIÓN AUTOMÁTICO =====
    
    const driver = submission.formDriver;
    
    if (driver && driver.phoneNumber && driver.fullName) {
      try {
        // Normalizar nombre (solo primer nombre)
        const firstName = normalizeFirstName(driver.fullName);
        
        // Obtener IP del request
        const ipAddress = request.headers.get('x-forwarded-for') || 
                         request.headers.get('x-real-ip') || 
                         'unknown';
        const userAgent = request.headers.get('user-agent') || 'unknown';

        // Enviar mensaje de confirmación
        const messageResult = await messagesService.sendWhatsAppMessage({
          phone: driver.phoneNumber,
          name: firstName, // ← Nombre normalizado
          type: WhatsAppMessageType.APPLICATION_RECEIVED,
          formDriverId: driver.id,
          source: WhatsAppMessageSource.TRIGGER, // ← Automático por evento
          metadata: {
            triggeredBy: 'form_completion',
            sessionId: submission.id,
            completedAt: new Date().toISOString(),
          },
          ipAddress,
          userAgent,
        });

        // Log del resultado (no bloqueamos si falla)
        if (messageResult.success) {
          console.log('✅ Mensaje de confirmación enviado:', {
            driver: driver.fullName,
            phone: driver.phoneNumber,
            messageId: messageResult.messageId,
          });
        } else {
          console.error('⚠️ No se pudo enviar mensaje de confirmación:', {
            driver: driver.fullName,
            error: messageResult.error,
            warning: messageResult.warning,
          });
        }
      } catch (messageError) {
        // No bloqueamos la finalización del form si falla el mensaje
        console.error('❌ Error enviando mensaje de confirmación:', messageError);
      }
    } else {
      console.warn('⚠️ No se puede enviar mensaje: faltan datos del driver', {
        hasPhone: !!driver?.phoneNumber,
        hasName: !!driver?.fullName,
      });
    }

    // ===== FIN ENVÍO DE MENSAJE =====

    return NextResponse.json({
      success: true,
      submissionId: submission.id,
      formDriverId: submission.formDriverId,
    });
  } catch (error: any) {
    console.error("Error en complete:", error);
    return NextResponse.json(
      { error: error.message || "Error al completar el formulario" },
      { status: 500 }
    );
  }
}