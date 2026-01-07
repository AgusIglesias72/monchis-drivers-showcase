// lib/services/document-cleanup.service.ts

import { prisma } from '@/lib/prisma'
import { FormDocumentStatus } from '@prisma/client'

interface CleanupResult {
  success: boolean
  dryRun: boolean
  totalDocumentsAnalyzed: number
  duplicatesFound: number
  documentsDeleted: number
  documentsKept: number
  details: {
    driverId: string
    driverName: string
    fileName: string
    duplicatesFound: number
    kept: Array<{
      id: string
      status: FormDocumentStatus
      uploadedAt: Date
    }>
    deleted: Array<{
      id: string
      status: FormDocumentStatus
      uploadedAt: Date
    }>
  }[]
  errors: string[]
}

interface CleanupOptions {
  dryRun?: boolean // Si true, solo simula sin eliminar
  maxDeletesPerRun?: number // Límite de seguridad
  driverIds?: string[] // Si se especifica, solo limpia estos drivers
}

/**
 * Limpia documentos duplicados basándose en fileName
 *
 * Reglas de prioridad:
 * 1. Mantener TODOS los documentos APPROVED
 * 2. Del resto (PENDING/REJECTED/IN_REVIEW), mantener solo el más reciente por fileName
 * 3. Eliminar los duplicados más antiguos
 */
export async function cleanupDuplicateDocuments(
  options: CleanupOptions = {}
): Promise<CleanupResult> {
  const {
    dryRun = true, // Por defecto en modo seguro
    maxDeletesPerRun = 100, // Límite de seguridad
    driverIds
  } = options

  const result: CleanupResult = {
    success: true,
    dryRun,
    totalDocumentsAnalyzed: 0,
    duplicatesFound: 0,
    documentsDeleted: 0,
    documentsKept: 0,
    details: [],
    errors: []
  }

  try {
    // Obtener todos los drivers con documentos
    const whereClause = driverIds ? { id: { in: driverIds } } : {}

    const drivers = await prisma.formDriver.findMany({
      where: whereClause,
      select: {
        id: true,
        fullName: true,
        firstName: true,
        lastName: true,
        documents: {
          select: {
            id: true,
            fileName: true,
            status: true,
            uploadedAt: true,
            documentType: true,
          },
          orderBy: {
            uploadedAt: 'desc'
          }
        }
      }
    })

    console.log(`[DOCUMENT CLEANUP] Analizando ${drivers.length} drivers...`)

    let totalDeletes = 0

    for (const driver of drivers) {
      const documents = driver.documents

      if (documents.length === 0) continue

      result.totalDocumentsAnalyzed += documents.length

      // Agrupar documentos por fileName
      const groupedByFileName = new Map<string, typeof documents>()

      for (const doc of documents) {
        if (!doc.fileName) continue

        const existing = groupedByFileName.get(doc.fileName) || []
        existing.push(doc)
        groupedByFileName.set(doc.fileName, existing)
      }

      // Procesar cada grupo de archivos con el mismo nombre
      for (const [fileName, docs] of groupedByFileName.entries()) {
        if (docs.length <= 1) {
          // No hay duplicados
          result.documentsKept += docs.length
          continue
        }

        // Hay duplicados, aplicar reglas de limpieza
        console.log(`[DOCUMENT CLEANUP] Driver ${driver.fullName}: encontrados ${docs.length} documentos con nombre "${fileName}"`)

        // Separar aprobados del resto
        const approved = docs.filter(d => d.status === 'APPROVED')
        const others = docs.filter(d => d.status !== 'APPROVED')

        // TODOS los aprobados se mantienen
        const toKeep = [...approved]
        result.documentsKept += approved.length

        // Del resto, mantener solo el más reciente
        if (others.length > 0) {
          // Ya están ordenados por uploadedAt desc, el primero es el más reciente
          const mostRecent = others[0]
          toKeep.push(mostRecent)
          result.documentsKept += 1

          // Los demás se eliminan
          const toDelete = others.slice(1)

          result.duplicatesFound += toDelete.length
          totalDeletes += toDelete.length

          // Verificar límite de seguridad
          if (totalDeletes > maxDeletesPerRun) {
            result.errors.push(
              `Límite de seguridad alcanzado: ${maxDeletesPerRun} eliminaciones. Deteniendo limpieza.`
            )
            console.warn(`[DOCUMENT CLEANUP] ⚠️ Límite de seguridad alcanzado`)
            break
          }

          // Registrar detalles
          result.details.push({
            driverId: driver.id,
            driverName: driver.fullName || `${driver.firstName} ${driver.lastName}`,
            fileName,
            duplicatesFound: toDelete.length,
            kept: toKeep.map(d => ({
              id: d.id,
              status: d.status,
              uploadedAt: d.uploadedAt
            })),
            deleted: toDelete.map(d => ({
              id: d.id,
              status: d.status,
              uploadedAt: d.uploadedAt
            }))
          })

          // Eliminar si no es dry-run
          if (!dryRun) {
            try {
              const deleteResult = await prisma.formDocument.deleteMany({
                where: {
                  id: {
                    in: toDelete.map(d => d.id)
                  }
                }
              })

              result.documentsDeleted += deleteResult.count
              console.log(
                `[DOCUMENT CLEANUP] ✅ Eliminados ${deleteResult.count} documentos duplicados de "${fileName}" para ${driver.fullName}`
              )
            } catch (error: any) {
              const errorMsg = `Error al eliminar documentos de ${driver.fullName}: ${error.message}`
              result.errors.push(errorMsg)
              console.error(`[DOCUMENT CLEANUP] ❌ ${errorMsg}`)
            }
          } else {
            // Modo dry-run: solo contar
            result.documentsDeleted += toDelete.length
            console.log(
              `[DOCUMENT CLEANUP] [DRY-RUN] Se eliminarían ${toDelete.length} documentos duplicados de "${fileName}" para ${driver.fullName}`
            )
          }
        } else {
          // Solo hay documentos aprobados, no hay nada que eliminar
          result.documentsKept += docs.length
        }
      }

      // Si alcanzamos el límite, salir del loop principal
      if (totalDeletes > maxDeletesPerRun) {
        break
      }
    }

    console.log(`[DOCUMENT CLEANUP] Resumen:`)
    console.log(`  - Modo: ${dryRun ? 'DRY-RUN (simulación)' : 'REAL'}`)
    console.log(`  - Documentos analizados: ${result.totalDocumentsAnalyzed}`)
    console.log(`  - Duplicados encontrados: ${result.duplicatesFound}`)
    console.log(`  - Documentos eliminados: ${result.documentsDeleted}`)
    console.log(`  - Documentos mantenidos: ${result.documentsKept}`)
    console.log(`  - Drivers con duplicados: ${result.details.length}`)

  } catch (error: any) {
    result.success = false
    result.errors.push(`Error general: ${error.message}`)
    console.error(`[DOCUMENT CLEANUP] ❌ Error general:`, error)
  }

  return result
}
