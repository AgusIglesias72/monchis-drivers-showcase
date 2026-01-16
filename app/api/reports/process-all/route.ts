// app/api/reports/process-all/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { backgroundJobsService } from '@/lib/services/background-jobs.service';
import { reportsProcessorService } from '@/lib/services/reports-processor.service';
import { externalDriversProcessor } from '@/lib/services/external-drivers-processor.service';
import { emailService } from '@/lib/services/email.service';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

interface ProcessAllRequest {
    startDate: string;
    endDate: string;
    processExternalDrivers?: boolean;
    concurrency?: number;
    maxDrivers?: number | null;
    notificationEmails?: string[];
    // Credencial opcional: email de ITTI para Okta (ej: "agustin.iglesias@itti.digital")
    // De este email se extrae: googleUsername (antes del @) y oktaEmail (completo)
    // appEmail y appPassword se mantienen del .env
    oktaEmail?: string;
  }

export async function POST(request: NextRequest) {
  try {
  
    const body: ProcessAllRequest = await request.json();
    
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

    console.log(`🚀 Iniciando proceso completo para ${body.startDate} → ${body.endDate}`);
    console.log(`   Process External Drivers: ${body.processExternalDrivers || false}`);

    // Iniciar proceso en background
    (async () => {
      let reportsResult = null;
      let driversJobId = null;
      let driversStats = null;

      try {
        // 1. PROCESAR Y SUBIR REPORTES
        console.log('📊 PASO 1: Procesando reportes...');

        // Extraer googleUsername del oktaEmail si se provee
        const googleUsername = body.oktaEmail ? body.oktaEmail.split('@')[0] : undefined;

        reportsResult = await reportsProcessorService.processAndUpload({
          loginUrl: process.env.APP_LOGIN_URL || 'https://pr-721.durgl9xxo9p82.amplifyapp.com/login',
          reportsUrl: process.env.APP_DRIVERS_URL || 'https://pr-721.durgl9xxo9p82.amplifyapp.com/reports/driverpayment',
          email: process.env.APP_EMAIL!,
          password: process.env.APP_PASSWORD!,
          spreadsheetId: process.env.GOOGLE_SHEETS_ID || '1EvjPf4TUzu7qxMWUy1cjUDGY4FBbCgO8tMYlcOUOt2M',
          sheetName: 'Reporte Pagos',
          startDate: body.startDate,
          endDate: body.endDate,
          daysPerRange: 1,
          headless: false,
          keepBrowserOpen: body.processExternalDrivers, // Mantener abierto si hay PASO 2
          // Credenciales opcionales (fallback a .env si no se proveen)
          googleUsername, // Extraído del oktaEmail
          oktaEmail: body.oktaEmail, // Email completo
          // appEmail y appPassword siempre del .env
        });

        console.log('✅ Reportes procesados y subidos exitosamente');
        console.log(`   Total filas: ${reportsResult.stats.totalRows}`);
        console.log(`   Filas de datos: ${reportsResult.stats.dataRows}`);

        if (reportsResult.session) {
          console.log('🔄 Sesión del navegador preservada para external drivers');
        }

        // 2. PROCESAR EXTERNAL DRIVERS (si está habilitado)
        if (body.processExternalDrivers) {
          console.log('\n🚗 PASO 2: Procesando conductores externos...');

          const job = await backgroundJobsService.create({
            type: 'DRIVER_PROCESSING',
            userId: '1',
            metadata: {
              startDate: body.startDate,
              endDate: body.endDate,
              concurrency: body.concurrency || 3,
              maxDrivers: body.maxDrivers || null,
              spreadsheetsId: process.env.GOOGLE_SHEETS_ID || '1EvjPf4TUzu7qxMWUy1cjUDGY4FBbCgO8tMYlcOUOt2M',
              reportSheetName: 'Reporte Pagos',
              driveFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID!,
              loginUrl: process.env.APP_LOGIN_URL || 'https://pr-721.durgl9xxo9p82.amplifyapp.com/login',
              driversPageUrl: process.env.APP_DRIVERS_URL || 'https://pr-721.durgl9xxo9p82.amplifyapp.com/reports/driverpayment',
              email: process.env.APP_EMAIL!,
              password: process.env.APP_PASSWORD!,
              ownerEmail: process.env.OWNER_EMAIL,
            },
          });

          driversJobId = job.id;
          console.log(`✅ Job de drivers creado: ${driversJobId}`);

          // Procesar con sesión compartida si existe
          await externalDriversProcessor.processJob(driversJobId, reportsResult.session);

          // Obtener resultados
          const jobResult = await backgroundJobsService.getById(driversJobId);
          if (jobResult?.result) {
            driversStats = jobResult.result as any;
            console.log('✅ Conductores externos procesados exitosamente');
          }

          // Cerrar el navegador compartido después de procesar
          if (reportsResult.session?.browser) {
            console.log('🔒 Cerrando navegador compartido...');
            await reportsResult.session.browser.close();
          }
        }

        // 3. ENVIAR EMAIL DE ÉXITO
        console.log('\n📧 Enviando email de notificación...');
        await emailService.sendProcessCompletedEmail({
            startDate: body.startDate,
            endDate: body.endDate,
          reportsStats: {
            totalRows: reportsResult.stats.totalRows,
            dataRows: reportsResult.stats.dataRows,
            processedRanges: reportsResult.stats.processedRanges,
          },
          driversStats: driversStats ? {
            successful: driversStats.successful,
            failed: driversStats.failed,
            total: driversStats.total,
            errors: driversStats.errors,
          } : undefined,
          spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${process.env.GOOGLE_SHEETS_ID}`,
          notificationEmails: body.notificationEmails || [],
        });

        console.log('✅ Proceso completo finalizado exitosamente');

      } catch (error: any) {
        console.error('❌ Error en proceso completo:', error);
        
        // Enviar email de error
        await emailService.sendProcessFailedEmail({
          startDate: body.startDate,
          endDate: body.endDate,
          error: error.message,
          notificationEmails: body.notificationEmails || [],
        });
      }
    })();

    // Responder inmediatamente
    return NextResponse.json({
      success: true,
      message: 'Proceso iniciado en background. Recibirás un email cuando finalice.',
      startDate: body.startDate,
      endDate: body.endDate,
      processExternalDrivers: body.processExternalDrivers || false,
    });
    
  } catch (error: any) {
    console.error('❌ Error iniciando proceso:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Error al iniciar el proceso'
      },
      { status: 500 }
    );
  }
}