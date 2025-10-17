// app/api/form/complete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    // ✅ NUEVO: Crear registro de EquipmentPayment
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

    // ✅ NUEVO: Crear/actualizar FinancialService si puede facturar
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