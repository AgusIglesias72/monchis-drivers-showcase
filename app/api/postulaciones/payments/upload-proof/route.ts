// app/api/postulaciones/payments/upload-proof/route.ts
/**
 * API Endpoint para subir comprobante de pago
 * 
 * POST /api/postulaciones/payments/upload-proof
 * - Sube archivo a Vercel Blob
 * - Actualiza EquipmentPayment.paymentProofUrl
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { put } from '@vercel/blob';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const paymentId = formData.get('paymentId') as string;

    if (!file || !paymentId) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos' },
        { status: 400 }
      );
    }

    // Validar tipo de archivo
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

    // Verificar que el pago existe
    const payment = await prisma.equipmentPayment.findUnique({
      where: { id: paymentId },
      select: { 
        id: true, 
        formDriverId: true,
        paymentProofUrl: true  // Para eliminar el anterior si existe
      }
    });

    if (!payment) {
      return NextResponse.json(
        { error: 'Pago no encontrado' },
        { status: 404 }
      );
    }

    // Si ya existe un comprobante, eliminarlo de Blob (opcional)
    // if (payment.paymentProofUrl) {
    //   try {
    //     await del(payment.paymentProofUrl);
    //   } catch (err) {
    //     console.error('Error al eliminar comprobante anterior:', err);
    //   }
    // }

    // Subir nuevo archivo a Vercel Blob
    const blob = await put(
      `payment-proofs/${payment.formDriverId}/${paymentId}-${Date.now()}.${file.name.split('.').pop()}`,
      file,
      {
        access: 'public',
        addRandomSuffix: false
      }
    );

    // Actualizar EquipmentPayment con la nueva URL
    const updatedPayment = await prisma.equipmentPayment.update({
      where: { id: paymentId },
      data: {
        paymentProofUrl: blob.url,
        updatedAt: new Date()
      },
      include: {
        verifiedByUser: {
          select: {
            id: true,
            firstName: true,
            fullName: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      payment: updatedPayment,
      proofUrl: blob.url,
      message: 'Comprobante subido exitosamente'
    });

  } catch (error: any) {
    console.error('Error al subir comprobante de pago:', error);
    return NextResponse.json(
      { error: error.message || 'Error al subir el comprobante' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Eliminar comprobante de pago
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('paymentId');

    if (!paymentId) {
      return NextResponse.json(
        { error: 'ID de pago requerido' },
        { status: 400 }
      );
    }

    // Obtener el pago
    const payment = await prisma.equipmentPayment.findUnique({
      where: { id: paymentId },
      select: { 
        id: true,
        paymentProofUrl: true
      }
    });

    if (!payment) {
      return NextResponse.json(
        { error: 'Pago no encontrado' },
        { status: 404 }
      );
    }

    if (!payment.paymentProofUrl) {
      return NextResponse.json(
        { error: 'No hay comprobante para eliminar' },
        { status: 400 }
      );
    }

    // Eliminar de Vercel Blob
    // try {
    //   await del(payment.paymentProofUrl);
    // } catch (err) {
    //   console.error('Error al eliminar de Blob:', err);
    // }

    // Limpiar la URL en la BD
    const updatedPayment = await prisma.equipmentPayment.update({
      where: { id: paymentId },
      data: {
        paymentProofUrl: null,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      payment: updatedPayment,
      message: 'Comprobante eliminado exitosamente'
    });

  } catch (error: any) {
    console.error('Error al eliminar comprobante:', error);
    return NextResponse.json(
      { error: error.message || 'Error al eliminar el comprobante' },
      { status: 500 }
    );
  }
}