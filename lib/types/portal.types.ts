// lib/types/portal.types.ts
// Tipos TypeScript para el portal de autogestión

import type {
  FormDriver,
  FormDocumentStatus,
  DocumentType,
  OnboardingAttendeeStatus,
  OnboardingModality,
  FormDriverStatus,
  FormDocumentsStatus,
  OnboardingStatus,
} from '@prisma/client'

/**
 * Datos completos del portal para un postulante
 */
export interface PortalData {
  id: string
  fullName: string | null
  cedula: string
  phoneNumber: string
  email: string | null
  status: FormDriverStatus
  documentsStatus: FormDocumentsStatus
  onboardingStatus: OnboardingStatus | null

  personalData: PersonalDataSection
  documents: DocumentWithStatus[]
  nextSteps: NextStepsInfo
  assignedCapacitacion: AssignedCapacitacionInfo | null
  payment: PaymentInfo | null
}

/**
 * Información del pago inicial de equipamiento
 */
export interface PaymentInfo {
  id: string
  amount: number | null
  status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'PARTIAL'
  paymentMethod: string | null
  paymentDate: Date | null
  paymentProofUrl: string | null
  rejectionReason: string | null
  verifiedAt: Date | null
}

/**
 * Sección de datos personales editables
 */
export interface PersonalDataSection {
  // Datos básicos
  firstName: string | null
  lastName: string | null
  email: string | null
  birthDate: Date | null

  // Ubicación
  department: string | null
  city: string | null
  neighborhood: string | null
  address: string | null
  addressLat: number | null
  addressLng: number | null

  // Contacto de emergencia
  emergencyName: string | null
  emergencyRelationship: string | null
  emergencyPhone: string | null

  // Zona de trabajo y referencia
  workZone: string | null
  howHeardAboutUs: string | null
  referredBy: string | null

  // Vehículo
  hasVehicle: boolean
  vehicleBrand: string | null
  vehicleModel: string | null
  vehicleYear: number | null
  vehiclePlate: string | null

  // Información adicional
  experience: string | null
  availability: string[]
  whenCanStart: string | null

  // Servicios financieros
  hasUenoAccount: boolean
  uenoAccountNumber: string | null
  canInvoice: boolean
}

/**
 * Documento con información de estado y permisos
 */
export interface DocumentWithStatus {
  id: string
  documentType: DocumentType
  documentTypeName: string
  fileName: string
  blobUrl: string
  status: FormDocumentStatus
  rejectionReason: string | null
  uploadedAt: Date
  reviewedAt: Date | null
  reviewedBy: string | null
  canDelete: boolean
  canReplace: boolean
}

/**
 * Información sobre próximos pasos y permisos
 */
export interface NextStepsInfo {
  canUploadDocuments: boolean
  canSelectCapacitacion: boolean
  pendingActions: string[]
  progressPercentage: number
}

/**
 * Información de la capacitación asignada
 */
export interface AssignedCapacitacionInfo {
  id: string
  eventId: string
  /** Token público para gestionar la reserva via /api/public/booking/<token>/* */
  confirmationToken: string
  scheduledDate: Date
  startTime: string
  endTime: string
  location: string
  locationAddress: string
  meetingLink: string | null
  status: OnboardingAttendeeStatus
  canChange: boolean
  confirmedAt: Date | null
  /** Datos de la rule asociada (nuevo modelo de capacitaciones) */
  ruleSlug: string | null
  ruleTitle: string | null
  modality: OnboardingModality | null
  cancelDeadlineHours: number
  durationMinutes: number | null
}

/**
 * Evento de capacitación disponible para selección
 */
export interface AvailableCapacitacionEvent {
  id: string
  title: string
  scheduledDate: Date
  startTime: string
  endTime: string
  location: string
  locationAddress: string
  meetingLink: string | null
  availableSlots: number
  maxCapacity: number
  description: string | null
}

/**
 * DTO para actualizar datos personales
 */
export type UpdatePersonalDataDto = Partial<{
  firstName: string
  lastName: string
  email: string | null
  birthDate: Date | string | null
  department: string | null
  city: string | null
  neighborhood: string | null
  address: string | null
  addressLat: number | null
  addressLng: number | null
  emergencyName: string | null
  emergencyRelationship: string | null
  emergencyPhone: string | null
  workZone: string | null
  howHeardAboutUs: string | null
  referredBy: string | null
  hasVehicle: boolean
  vehicleBrand: string | null
  vehicleModel: string | null
  vehicleYear: number | null
  vehiclePlate: string | null
  experience: string | null
  availability: string[]
  whenCanStart: string | null
  hasUenoAccount: boolean
  uenoAccountNumber: string | null
  canInvoice: boolean
}>

/**
 * Response de generación de token
 */
export interface GenerateTokenResponse {
  success: boolean
  accessToken: string
  portalUrl: string
  message: string
}

/**
 * Tipos de documentos traducidos al español
 */
export const DOCUMENT_TYPE_NAMES: Record<DocumentType, string> = {
  CEDULA: 'Cédula',
  LICENSE_FRONT: 'Licencia de Conducir (Frente)',
  LICENSE_BACK: 'Licencia de Conducir (Dorso)',
  CRIMINAL_RECORD: 'Certificado de Antecedentes Penales',
  VEHICLE_REGISTRATION: 'Cédula del Vehículo',
  VEHICLE_PHOTO_FRONT: 'Foto del Vehículo (Frente)',
  VEHICLE_PHOTO_BACK: 'Foto del Vehículo (Atrás)',
  VEHICLE_PHOTO_SIDE: 'Foto del Vehículo (Lateral)',
  VEHICLE_INSURANCE: 'Seguro del Vehículo',
  SELFIE: 'Selfie',
  TAX_COMPLIANCE: 'Certificado Tributario',
  PAYMENT_PROOF: 'Comprobante de Pago',
  OTHER: 'Otro',
}

/**
 * Obtiene el nombre en español de un tipo de documento
 */
export function getDocumentTypeName(type: DocumentType): string {
  return DOCUMENT_TYPE_NAMES[type] || type
}
