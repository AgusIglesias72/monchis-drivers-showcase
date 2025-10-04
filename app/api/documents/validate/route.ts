// app/api/documents/validate/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { aiDocumentValidator } from '@/lib/services/ai-document-validator.service';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/documents/validate
 * Valida documentos de un driver específico o procesa un batch
 * 
 * Body options:
 * - { driverId: string } - Valida todos los docs pendientes de un driver
 * - { documentId: string } - Valida un documento específico
 * - { batchSize: number } - Procesa N drivers con docs pendientes
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { driverId, documentId, batchSize } = body;
    
    // Validación de un driver específico
    if (driverId) {
      console.log(`🚀 Iniciando validación de documentos para driver ${driverId}`);
      
      // Verificar que el driver existe
      const driver = await prisma.driver.findUnique({
        where: { id: driverId },
        include: {
          documents: {
            where: { status: 'PENDING' }
          }
        }
      });
      
      if (!driver) {
        return NextResponse.json(
          { error: 'Driver no encontrado' },
          { status: 404 }
        );
      }
      
      if (driver.documents.length === 0) {
        return NextResponse.json({
          success: true,
          driverId,
          message: 'No hay documentos pendientes para validar',
          results: {
            processed: 0,
            approved: 0,
            rejected: 0,
            needsReview: 0,
            details: []
          }
        });
      }
      
      const results = await aiDocumentValidator.processDriverDocuments(driverId);
      
      return NextResponse.json({
        success: true,
        driverId,
        driverName: driver.fullName,
        results
      });
    }
    
    // Validación de un documento específico
    if (documentId) {
      console.log(`🚀 Iniciando validación de documento ${documentId}`);
      
      const document = await prisma.document.findUnique({
        where: { id: documentId },
        include: { 
          driver: {
            include: {
              vehicles: true
            }
          }
        }
      });
      
      if (!document) {
        return NextResponse.json(
          { error: 'Documento no encontrado' },
          { status: 404 }
        );
      }
      
      if (!document.driveFileId) {
        return NextResponse.json(
          { error: 'El documento no tiene un archivo asociado' },
          { status: 400 }
        );
      }
      
      // Preparar datos del driver para validación cruzada
      const driverData = {
        fullName: document.driver.fullName || undefined,
        cedula: document.driver.cedula || undefined,
        birthDate: document.driver.birthDate?.toISOString().split('T')[0],
        vehiclePlate: document.driver.vehicles?.[0]?.plate || undefined,
        vehicleBrand: document.driver.vehicles?.[0]?.brand || undefined,
        vehicleModel: document.driver.vehicles?.[0]?.model || undefined,
        vehicleYear: document.driver.vehicles?.[0]?.year || undefined,
        vehicleColor: document.driver.vehicles?.[0]?.color || undefined,
      };
      
      const analysis = await aiDocumentValidator.validateDocument(
        documentId,
        document.driveFileId,
        document.type,
        driverData
      );
      
      return NextResponse.json({
        success: true,
        documentId,
        driverId: document.driverId,
        driverName: document.driver.fullName,
        analysis
      });
    }
    
    // Procesamiento en batch
    if (batchSize) {
      console.log(`🚀 Iniciando procesamiento batch de ${batchSize} drivers`);
      
      const results = await aiDocumentValidator.processPendingDocumentsBatch(
        parseInt(batchSize)
      );
      
      return NextResponse.json({
        success: true,
        batchResults: results
      });
    }
    
    return NextResponse.json(
      { error: 'Debe especificar driverId, documentId o batchSize' },
      { status: 400 }
    );
    
  } catch (error: any) {
    console.error('❌ Error en validación de documentos:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Error processing documents',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

