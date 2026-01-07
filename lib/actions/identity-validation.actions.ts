// lib/actions/identity-validation.actions.ts
'use server';

import { auth } from '@clerk/nextjs/server';
import { paraguayIdentityValidator } from '@/lib/services/paraguay-identity-validator.service';

/**
 * Valida documentos de identidad paraguayos de un conductor específico
 * Uso: Desde botón manual en el admin
 */
export async function validateParaguayIdentityDocuments(formDriverId: string) {
  try {
    // Verificar autenticación
    const { userId } = await auth();
    if (!userId) {
      return {
        success: false,
        error: 'No autenticado'
      };
    }

    console.log(`🔐 Usuario ${userId} solicitó validación de identidad para driver ${formDriverId}`);

    // Ejecutar validación
    const result = await paraguayIdentityValidator.validateIdentityDocuments(formDriverId);

    return {
      success: true,
      data: result
    };

  } catch (error) {
    console.error('Error en validateParaguayIdentityDocuments:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Procesa batch de validaciones pendientes
 * Uso: Desde cron job o botón admin
 */
export async function processPendingIdentityValidations(limit: number = 5) {
  try {
    // Verificar autenticación
    const { userId } = await auth();
    if (!userId) {
      return {
        success: false,
        error: 'No autenticado'
      };
    }

    console.log(`🔐 Usuario ${userId} solicitó procesamiento batch (límite: ${limit})`);

    // Ejecutar batch
    const result = await paraguayIdentityValidator.processPendingValidationsBatch(limit);

    return {
      success: true,
      data: result
    };

  } catch (error) {
    console.error('Error en processPendingIdentityValidations:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}
