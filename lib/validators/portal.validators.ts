// lib/validators/portal.validators.ts
// Schemas de validación con Zod para el portal

import { z } from 'zod'
import { DocumentType } from '@prisma/client'

/**
 * Schema para actualizar datos personales
 * Todos los campos son opcionales
 */
export const UpdatePersonalDataSchema = z
  .object({
    firstName: z.string().min(2, 'Mínimo 2 caracteres').max(50).optional(),
    lastName: z.string().min(2, 'Mínimo 2 caracteres').max(50).optional(),
    email: z.string().email('Email inválido').optional().nullable(),
    birthDate: z.union([z.string(), z.date()]).optional().nullable(),
    department: z.string().max(100).optional().nullable(),
    city: z.string().max(100).optional().nullable(),
    neighborhood: z.string().max(100).optional().nullable(),
    address: z.string().max(200).optional().nullable(),
    addressLat: z.number().min(-90).max(90).optional().nullable(),
    addressLng: z.number().min(-180).max(180).optional().nullable(),
    emergencyName: z.string().max(100).optional().nullable(),
    emergencyRelationship: z.string().max(50).optional().nullable(),
    emergencyPhone: z.string().max(20).optional().nullable(),
    workZone: z.string().max(100).optional().nullable(),
    howHeardAboutUs: z.string().max(100).optional().nullable(),
    referredBy: z.string().max(100).optional().nullable(),
    hasVehicle: z.boolean().optional(),
    vehicleBrand: z.string().max(50).optional().nullable(),
    vehicleModel: z.string().max(50).optional().nullable(),
    vehicleYear: z.number().int().min(1900).max(2030).optional().nullable(),
    vehiclePlate: z.string().max(20).optional().nullable(),
    experience: z.string().max(500).optional().nullable(),
    availability: z.array(z.string()).optional(),
    whenCanStart: z.string().max(100).optional().nullable(),
    hasUenoAccount: z.boolean().optional(),
    uenoAccountNumber: z.string().max(50).optional().nullable(),
    canInvoice: z.boolean().optional(),
  })
  .strict() // No permitir campos extra

/**
 * Campos prohibidos de editar
 */
const FORBIDDEN_FIELDS = ['cedula', 'phoneNumber', 'accessToken', 'id', 'status', 'documentsStatus']

/**
 * Valida y sanitiza datos de actualización personal
 * Rechaza explícitamente campos prohibidos
 */
export function validatePersonalDataUpdate(data: any): z.infer<typeof UpdatePersonalDataSchema> {
  // Verificar que no incluya campos prohibidos
  for (const field of FORBIDDEN_FIELDS) {
    if (field in data) {
      throw new Error(`No se permite modificar el campo: ${field}`)
    }
  }

  // Validar con Zod
  return UpdatePersonalDataSchema.parse(data)
}

/**
 * Schema para upload de documento
 */
export const UploadDocumentSchema = z.object({
  documentType: z.nativeEnum(DocumentType),
})

/**
 * Schema para seleccionar capacitación
 */
export const SelectCapacitacionSchema = z.object({
  eventId: z.string().min(1, 'Event ID requerido'),
})

/**
 * Tipos de archivo permitidos para upload
 */
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/jpg',
  'application/pdf',
] as const

/**
 * Tamaño máximo de archivo (5MB)
 */
export const MAX_FILE_SIZE = 5 * 1024 * 1024

/**
 * Valida un archivo de documento
 */
export function validateDocumentFile(file: File): void {
  // Validar tipo de archivo
  if (!ALLOWED_MIME_TYPES.includes(file.type as any)) {
    throw new Error(
      'Tipo de archivo no permitido. Solo se aceptan imágenes JPG, PNG y archivos PDF'
    )
  }

  // Validar tamaño
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`El archivo excede el tamaño máximo de ${MAX_FILE_SIZE / 1024 / 1024}MB`)
  }

  // Validar extensión (doble check)
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (!extension || !['jpg', 'jpeg', 'png', 'pdf'].includes(extension)) {
    throw new Error('Extensión de archivo no válida')
  }

  // Validar que el nombre del archivo no esté vacío
  if (!file.name || file.name.trim() === '') {
    throw new Error('Nombre de archivo inválido')
  }
}

/**
 * Schema para generar token (admin only)
 */
export const GenerateTokenSchema = z.object({
  formDriverId: z.string().min(1, 'Form Driver ID requerido'),
  regenerate: z.boolean().optional().default(false),
})
