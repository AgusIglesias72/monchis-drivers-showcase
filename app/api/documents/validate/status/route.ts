import { NextRequest, NextResponse } from 'next/server';
import { aiDocumentValidator } from '@/lib/services/ai-document-validator.service';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/documents/validate/status
 * Obtiene el estado de validación de documentos
 * 
 * Query params:
 * - driverId: ID del driver para ver sus documentos
 * - status: Filtrar por status específico
 * - detailed: true para incluir análisis completo de IA
 */
export async function GET(request: NextRequest) {
    try {
      const { searchParams } = new URL(request.url);
      const driverId = searchParams.get('driverId');
      const status = searchParams.get('status');
      const detailed = searchParams.get('detailed') === 'true';
      
      // Estadísticas generales si no se especifica driver
      if (!driverId) {
        const stats = await prisma.document.groupBy({
          by: ['status'],
          _count: true,
          where: status ? { status: status as any } : undefined
        });
        
        const total = await prisma.document.count();
        const pending = await prisma.document.count({ where: { status: 'PENDING' } });
        const approved = await prisma.document.count({ where: { status: 'APPROVED' } });
        const rejected = await prisma.document.count({ where: { status: 'REJECTED' } });
        const needsReview = await prisma.document.count({ where: { status: 'MANUAL_REVIEW' } });
        const processing = await prisma.document.count({ where: { status: 'PROCESSING' } });
        
        // Drivers con documentos pendientes
        const driversWithPendingDocs = await prisma.driver.findMany({
          where: {
            documents: {
              some: {
                status: 'PENDING'
              }
            }
          },
          select: {
            id: true,
            fullName: true,
            cedula: true,
            phoneNumber: true,
            documentStatus: true,
            _count: {
              select: {
                documents: {
                  where: { status: 'PENDING' }
                }
              }
            }
          },
          take: 20,
          orderBy: {
            createdAt: 'desc'
          }
        });
        
        return NextResponse.json({
          success: true,
          stats: {
            total,
            pending,
            approved,
            rejected,
            needsReview,
            processing,
            breakdown: stats
          },
          driversWithPendingDocs: driversWithPendingDocs.map(d => ({
            id: d.id,
            name: d.fullName,
            cedula: d.cedula,
            phone: d.phoneNumber,
            documentStatus: d.documentStatus,
            pendingDocsCount: d._count.documents
          }))
        });
      }
      
      // Documentos de un driver específico
      const documents = await prisma.document.findMany({
        where: {
          driverId,
          ...(status && { status: status as any })
        },
        select: {
          id: true,
          type: true,
          status: true,
          fileName: true,
          driveUrl: true,
          confidenceScore: true,
          validatedAt: true,
          validatedBy: true,
          rejectionReason: true,
          notes: true,
          createdAt: true,
          updatedAt: true,
          ...(detailed && {
            aiValidation: true,
            extractedData: true,
            metadata: true
          })
        },
        orderBy: { createdAt: 'desc' }
      });
      
      // Info del driver
      const driver = await prisma.driver.findUnique({
        where: { id: driverId },
        select: {
          id: true,
          fullName: true,
          cedula: true,
          phoneNumber: true,
          documentStatus: true
        }
      });
      
      return NextResponse.json({
        success: true,
        driver,
        documents,
        summary: {
          total: documents.length,
          pending: documents.filter(d => d.status === 'PENDING').length,
          approved: documents.filter(d => d.status === 'APPROVED').length,
          rejected: documents.filter(d => d.status === 'REJECTED').length,
          needsReview: documents.filter(d => d.status === 'MANUAL_REVIEW').length,
          processing: documents.filter(d => d.status === 'PROCESSING').length,
          avgScore: documents
            .filter(d => d.confidenceScore !== null)
            .reduce((sum, d) => sum + (d.confidenceScore || 0), 0) / 
            documents.filter(d => d.confidenceScore !== null).length || 0
        }
      });
      
    } catch (error: any) {
      console.error('Error obteniendo estado de documentos:', error);
      return NextResponse.json(
        { 
          success: false,
          error: error.message || 'Error fetching document status'
        },
        { status: 500 }
      );
    }
  }