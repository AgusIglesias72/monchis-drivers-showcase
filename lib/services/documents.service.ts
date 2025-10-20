// lib/services/documents.service.ts

import { prisma } from '@/lib/prisma';
import { FormDocumentStatus } from '@prisma/client';

export class DocumentsService {
  
  /**
   * Obtiene documentos con filtros opcionales
   */
  async getDocuments(filters?: {
    status?: FormDocumentStatus;
    formDriverId?: string;
    limit?: number;
  }) {
    const { status, formDriverId, limit = 50 } = filters || {};

    return prisma.formDocument.findMany({
      where: {
        ...(status && { status }),
        ...(formDriverId && { formDriverId }),
      },
      include: {
        formDriver: {
          select: {
            id: true,
            fullName: true,
            cedula: true,
            phoneNumber: true,
            documentsStatus: true,
          }
        }
      },
      orderBy: [
        { status: 'asc' }, // IN_REVIEW primero
        { updatedAt: 'desc' }
      ],
      take: limit
    });
  }

  /**
   * Obtiene un documento específico con toda su info
   */
  async getDocumentById(documentId: string) {
    return prisma.formDocument.findUnique({
      where: { id: documentId },
      include: {
        formDriver: {
          include: {
            documents: true,
          }
        }
      }
    });
  }

  /**
   * Actualiza el estado de un documento manualmente
   */
  async updateDocumentStatus(
    documentId: string,
    status: FormDocumentStatus,
    rejectionReason?: string,
    notes?: string
  ) {
    return prisma.formDocument.update({
      where: { id: documentId },
      data: {
        status,
        rejectionReason,
        adminNotes: notes,
        reviewedAt: new Date(),
        reviewedBy: 'MANUAL_ADMIN',
        updatedAt: new Date(),
      }
    });
  }

  /**
   * Obtiene conteo de documentos por estado
   */
  async getDocumentCountsByStatus() {
    const counts = await prisma.formDocument.groupBy({
      by: ['status'],
      _count: true,
    });

    return counts.reduce((acc, curr) => {
      acc[curr.status] = curr._count;
      return acc;
    }, {} as Record<string, number>);
  }
}

export const documentsService = new DocumentsService();