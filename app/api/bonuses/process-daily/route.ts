// app/api/bonuses/process-daily/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminOrCron } from '@/lib/auth';
import { backgroundJobsService } from '@/lib/services/background-jobs.service';
import { bonusProcessorService } from '@/lib/services/bonus-processor.service';
import { emailService } from '@/lib/services/email.service';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutos

interface ProcessDailyRequest {
  bonusDate: string; // YYYY-MM-DD
  executionMode?: 'DRY_RUN' | 'EXECUTE';
  scope?: 'FULL' | 'SHEETS_ONLY';
  notificationEmails?: string[];
  keepBrowserOpen?: boolean;
  startFromExtra?: string; // Para retomar desde un extra específico (salta los anteriores)
  skipSheetUpload?: boolean; // Salta descarga de Excel y upload a Sheet (usa el sheet existente)
  stores?: string[]; // Bono puntual por sucursal: solo procesa pedidos cuyo storeName "contiene" alguno (normalizado)
}

export async function POST(request: NextRequest) {
  try {
    // En local saltamos la auth para poder iterar sin Clerk ni CRON_SECRET.
    // En Vercel (NODE_ENV=production) siempre exige admin o Bearer.
    if (process.env.NODE_ENV === 'production') {
      const guard = await requireAdminOrCron(request);
      if (guard && !guard.ok) return guard.response;
    }

    const body: ProcessDailyRequest = await request.json();

    // ========== VALIDACIONES ==========

    if (!body.bonusDate) {
      return NextResponse.json(
        { success: false, error: 'bonusDate es requerido (formato: YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    // Validar formato de fecha
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(body.bonusDate)) {
      return NextResponse.json(
        { success: false, error: 'Formato de fecha inválido. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    // Validar que la fecha no sea futura
    const bonusDate = new Date(body.bonusDate);
    bonusDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (bonusDate > today) {
      return NextResponse.json(
        { success: false, error: 'No se pueden procesar bonos de fechas futuras' },
        { status: 400 }
      );
    }

    // Validar executionMode
    const executionMode = body.executionMode || 'DRY_RUN';
    if (executionMode !== 'DRY_RUN' && executionMode !== 'EXECUTE') {
      return NextResponse.json(
        { success: false, error: 'executionMode debe ser DRY_RUN o EXECUTE' },
        { status: 400 }
      );
    }

    // Validar scope
    const scope = body.scope || 'FULL';
    if (scope !== 'FULL' && scope !== 'SHEETS_ONLY') {
      return NextResponse.json(
        { success: false, error: 'scope debe ser FULL o SHEETS_ONLY' },
        { status: 400 }
      );
    }

    console.log(`🚀 Iniciando proceso de bonos para ${body.bonusDate}`);
    console.log(`   Modo: ${executionMode}`);
    console.log(`   Scope: ${scope}`);

    // ========== CREAR BACKGROUND JOB ==========

    const job = await backgroundJobsService.create({
      type: 'BONUS_PROCESSING',
      userId: '1', // Sistema
      metadata: {
        bonusDate: body.bonusDate,
        executionMode,
        scope,
        notificationEmails: body.notificationEmails,
      },
    });

    console.log(`   Job ID: ${job.id}`);

    // ========== INICIAR PROCESO EN BACKGROUND ==========

    (async () => {
      try {
        await backgroundJobsService.updateStatus(job.id, 'PROCESSING');
        await backgroundJobsService.addLog(job.id, '🚀 Iniciando proceso de bonos...');
        await backgroundJobsService.addLog(job.id, `📅 Fecha: ${body.bonusDate}`);
        await backgroundJobsService.addLog(job.id, `🏃 Modo: ${executionMode}`);
        await backgroundJobsService.addLog(job.id, `🎯 Scope: ${scope}`);
        if (body.stores && body.stores.length > 0) {
          await backgroundJobsService.addLog(job.id, `🏪 Bono por sucursal — solo: ${body.stores.join(', ')}`);
        }
        if (body.skipSheetUpload) {
          await backgroundJobsService.addLog(job.id, `⏭️  Saltando generación de sheet (usando existente)`);
        }
        if (body.startFromExtra) {
          await backgroundJobsService.addLog(job.id, `⏭️  Retomando desde extra: ${body.startFromExtra}`);
        }

        // Ejecutar proceso
        const result = await bonusProcessorService.process({
          bonusDate: body.bonusDate,
          executionMode,
          scope,
          notificationEmails: body.notificationEmails,
          keepBrowserOpen: body.keepBrowserOpen || false,
          startFromExtra: body.startFromExtra,
          skipSheetUpload: body.skipSheetUpload || false,
          stores: body.stores,
        });

        // Guardar resultado
        await backgroundJobsService.saveResult(job.id, result);

        // Actualizar progreso
        await backgroundJobsService.updateProgress(
          job.id,
          result.stats.driversProcessed,
          result.stats.driversProcessed
        );

        // Logs de resultado
        await backgroundJobsService.addLogs(job.id, [
          '',
          '✅ ========== PROCESO COMPLETADO ==========',
          `📦 Pedidos procesados: ${result.stats.totalOrders}`,
          `👥 Conductores beneficiados: ${result.stats.driversProcessed}`,
          `🎁 Extras creados: ${result.stats.extrasCreated}`,
          `✅ Asignaciones exitosas: ${result.stats.assignmentsSuccessful}`,
          `❌ Asignaciones fallidas: ${result.stats.assignmentsFailed}`,
          `💰 Total a pagar: ${result.stats.totalPayoutAmount.toLocaleString('es-PY')} Gs`,
          '',
        ]);

        if (result.duplicatesDetected && result.duplicatesDetected > 0) {
          await backgroundJobsService.addLog(
            job.id,
            `⚠️  ${result.duplicatesDetected} conductores ya tenían bonos (duplicados filtrados)`
          );
        }

        if (result.errors && result.errors.length > 0) {
          await backgroundJobsService.addLog(job.id, `❌ ${result.errors.length} errores:`);
          result.errors.slice(0, 5).forEach((err) => {
            backgroundJobsService.addLog(job.id, `   - ${err.driver}: ${err.error}`);
          });
          if (result.errors.length > 5) {
            await backgroundJobsService.addLog(job.id, `   ... y ${result.errors.length - 5} más`);
          }
        }

        await backgroundJobsService.addLog(job.id, '==========================================');

        // Marcar como completado
        await backgroundJobsService.updateStatus(job.id, 'COMPLETED');

        // Enviar email de notificación
        console.log('📧 Enviando email de notificación...');

        await emailService.sendBonusProcessCompletedEmail({
          bonusDate: body.bonusDate,
          executionMode: result.executionMode,
          stats: result.stats,
          errors: result.errors,
          notificationEmails: body.notificationEmails,
        });

        console.log('✅ Email enviado exitosamente');
      } catch (error: any) {
        console.error('❌ Error en proceso de bonos:', error);

        await backgroundJobsService.addLog(job.id, `❌ ERROR: ${error.message}`);
        await backgroundJobsService.markAsFailed(job.id, error.message);

        // Enviar email de error
        try {
          await emailService.sendBonusProcessCompletedEmail({
            bonusDate: body.bonusDate,
            executionMode: executionMode,
            stats: {
              totalOrders: 0,
              driversProcessed: 0,
              extrasCreated: 0,
              assignmentsSuccessful: 0,
              assignmentsFailed: 0,
              totalPayoutAmount: 0,
            },
            errors: [{ driver: 'SISTEMA', error: error.message }],
            notificationEmails: body.notificationEmails,
          });
        } catch (emailError) {
          console.error('❌ Error al enviar email de error:', emailError);
        }
      }
    })();

    // ========== RESPONDER INMEDIATAMENTE ==========

    const messageMap: Record<string, string> = {
      'SHEETS_ONLY': `Solo sheets: se subirán pedidos y resumen de bonos para ${body.bonusDate}. Sin creación de extras ni asignaciones.`,
      'FULL_DRY_RUN': `Simulación completa de bonos iniciada para ${body.bonusDate}. El proceso se ejecutará en background.`,
      'FULL_EXECUTE': `Proceso de bonos iniciado para ${body.bonusDate}. El proceso se ejecutará en background.`,
    };
    const messageKey = scope === 'SHEETS_ONLY' ? 'SHEETS_ONLY' : `FULL_${executionMode}`;

    return NextResponse.json(
      {
        success: true,
        message: messageMap[messageKey],
        jobId: job.id,
        bonusDate: body.bonusDate,
        executionMode,
        scope,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('❌ Error al iniciar proceso de bonos:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al iniciar el proceso de bonos',
      },
      { status: 500 }
    );
  }
}
