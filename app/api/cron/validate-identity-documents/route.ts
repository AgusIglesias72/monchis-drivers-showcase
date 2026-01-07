// app/api/cron/validate-identity-documents/route.ts
//
// 🚨 IMPORTANTE: Este cron job está PREPARADO pero NO ACTIVO
//
// Para activarlo, agrega esto a vercel.json:
// {
//   "crons": [
//     {
//       "path": "/api/cron/validate-identity-documents",
//       "schedule": "0 9-19 * * *"  // Cada hora entre 9am y 7pm
//     }
//   ]
// }
//
// O puedes ejecutarlo manualmente con:
// curl -X GET https://tu-dominio.com/api/cron/validate-identity-documents \
//   -H "Authorization: Bearer $CRON_SECRET"

import { NextRequest, NextResponse } from 'next/server';
import { paraguayIdentityValidator } from '@/lib/services/paraguay-identity-validator.service';

// ==================== CONFIGURACIÓN ====================

const MAX_DRIVERS_PER_EXECUTION = 10; // Límite de conductores por ejecución
const DELAY_BETWEEN_VALIDATIONS_MS = 3000; // 3 segundos entre validaciones para no saturar API

// ==================== HELPERS ====================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ==================== ENDPOINT ====================

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Verificar autorización
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.error('❌ [CRON] Unauthorized: Invalid or missing authorization');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔄 [CRON] Starting validate-identity-documents job...');
    console.log(`📊 [CRON] Max drivers per execution: ${MAX_DRIVERS_PER_EXECUTION}`);

    // Ejecutar batch de validaciones
    const results = await paraguayIdentityValidator.processPendingValidationsBatch(
      MAX_DRIVERS_PER_EXECUTION
    );

    const stats = {
      totalProcessed: results.totalProcessed,
      approved: results.approved,
      rejected: results.rejected,
      needsReview: results.needsReview,
      errors: results.errors,
      executionTimeMs: Date.now() - startTime,
    };

    console.log('✅ [CRON] Job completed:');
    console.log(`   - Total procesados: ${stats.totalProcessed}`);
    console.log(`   - Aprobados: ${stats.approved}`);
    console.log(`   - Rechazados: ${stats.rejected}`);
    console.log(`   - Requieren revisión: ${stats.needsReview}`);
    console.log(`   - Errores: ${stats.errors}`);
    console.log(`   - Tiempo de ejecución: ${stats.executionTimeMs}ms`);

    return NextResponse.json({
      success: true,
      message: `Processed ${stats.totalProcessed} drivers: ${stats.approved} approved, ${stats.rejected} rejected, ${stats.needsReview} need review`,
      stats,
      details: results.details,
    });
  } catch (error) {
    console.error('❌ [CRON] Job failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stats: {
          totalProcessed: 0,
          approved: 0,
          rejected: 0,
          needsReview: 0,
          errors: 0,
          executionTimeMs: Date.now() - startTime,
        },
      },
      { status: 500 }
    );
  }
}
