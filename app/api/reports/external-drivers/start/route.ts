// app/api/reports/external-drivers/start/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { backgroundJobsService } from '@/lib/services/background-jobs.service';
import { externalDriversProcessor } from '@/lib/services/external-drivers-processor.service';
import { emailService } from '@/lib/services/email.service';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

interface StartJobRequest {
  startDate: string;
  endDate: string;
  concurrency?: number;
  maxDrivers?: number | null;
  notificationEmails?: string[]; // ✅ NUEVO
}

export async function POST(request: NextRequest) {
  try {
    const body: StartJobRequest = await request.json();
    
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

    const job = await backgroundJobsService.create({
      type: 'DRIVER_PROCESSING',
      userId: '1',
      metadata: {
        startDate: body.startDate,
        endDate: body.endDate,
        concurrency: body.concurrency || 3,
        maxDrivers: body.maxDrivers || null,
        spreadsheetsId: process.env.GOOGLE_SHEETS_ID || '1EvjPf4TUzu7qxMWUy1cjUDGY4FBbCgO8tMYlcOUOt2M',
        reportSheetName: 'Reporte Pagos', // ✅ NUEVO: Leer de aquí
        driveFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID!,
        loginUrl: process.env.APP_LOGIN_URL || 'https://pr-721.durgl9xxo9p82.amplifyapp.com/login',
        driversPageUrl: process.env.APP_DRIVERS_URL || 'https://pr-721.durgl9xxo9p82.amplifyapp.com/reports/driverpayment',
        email: process.env.APP_EMAIL!,
        password: process.env.APP_PASSWORD!,
        ownerEmail: process.env.OWNER_EMAIL,
        notificationEmails: body.notificationEmails || [],
      },
    });

    console.log(`🚀 Job ${job.id} creado, iniciando procesamiento...`);

    // Procesar en background
    externalDriversProcessor.processJob(job.id).then(async () => {
      // Enviar email cuando termine
      const jobResult = await backgroundJobsService.getById(job.id);
      if (jobResult?.result) {
        const stats = jobResult.result as any;
        await emailService.sendProcessCompletedEmail({
          startDate: body.startDate,
          endDate: body.endDate,
          driversStats: {
            successful: stats.successful,
            failed: stats.failed,
            total: stats.total,
            errors: stats.errors,
          },
          notificationEmails: body.notificationEmails || [],
        });
      }
    }).catch(async (error) => {
      console.error(`❌ Error procesando job ${job.id}:`, error);
      await backgroundJobsService.markAsFailed(job.id, error.message);
      await emailService.sendProcessFailedEmail({
        startDate: body.startDate,
        endDate: body.endDate,
        error: error.message, 
        notificationEmails: body.notificationEmails || [],
      });
    });

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