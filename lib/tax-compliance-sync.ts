// lib/tax-compliance-sync.ts
/**
 * Helper para sincronizar documentos TAX_COMPLIANCE con FinancialService
 * 
 * Este módulo maneja la lógica de sincronización bidireccional entre
 * los documentos de certificado tributario y el registro de facturación
 */

import { prisma } from '@/lib/prisma'

interface SyncResult {
  success: boolean
  financialServiceId?: string
  error?: string
}

/**
 * Sincroniza un documento TAX_COMPLIANCE aprobado con FinancialService
 * 
 * @param documentId - ID del documento TAX_COMPLIANCE aprobado
 * @param ruc - RUC extraído del documento (manual u OCR) - OPCIONAL si ya existe
 * @param businessName - Razón social (opcional)
 * @returns Resultado de la sincronización
 */
export async function syncTaxComplianceToFinancialService(
  documentId: string,
  ruc?: string,
  businessName?: string
): Promise<SyncResult> {
  try {
    // 1. Obtener el documento y verificar que sea TAX_COMPLIANCE y esté aprobado
    const document = await prisma.formDocument.findUnique({
      where: { id: documentId },
      include: {
        formDriver: true
      }
    })

    if (!document) {
      return { success: false, error: 'Documento no encontrado' }
    }

    if (document.documentType !== 'TAX_COMPLIANCE') {
      return { success: false, error: 'El documento no es de tipo TAX_COMPLIANCE' }
    }

    if (document.status !== 'APPROVED') {
      return { success: false, error: 'El documento debe estar aprobado antes de sincronizar' }
    }

    if (!document.formDriver) {
      return { success: false, error: 'No se encontró el conductor asociado' }
    }

    const formDriverId = document.formDriver.id

    // 2. Crear o actualizar FinancialService
    const updateData: any = {
      hasInvoice: true, // Si sube TAX_COMPLIANCE, tiene factura
      taxComplianceUrl: document.blobUrl,
      updatedAt: new Date()
    }

    // Solo actualizar RUC si se proporciona
    if (ruc) {
      updateData.invoiceRuc = ruc
    }

    const financialService = await prisma.financialService.upsert({
      where: { formDriverId },
      create: {
        formDriverId,
        hasInvoice: true,
        invoiceRuc: ruc || null,
        taxComplianceUrl: document.blobUrl,
      },
      update: updateData
    })

    console.log(`✅ Sincronizado TAX_COMPLIANCE ${documentId} con FinancialService ${financialService.id}`)

    return {
      success: true,
      financialServiceId: financialService.id
    }

  } catch (error) {
    console.error('Error al sincronizar TAX_COMPLIANCE:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }
  }
}

/**
 * Desvincula un documento TAX_COMPLIANCE rechazado/eliminado de FinancialService
 * 
 * @param documentId - ID del documento TAX_COMPLIANCE
 * @returns Resultado de la operación
 */
export async function unsyncTaxComplianceFromFinancialService(
  documentId: string
): Promise<SyncResult> {
  try {
    // 1. Buscar el documento para obtener el formDriverId
    const document = await prisma.formDocument.findUnique({
      where: { id: documentId },
      select: { formDriverId: true, blobUrl: true }
    })

    if (!document) {
      return { success: true } // No existe, nada que hacer
    }

    // 2. Buscar FinancialService vinculado por URL
    const financialService = await prisma.financialService.findFirst({
      where: {
        formDriverId: document.formDriverId,
        taxComplianceUrl: document.blobUrl
      }
    })

    if (!financialService) {
      return { success: true } // No hay nada vinculado
    }

    // 3. Limpiar la referencia en FinancialService
    await prisma.financialService.update({
      where: { id: financialService.id },
      data: {
        hasInvoice: false,
        taxComplianceUrl: null,
        // Opcionalmente limpiar el RUC también
        // invoiceRuc: null,
      }
    })

    console.log(`✅ Desvinculado TAX_COMPLIANCE ${documentId} de FinancialService`)

    return { success: true }

  } catch (error) {
    console.error('Error al desvincular TAX_COMPLIANCE:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }
  }
}

/**
 * Obtiene el estado de sincronización de un conductor
 * 
 * @param formDriverId - ID del FormDriver
 * @returns Estado de sincronización
 */
export async function getTaxComplianceSyncStatus(formDriverId: string) {
  try {
    const financialService = await prisma.financialService.findUnique({
      where: { formDriverId },
      include: {
        formDriver: {
          include: {
            documents: {
              where: {
                documentType: 'TAX_COMPLIANCE',
                status: 'APPROVED'
              },
              orderBy: {
                createdAt: 'desc'
              },
              take: 1
            }
          }
        }
      }
    })

    if (!financialService) {
      return {
        hasTaxCompliance: false,
        hasInvoice: false,
        document: null,
        ruc: null
      }
    }

    const latestDoc = financialService.formDriver.documents[0]

    return {
      hasTaxCompliance: !!financialService.taxComplianceUrl,
      hasInvoice: financialService.hasInvoice,
      document: latestDoc || null,
      ruc: financialService.invoiceRuc,
      taxComplianceUrl: financialService.taxComplianceUrl,
      interestedInConto: financialService.interestedInConto
    }

  } catch (error) {
    console.error('Error al obtener estado de sincronización:', error)
    return {
      hasTaxCompliance: false,
      hasInvoice: false,
      document: null,
      ruc: null,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }
  }
}

/**
 * Valida si un RUC es válido (formato paraguayo)
 * 
 * @param ruc - RUC a validar
 * @returns true si es válido
 */
export function validateRUC(ruc: string): boolean {
  // RUC paraguayo: formato XXXXXXX-X (7 dígitos + guión + 1 dígito verificador)
  const rucPattern = /^\d{7}-\d$/
  return rucPattern.test(ruc.trim())
}

/**
 * Extrae RUC de un texto (básico, puede mejorarse con OCR)
 * 
 * @param text - Texto del cual extraer el RUC
 * @returns RUC encontrado o null
 */
export function extractRUCFromText(text: string): string | null {
  const rucPattern = /\d{7}-\d/g
  const matches = text.match(rucPattern)
  
  if (matches && matches.length > 0) {
    return matches[0]
  }
  
  return null
}