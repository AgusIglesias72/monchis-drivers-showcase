// app/api/postulaciones/[id]/payment/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id: formDriverId } = await params;
    const body = await request.json();
    
    const {
      paymentMethod,
      paymentNumber,
      invoiceNumber,
      amount,
      status,
      adminNotes,
      rejectionReason,
    } = body;

    // Buscar si ya existe un pago para este driver
    const existingPayment = await prisma.equipmentPayment.findFirst({
      where: { formDriverId }
    });

    let payment;

    if (existingPayment) {
      // Actualizar el pago existente
      payment = await prisma.equipmentPayment.update({
        where: { id: existingPayment.id },
        data: {
          paymentMethod: paymentMethod || null,
          paymentNumber: paymentNumber || null,
          invoiceNumber: invoiceNumber || null,
          amount: amount ? parseFloat(amount) : null,
          status: status || 'PENDING',
          adminNotes: adminNotes || null,
          rejectionReason: status === 'REJECTED' ? rejectionReason : null,
          verifiedAt: status === 'VERIFIED' ? new Date() : null,
          verifiedBy: status === 'VERIFIED' ? userId : null,
          updatedAt: new Date(),
        }
      });
    } else {
      // Crear un nuevo pago
      payment = await prisma.equipmentPayment.create({
        data: {
          formDriverId,
          paymentMethod: paymentMethod || null,
          paymentNumber: paymentNumber || null,
          invoiceNumber: invoiceNumber || null,
          amount: amount ? parseFloat(amount) : null,
          status: status || 'PENDING',
          adminNotes: adminNotes || null,
          rejectionReason: status === 'REJECTED' ? rejectionReason : null,
          verifiedAt: status === 'VERIFIED' ? new Date() : null,
          verifiedBy: status === 'VERIFIED' ? userId : null,
        }
      });
    }

    return NextResponse.json({
      success: true,
      payment
    });

  } catch (error: any) {
    console.error('Error actualizando pago:', error);
    return NextResponse.json(
      { error: error.message || 'Error al actualizar el pago' },
      { status: 500 }
    );
  }
}