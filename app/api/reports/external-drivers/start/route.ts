// app/api/reports/external-drivers/start/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { backgroundJobsService } from '@/lib/services/background-jobs.service';
import { externalDriversProcessor } from '@/lib/services/external-drivers-processor.service';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutos para la función (el proceso real continúa en background)

interface StartJobRequest {
  startDate: string;
  endDate: string;
  concurrency?: number;
  maxDrivers?: number | null;
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const body: StartJobRequest = await request.json();
    
    // Validaciones
    if (!body.startDate || !body.endDate) {
      return NextResponse.json(
        { success: false, error: 'startDate y endDate son requeridos' },
        { status: 400 }
      );
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(body.startDate) || !dateRegex.test(body.endDate)) {
      return NextResponse.json(
        { success: false, error: 'Formato de fecha inválido. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    const start = new Date(body.startDate);
    const end = new Date(body.endDate);
    
    if (start > end) {
      return NextResponse.json(
        { success: false, error: 'La fecha de inicio debe ser anterior a la fecha de fin' },
        { status: 400 }
      );
    }

    // Crear job en DB
    const job = await backgroundJobsService.create({
      type: 'DRIVER_PROCESSING',
      userId,
      metadata: {
        startDate: body.startDate,
        endDate: body.endDate,
        concurrency: body.concurrency || 3,
        maxDrivers: body.maxDrivers || null,
        spreadsheetsId: process.env.GOOGLE_SHEETS_DRIVERS_EXTERNOS!,
        driveFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID!,
        loginUrl: process.env.APP_LOGIN_URL || 'https://pr-721.durgl9xxo9p82.amplifyapp.com/auth/login',
        driversPageUrl: process.env.APP_DRIVERS_URL || 'https://pr-721.durgl9xxo9p82.amplifyapp.com/reports/driverpayment',
        email: process.env.APP_EMAIL!,
        password: process.env.APP_PASSWORD!,
        ownerEmail: process.env.OWNER_EMAIL,
      },
    });

    console.log(`🚀 Job ${job.id} creado, iniciando procesamiento...`);

    // Iniciar procesamiento en background de forma INMEDIATA
    // NO usar await aquí - queremos que se ejecute en paralelo
    externalDriversProcessor.processJob(job.id).catch((error) => {
      console.error(`❌ Error crítico procesando job ${job.id}:`, error);
      // Intentar marcar como fallido
      backgroundJobsService.markAsFailed(job.id, error.message).catch(console.error);
    });

    // Dar un pequeño delay para que el job empiece
    await new Promise(resolve => setTimeout(resolve, 100));

    return NextResponse.json({
      success: true,
      jobId: job.id,
      message: 'Proceso iniciado exitosamente',
    });
    
  } catch (error: any) {
    console.error('❌ Error iniciando job:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Error al iniciar el proceso'
      },
      { status: 500 }
    );
  }
}