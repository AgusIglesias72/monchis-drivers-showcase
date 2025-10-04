// lib/services/documents.service.ts

import { prisma } from '@/lib/prisma';
import { ValidationStatus } from '@prisma/client';

export class DocumentsService {
  
  /**
   * Obtiene documentos con filtros opcionales
   */
  async getDocuments(filters?: {
    status?: ValidationStatus;
    driverId?: string;
    limit?: number;
  }) {
    const { status, driverId, limit = 50 } = filters || {};

    return prisma.document.findMany({
      where: {
        ...(status && { status }),
        ...(driverId && { driverId }),
      },
      include: {
        driver: {
          select: {
            id: true,
            fullName: true,
            cedula: true,
            phoneNumber: true,
            documentStatus: true,
          }
        }
      },
      orderBy: [
        { status: 'asc' }, // MANUAL_REVIEW primero
        { updatedAt: 'desc' }
      ],
      take: limit
    });
  }

  /**
   * Obtiene un documento específico con toda su info
   */
  async getDocumentById(documentId: string) {
    return prisma.document.findUnique({
      where: { id: documentId },
      include: {
        driver: {
          include: {
            vehicles: true,
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
    status: ValidationStatus,
    rejectionReason?: string,
    notes?: string
  ) {
    return prisma.document.update({
      where: { id: documentId },
      data: {
        status,
        rejectionReason,
        notes,
        validatedAt: new Date(),
        validatedBy: 'MANUAL_ADMIN',
        updatedAt: new Date(),
      }
    });
  }

  /**
   * Obtiene conteo de documentos por estado
   */
  async getDocumentCountsByStatus() {
    const counts = await prisma.document.groupBy({
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