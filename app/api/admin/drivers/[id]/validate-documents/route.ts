// app/api/admin/drivers/[id]/validate-documents/route.ts
// Este endpoint SÍ lo dejamos como API porque es una acción (POST)

import { NextRequest, NextResponse } from 'next/server';
import { aiDocumentValidator } from '@/lib/services/ai-document-validator.service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const driverId = resolvedParams.id;
    
    console.log(`🚀 Iniciando validación de documentos para driver ${driverId}`);
    
    const results = await aiDocumentValidator.processDriverDocuments(driverId);
    
    return NextResponse.json({
      success: true,
      driverId,
      results
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