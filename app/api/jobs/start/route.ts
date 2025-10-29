// app/api/jobs/start/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { backgroundJobsService } from '@/lib/services/background-jobs.service';
import { JobType } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { type, metadata } = body;

    // Validaciones
    if (!type || !metadata) {
      return NextResponse.json(
        { error: 'type y metadata son requeridos' },
        { status: 400 }
      );
    }

    // Validar que el tipo sea válido
    const validTypes: JobType[] = ['DRIVER_PROCESSING', 'DOCUMENT_VALIDATION', 'EXPORT_DATA', 'BULK_EMAIL'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Tipo de job inválido: ${type}` },
        { status: 400 }
      );
    }

    // Validaciones específicas por tipo
    if (type === 'DRIVER_PROCESSING') {
      if (!metadata.startDate || !metadata.endDate) {
        return NextResponse.json(
          { error: 'startDate y endDate son requeridos para DRIVER_PROCESSING' },
          { status: 400 }
        );
      }
    }

    // Crear job en DB
    const job = await backgroundJobsService.create({
      type,
      userId,
      metadata,
    });

    console.log(`✅ Job ${job.id} creado por usuario ${userId}`);

    // Iniciar procesamiento en background según el tipo
    if (type === 'DRIVER_PROCESSING') {
      // Importar dinámicamente para evitar problemas
      import('@/lib/services/driver-processor.service')
        .then(module => {
          return module.processDriversWeek(
            job.id,
            metadata.startDate,
            metadata.endDate
          );
        })
        .catch(error => {
          console.error(`❌ Error en job ${job.id}:`, error);
          backgroundJobsService.markAsFailed(
            job.id,
            error.message || 'Error desconocido'
          );
        });
    }
    // TODO: Agregar más tipos de jobs aquí
    // else if (type === 'DOCUMENT_VALIDATION') { ... }
    // else if (type === 'EXPORT_DATA') { ... }

    return NextResponse.json({
      success: true,
      jobId: job.id,
      message: 'Procesamiento iniciado en background',
      job: {
        id: job.id,
        type: job.type,
        status: job.status,
        createdAt: job.createdAt.toISOString(),
      }
    });

  } catch (error: any) {
    console.error('❌ Error al iniciar job:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Error interno',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}