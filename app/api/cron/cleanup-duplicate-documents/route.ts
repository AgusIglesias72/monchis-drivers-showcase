// app/api/cron/cleanup-duplicate-documents/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { cleanupDuplicateDocuments } from '@/lib/services/document-cleanup.service'

/**
 * Endpoint para limpiar documentos duplicados
 *
 * Uso:
 * - GET sin parámetros: Ejecuta en modo dry-run (solo simula)
 * - GET ?dryRun=false: Ejecuta eliminación real
 * - GET ?driverIds=id1,id2: Limpia solo drivers específicos
 * - GET ?maxDeletes=50: Limita las eliminaciones
 *
 * Para Vercel Cron: Configurar con dryRun=false en vercel.json
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar autorización (solo para requests de Vercel Cron o con auth header)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    // Solo validar en producción
    const isProduction = process.env.NODE_ENV === 'production'

    // Si existe CRON_SECRET y estamos en producción, validar
    if (isProduction && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Obtener parámetros de la URL
    const searchParams = request.nextUrl.searchParams
    const dryRunParam = searchParams.get('dryRun')
    const maxDeletesParam = searchParams.get('maxDeletes')
    const driverIdsParam = searchParams.get('driverIds')

    // Por defecto: dry-run activado para seguridad
    const dryRun = dryRunParam === 'false' ? false : true
    const maxDeletesPerRun = maxDeletesParam ? parseInt(maxDeletesParam) : 100

    // Parse driver IDs si se especificaron
    const driverIds = driverIdsParam
      ? driverIdsParam.split(',').filter(id => id.trim())
      : undefined

    console.log('[API] Iniciando limpieza de documentos duplicados...')
    console.log(`[API] Modo: ${dryRun ? 'DRY-RUN' : 'REAL'}`)
    console.log(`[API] Límite: ${maxDeletesPerRun} eliminaciones`)
    if (driverIds) {
      console.log(`[API] Solo drivers: ${driverIds.join(', ')}`)
    }

    // Ejecutar limpieza
    const result = await cleanupDuplicateDocuments({
      dryRun,
      maxDeletesPerRun,
      driverIds
    })

    // Preparar respuesta
    const statusCode = result.success ? 200 : 500

    const response = {
      ...result,
      message: dryRun
        ? '✅ Simulación completada. Usa ?dryRun=false para eliminar realmente.'
        : result.success
        ? '✅ Limpieza completada exitosamente'
        : '❌ Limpieza completada con errores',
      timestamp: new Date().toISOString(),
      params: {
        dryRun,
        maxDeletesPerRun,
        driverIds: driverIds || 'todos'
      }
    }

    return NextResponse.json(response, { status: statusCode })
  } catch (error: any) {
    console.error('[API] Error en cleanup-duplicate-documents:', error)

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
