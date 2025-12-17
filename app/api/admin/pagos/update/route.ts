// app/api/admin/pagos/update/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { pagoId, status, adminNotes, rejectionReason } = await request.json();

    // Validaciones
    if (!pagoId || !status) {
      return NextResponse.json(
        { error: "pagoId y status son requeridos" },
        { status: 400 }
      );
    }

    if (status === "REJECTED" && !rejectionReason) {
      return NextResponse.json(
        { error: "rejectionReason es requerido para pagos rechazados" },
        { status: 400 }
      );
    }

    // Verificar que el pago existe
    const pagoExistente = await prisma.equipmentPayment.findUnique({
      where: { id: pagoId },
    });

    if (!pagoExistente) {
      return NextResponse.json(
        { error: "Pago no encontrado" },
        { status: 404 }
      );
    }

    // Buscar el usuario admin por clerkId
    const adminUser = await prisma.adminUser.findUnique({
      where: { clerkId: userId },
    });

    if (!adminUser) {
      return NextResponse.json(
        { error: "Usuario administrador no encontrado" },
        { status: 404 }
      );
    }

    // Preparar datos de actualización
    const updateData: any = {
      status,
      adminNotes: adminNotes || null,
      rejectionReason: status === "REJECTED" ? rejectionReason : null,
      updatedAt: new Date(),
    };

    // Si se está verificando, agregar información de verificación
    if (status === "VERIFIED") {
      updateData.verifiedAt = new Date();
      updateData.verifiedBy = adminUser.id;
    }

    // Actualizar el pago
    const pagoActualizado = await prisma.equipmentPayment.update({
      where: { id: pagoId },
      data: updateData,
      include: {
        formDriver: {
          select: {
            fullName: true,
            firstName: true,
            lastName: true,
            cedula: true,
          },
        },
      },
    });

    // Crear registro de auditoría
    try {
      await prisma.auditLog.create({
        data: {
          userId: userId,
          userEmail: adminUser.email,
          action: status === "VERIFIED" ? "PAYMENT_VERIFIED" : "PAYMENT_REJECTED",
          actionType: "UPDATE",
          description: `Pago ${status === "VERIFIED" ? "verificado" : status === "REJECTED" ? "rechazado" : "actualizado"} para ${
            pagoActualizado.formDriver?.fullName ||
            `${pagoActualizado.formDriver?.firstName || ""} ${pagoActualizado.formDriver?.lastName || ""}`.trim()
          }`,
          entityType: "EquipmentPayment",
          entityId: pagoId,
          changes: {
            from: {
              status: pagoExistente.status,
              adminNotes: pagoExistente.adminNotes,
              rejectionReason: pagoExistente.rejectionReason,
            },
            to: {
              status: updateData.status,
              adminNotes: updateData.adminNotes,
              rejectionReason: updateData.rejectionReason,
            },
          },
          metadata: {
            formDriverId: pagoActualizado.formDriverId,
            amount: pagoActualizado.amount,
            invoiceNumber: pagoActualizado.invoiceNumber,
          },
        },
      });
    } catch (auditError) {
      console.error("Error al crear registro de auditoría:", auditError);
      // No fallar la operación principal si falla la auditoría
    }

    return NextResponse.json({
      success: true,
      pago: pagoActualizado,
      message: `Pago ${status === "VERIFIED" ? "verificado" : status === "REJECTED" ? "rechazado" : "actualizado"} exitosamente`,
    });
  } catch (error: any) {
    console.error("Error al actualizar pago:", error);
    return NextResponse.json(
      { error: error.message || "Error al actualizar el pago" },
      { status: 500 }
    );
  }
}
