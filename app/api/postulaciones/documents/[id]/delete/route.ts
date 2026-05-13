// app/api/postulaciones/documents/[id]/delete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminApi } from '@/lib/auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireAdminApi();
    if (!guard.ok) return guard.response;

    const { id } = await params;

    // Eliminación hard delete acorde al esquema actual
    const deletedDoc = await prisma.formDocument.delete({
      where: { id },
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