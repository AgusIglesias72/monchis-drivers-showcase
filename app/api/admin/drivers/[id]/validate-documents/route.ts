// app/api/admin/drivers/[id]/validate-documents/route.ts
// Endpoint para validar documentos de un conductor

import { NextRequest, NextResponse } from 'next/server';
import { paraguayIdentityValidator } from '@/lib/services/paraguay-identity-validator.service';
import { aiDocumentValidator } from '@/lib/services/ai-document-validator.service';
import { cleanupDuplicateDocuments } from '@/lib/services/document-cleanup.service';
import { prisma } from '@/lib/prisma';
import { requireAdminApi } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireAdminApi();
    if (!guard.ok) return guard.response;

    const resolvedParams = await params;
    const driverId = resolvedParams.id;

    console.log(`🚀 Iniciando validación de documentos para driver ${driverId}`);

    // 🧹 PASO 1: Limpiar documentos duplicados antes de validar
    console.log(`  🧹 Limpiando documentos duplicados...`);
    const cleanupResult = await cleanupDuplicateDocuments({
      dryRun: false, // Ejecutar limpieza real
      driverIds: [driverId], // Solo para este driver
      maxDeletesPerRun: 50 // Límite de seguridad
    });

    if (cleanupResult.duplicatesFound > 0) {
      console.log(`     ✓ Duplicados eliminados: ${cleanupResult.documentsDeleted}`);
      console.log(`     ✓ Documentos mantenidos: ${cleanupResult.documentsKept}`);
    } else {
      console.log(`     ✓ No se encontraron duplicados`);
    }

    // Verificar qué tipo de documentos tiene el conductor
    const documents = await prisma.formDocument.findMany({
      where: {
        formDriverId: driverId,
        status: 'PENDING'
      },
      select: {
        documentType: true
      }
    });

    const documentTypes = new Set(documents.map(d => d.documentType));
    const hasIdentityDocs =
      documentTypes.has('CEDULA') &&
      documentTypes.has('CRIMINAL_RECORD');

    let results: any;

    if (hasIdentityDocs) {
      // Usar el validador especializado de identidad paraguaya
      console.log('  📋 Usando validador de identidad paraguaya (Cédula + Antecedentes)');
      results = await paraguayIdentityValidator.validateIdentityDocuments(driverId);
    } else {
      // Usar el validador genérico para otros documentos
      console.log('  📋 Usando validador genérico de documentos');
      results = await aiDocumentValidator.processDriverDocuments(driverId);
    }

    return NextResponse.json({
      success: true,
      driverId,
      results,
      validationType: hasIdentityDocs ? 'paraguay_identity' : 'generic',
      cleanup: {
        duplicatesFound: cleanupResult.duplicatesFound,
        documentsDeleted: cleanupResult.documentsDeleted,
        documentsKept: cleanupResult.documentsKept
      }
    });
  } catch (error: any) {
    console.error('Error validando documentos:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    );
  }
}