// app/api/postulaciones/documents/[id]/delete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

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