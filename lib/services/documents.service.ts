// lib/services/documents.service.ts

import { prisma } from '@/lib/prisma';
import { FormDocumentStatus } from '@prisma/client';

export class DocumentsService {
  
  /**
   * Obtiene documentos con filtros opcionales y paginación
   */
  async getDocuments(filters?: {
    status?: FormDocumentStatus;
    formDriverId?: string;
    page?: number;
    limit?: number;
  }) {
    const { status, formDriverId, page = 1, limit = 20 } = filters || {};
    const skip = (page - 1) * limit;

    const where = {
      ...(status && { status }),
      ...(formDriverId && { formDriverId }),
    };

    const [documents, totalDocuments] = await Promise.all([
      prisma.formDocument.findMany({
        where,
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
        skip,
        take: limit
      }),
      prisma.formDocument.count({ where })
    ]);

    return {
      documents,
      totalDocuments,
      totalPages: Math.ceil(totalDocuments / limit),
      currentPage: page,
      limit
    };
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