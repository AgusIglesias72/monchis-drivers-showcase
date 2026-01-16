// app/api/reports/upload-only/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { reportsProcessorService } from '@/lib/services/reports-processor.service';
import { emailService } from '@/lib/services/email.service';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

interface UploadOnlyRequest { 
  startDate: string;
  endDate: string;
  notificationEmails?: string[]; // ✅ NUEVO
}

export async function POST(request: NextRequest) {
  try {
    const body: UploadOnlyRequest = await request.json();
    
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

    console.log(`🚀 Procesando solo reportes: ${body.startDate} → ${body.endDate}`);

    // Iniciar en background
    (async () => {
      try {
        const stats = await reportsProcessorService.processAndUpload({
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

        });

        await emailService.sendProcessCompletedEmail({
          startDate: body.startDate,
          endDate: body.endDate,
          reportsStats: {
            totalRows: stats.totalRows,
            dataRows: stats.dataRows,
            processedRanges: stats.processedRanges,
          },
          spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${process.env.GOOGLE_SHEETS_ID}`,
          notificationEmails: body.notificationEmails || [],
        });

        console.log('✅ Reportes procesados exitosamente');
      } catch (error: any) {
        console.error('❌ Error procesando reportes:', error);
        await emailService.sendProcessFailedEmail({
          startDate: body.startDate,
          endDate: body.endDate,
          error: error.message,
          notificationEmails: body.notificationEmails || [],
        });
      }
    })();

    return NextResponse.json({
      success: true,
      message: 'Proceso de reportes iniciado. Recibirás un email cuando finalice.',
      startDate: body.startDate,
      endDate: body.endDate,
    });
    
  } catch (error: any) {
    console.error('❌ Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}